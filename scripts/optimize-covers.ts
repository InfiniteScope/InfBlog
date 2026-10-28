/**
 * 封面图优化：把 content 里 frontmatter 引用的本地上传封面（/uploads/*.png|jpg）
 * 转成同名 .webp（新的文件名，规避 /uploads 30 天缓存），原图保留。
 *
 * 选码策略（按实测）：
 *   - 先试**无损** WebP：扁平图/线稿通常比 PNG 小 40%~75%，像素完全一致
 *   - 无损结果 ≤ 180KB（或比有损还小）→ 用无损
 *   - 否则用有损 q84 + 最长边 ≤1600（照片类，视觉几乎无差）
 *   - 如果结果比原图还大，跳过（保持原图）
 *
 * 用法：
 *   pnpm tsx scripts/optimize-covers.ts            # 预览（默认不写文件）
 *   pnpm tsx scripts/optimize-covers.ts --write    # 真正生成 .webp
 *   pnpm tsx scripts/optimize-covers.ts --write --force   # 覆盖已有 .webp
 *
 * 生成的 .webp 由 lib/image-variants.ts 在渲染时自动优先使用，
 * 不需要改任何文章 frontmatter。
 */

import fs from "node:fs"
import fsp from "node:fs/promises"
import path from "node:path"
import matter from "gray-matter"
import sharp from "sharp"

const ROOT = process.cwd()
const CONTENT_DIRS = ["content/posts", "content/docs"]
const PUBLIC_DIR = path.join(ROOT, "public")
const MAX_WIDTH = 1600
const LOSSY_QUALITY = 84
const LOSSLESS_MAX_BYTES = 180 * 1024

const args = new Set(process.argv.slice(2))
const WRITE = args.has("--write")
const FORCE = args.has("--force")

interface Report {
  src: string
  originalBytes: number
  webpBytes: number
  mode: "lossless" | "lossy" | "skipped"
  reason?: string
}

function kb(bytes: number) {
  return `${(bytes / 1024).toFixed(1)} KB`
}

async function collectCovers(): Promise<string[]> {
  const covers = new Set<string>()
  for (const dir of CONTENT_DIRS) {
    const abs = path.join(ROOT, dir)
    if (!fs.existsSync(abs)) continue
    for (const file of await fsp.readdir(abs)) {
      if (!file.endsWith(".mdx")) continue
      const raw = await fsp.readFile(path.join(abs, file), "utf-8")
      const { data } = matter(raw)
      const cover = typeof data.coverImage === "string" ? data.coverImage.trim() : ""
      if (cover.startsWith("/uploads/")) covers.add(cover)
    }
  }
  return [...covers].sort()
}

function localPathFor(urlPath: string) {
  return path.join(PUBLIC_DIR, decodeURIComponent(urlPath).replace(/^\//, ""))
}

async function optimiseOne(urlPath: string): Promise<Report> {
  const originalPath = localPathFor(urlPath)
  const originalBytes = (await fsp.stat(originalPath)).size

  const ext = path.extname(originalPath).toLowerCase()
  if (![".png", ".jpg", ".jpeg"].includes(ext)) {
    return { src: urlPath, originalBytes, webpBytes: originalBytes, mode: "skipped", reason: "已是 webp/svg" }
  }

  const outPath = originalPath.replace(/\.(png|jpe?g)$/i, ".webp")
  if (!FORCE && fs.existsSync(outPath)) {
    const webpBytes = (await fsp.stat(outPath)).size
    return { src: urlPath, originalBytes, webpBytes, mode: "skipped", reason: "已存在 .webp" }
  }

  const image = sharp(originalPath, { failOn: "none" }).rotate()
  const lossless = await image.clone().webp({ lossless: true, effort: 6 }).toBuffer()
  const lossy = await image
    .clone()
    .resize({ width: MAX_WIDTH, withoutEnlargement: true })
    .webp({ quality: LOSSY_QUALITY, effort: 6 })
    .toBuffer()

  const useLossless = lossless.length <= LOSSLESS_MAX_BYTES || lossless.length <= lossy.length
  const chosen = useLossless ? lossless : lossy

  if (chosen.length >= originalBytes * 0.9) {
    return { src: urlPath, originalBytes, webpBytes: originalBytes, mode: "skipped", reason: "收益不足 10%" }
  }

  if (WRITE) await fsp.writeFile(outPath, chosen)
  return {
    src: urlPath,
    originalBytes,
    webpBytes: chosen.length,
    mode: useLossless ? "lossless" : "lossy",
  }
}

async function main() {
  const covers = await collectCovers()
  console.log(`扫描到 ${covers.length} 张本地封面${WRITE ? "" : "（预览模式，不会写文件）"}\n`)

  const reports: Report[] = []
  for (const cover of covers) {
    try {
      reports.push(await optimiseOne(cover))
    } catch (error) {
      reports.push({
        src: cover,
        originalBytes: 0,
        webpBytes: 0,
        mode: "skipped",
        reason: error instanceof Error ? error.message : String(error),
      })
    }
  }

  let before = 0
  let after = 0
  for (const r of reports) {
    before += r.originalBytes
    after += r.webpBytes
    const saved = r.originalBytes > 0 ? 100 - (r.webpBytes / r.originalBytes) * 100 : 0
    const label = r.mode === "skipped" ? `skip (${r.reason})` : r.mode
    console.log(
      `${kb(r.originalBytes).padStart(9)} → ${kb(r.webpBytes).padStart(9)}  ${saved.toFixed(0).padStart(4)}%  ${label.padEnd(18)} ${path.basename(r.src)}`,
    )
  }
  console.log(
    `\n合计 ${kb(before)} → ${kb(after)}（省 ${kb(before - after)}，${before > 0 ? (100 - (after / before) * 100).toFixed(0) : 0}%）`,
  )
  if (!WRITE) console.log("确认无误后加 --write 生成文件。")
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
