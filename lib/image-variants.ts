import fs from "node:fs"
import path from "node:path"

const UPLOADS_DIR = path.join(process.cwd(), "public", "uploads")

let variantFiles: Set<string> | null = null

function hasVariant(name: string) {
  if (!variantFiles) {
    try {
      variantFiles = new Set(fs.readdirSync(UPLOADS_DIR))
    } catch {
      variantFiles = new Set()
    }
  }
  return variantFiles.has(name)
}

/**
 * 封面图优先使用同名 `.webp` 变体（由 `scripts/optimize-covers.ts` 生成）。
 *
 * 为什么不在 frontmatter 里直接改路径：`content/` 以服务器版本为准，
 * 本地改写会被部署规则挡住；改由渲染层做映射，脚本跑没跑过都能正常工作
 * （找不到 `.webp` 就原样返回，不会 404）。
 *
 * 目录清单按进程缓存；新增变体后需重启进程（部署本身就会重启）。
 */
export function preferImageVariant(src: string): string {
  if (!src.startsWith("/uploads/")) return src
  const match = /^\/uploads\/(.+?)\.(png|jpe?g)$/i.exec(src)
  if (!match) return src
  const base = match[1]
  return hasVariant(`${base}.webp`) ? `/uploads/${base}.webp` : src
}
