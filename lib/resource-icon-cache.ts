import fs from "node:fs/promises"
import path from "node:path"
import crypto from "node:crypto"
import sharp from "sharp"

import {
  RESOURCE_ICONS_DIR,
  fetchLimited,
  looksLikeImage,
  sanitizeDomain,
  guessExt,
} from "./favicon"

/** 资源图标本地缓存：下载后统一缩放到 ≤400×400 存为 WebP。 */
const MAX_DIM = 400
const ICON_MAX_BYTES = 2 * 1024 * 1024
const FETCH_TIMEOUT_MS = 15_000

export function isExternalIconUrl(url: string): boolean {
  return /^https?:\/\//i.test(url)
}

/**
 * 缓存远程图标到服务器本机（≤400×400，WebP），返回本地 URL。
 * 任何失败均回退为原始 URL（保持外链可用，永不抛错）。
 */
export async function cacheResourceIcon(url: string): Promise<string> {
  if (!isExternalIconUrl(url)) return url

  const domain = sanitizeDomain(url)
  const hash = crypto.createHash("sha1").update(url).digest("hex").slice(0, 12)
  let filename = `${domain}-${hash}.webp`

  try {
    await fs.access(path.join(RESOURCE_ICONS_DIR, filename))
    return `/uploads/resource-icons/${filename}`
  } catch {
    // miss，继续下载
  }

  try {
    const buffer = await fetchLimited(
      url,
      ICON_MAX_BYTES,
      AbortSignal.timeout(FETCH_TIMEOUT_MS)
    )
    if (!looksLikeImage(buffer)) return url

    let output: Buffer
    try {
      output = await sharp(buffer, { animated: true })
        .rotate()
        .resize(MAX_DIM, MAX_DIM, {
          fit: "contain",
          withoutEnlargement: true,
        })
        .webp({ quality: 82 })
        .toBuffer()
    } catch {
      // sharp 不支持的格式（如 ICO）：原样保存
      output = buffer
      filename = `${domain}-${hash}.${guessExt(undefined, url)}`
    }

    await fs.mkdir(RESOURCE_ICONS_DIR, { recursive: true })
    await fs.writeFile(path.join(RESOURCE_ICONS_DIR, filename), output)
    return `/uploads/resource-icons/${filename}`
  } catch {
    return url
  }
}
