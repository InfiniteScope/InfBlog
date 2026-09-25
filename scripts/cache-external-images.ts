/**
 * 外链图片本地化：扫描 MDX 中的外链图片 → 下载 → sharp 转 WebP（q80，宽 ≤1600）
 * → 存 public/uploads/docs/<url sha1 前 10 位>.webp → 原地改写 MDX 链接。
 *
 * 用法：
 *   pnpm tsx scripts/cache-external-images.ts                       # 扫描 content/docs 全部
 *   pnpm tsx scripts/cache-external-images.ts content/posts/a.mdx   # 指定文件
 *
 * 特性：按 URL 哈希命名（幂等/跨档案去重）；动图转动画 WebP；
 * 输出目录 /uploads/docs/ 由 nginx alias 直服（零配置）。
 */

import fs from "node:fs/promises"
import path from "node:path"
import crypto from "node:crypto"

import sharp from "sharp"

const ROOT = process.cwd()
const OUT_DIR = path.join(ROOT, "public", "uploads", "docs")
const MAX_WIDTH = 1600
const WEBP_QUALITY = 80

const MARKDOWN_IMAGE_RE = /!\[([^\]]*)\]\((https?:\/\/[^)\s]+)\)/g

interface Stats {
  scanned: number
  cached: number
  reused: number
  failed: number
  originalBytes: number
  webpBytes: number
}

async function collectMdxFiles(args: string[]): Promise<string[]> {
  if (args.length > 0) {
    return args.map((a) => path.resolve(ROOT, a))
  }
  const docsDir = path.join(ROOT, "content", "docs")
  const files = await fs.readdir(docsDir).catch(() => [] as string[])
  return files
    .filter((f) => f.endsWith(".mdx"))
    .map((f) => path.join(docsDir, f))
}

function hashedName(url: string): string {
  const hash = crypto.createHash("sha1").update(url).digest("hex").slice(0, 10)
  return `${hash}.webp`
}

async function download(url: string, retries = 2): Promise<Buffer> {
  let lastError: unknown
  for (let attempt = 1; attempt <= retries + 1; attempt++) {
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
          Referer: "https://www.yuque.com/",
        },
        signal: AbortSignal.timeout(30_000),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return Buffer.from(await res.arrayBuffer())
    } catch (error) {
      lastError = error
      if (attempt <= retries) {
        await new Promise((r) => setTimeout(r, 1000 * attempt))
      }
    }
  }
  throw lastError
}

async function toWebp(input: Buffer): Promise<Buffer> {
  return sharp(input, { animated: true })
    .resize({ width: MAX_WIDTH, withoutEnlargement: true })
    .webp({ quality: WEBP_QUALITY })
    .toBuffer()
}

async function processFile(filePath: string, stats: Stats): Promise<void> {
  const source = await fs.readFile(filePath, "utf-8")
  const urls = new Map<string, string>() // url -> local path

  for (const match of source.matchAll(MARKDOWN_IMAGE_RE)) {
    const url = match[2]
    if (!urls.has(url)) urls.set(url, "")
  }

  if (urls.size === 0) {
    console.log(`· ${path.relative(ROOT, filePath)}：无外链图片`)
    return
  }
  console.log(`· ${path.relative(ROOT, filePath)}：发现 ${urls.size} 张外链图片`)
  stats.scanned += urls.size

  await fs.mkdir(OUT_DIR, { recursive: true })

  for (const [url] of urls) {
    const name = hashedName(url)
    const localPath = path.join(OUT_DIR, name)
    const publicPath = `/uploads/docs/${name}`
    try {
      const exists = await fs
        .stat(localPath)
        .then((s) => s.size > 0)
        .catch(() => false)
      if (exists) {
        urls.set(url, publicPath)
        stats.reused++
        console.log(`  ↺ 复用 ${name}`)
        continue
      }
      const original = await download(url)
      const webp = await toWebp(original)
      await fs.writeFile(localPath, webp)
      urls.set(url, publicPath)
      stats.cached++
      stats.originalBytes += original.length
      stats.webpBytes += webp.length
      console.log(
        `  ✓ ${name} ${(original.length / 1024).toFixed(0)}KB → ${(webp.length / 1024).toFixed(0)}KB`
      )
    } catch (error) {
      stats.failed++
      console.warn(`  ✗ 失败（保留外链）：${url.slice(0, 90)} — ${String(error)}`)
    }
  }

  let rewritten = source
  for (const [url, publicPath] of urls) {
    if (!publicPath) continue
    rewritten = rewritten.split(url).join(publicPath)
  }
  if (rewritten !== source) {
    await fs.writeFile(filePath, rewritten, "utf-8")
    console.log(`  → 已改写 ${path.relative(ROOT, filePath)}`)
  }
}

async function main() {
  const args = process.argv.slice(2)
  const files = await collectMdxFiles(args)
  if (files.length === 0) {
    console.log("没有可扫描的 MDX 文件")
    return
  }

  const stats: Stats = {
    scanned: 0,
    cached: 0,
    reused: 0,
    failed: 0,
    originalBytes: 0,
    webpBytes: 0,
  }

  for (const file of files) {
    await processFile(file, stats)
  }

  console.log("\n===== 汇总 =====")
  console.log(`外链图片 ${stats.scanned} 张：新缓存 ${stats.cached}，复用 ${stats.reused}，失败 ${stats.failed}`)
  if (stats.cached > 0) {
    const saved = 100 - (stats.webpBytes / stats.originalBytes) * 100
    console.log(
      `体积：${(stats.originalBytes / 1024 / 1024).toFixed(2)}MB → ${(stats.webpBytes / 1024 / 1024).toFixed(2)}MB（省 ${saved.toFixed(0)}%）`
    )
  }

  // 防回归：全库残留外链检查
  const all = await collectMdxFiles([])
  let remaining = 0
  for (const f of all) {
    const content = await fs.readFile(f, "utf-8")
    remaining += [...content.matchAll(MARKDOWN_IMAGE_RE)].length
  }
  console.log(`全文库剩余外链图片：${remaining} 张${remaining > 0 ? "（可重跑本脚本）" : ""}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
