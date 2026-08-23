import fs from "node:fs/promises"
import path from "node:path"
import crypto from "node:crypto"

const iconHrefRegex =
  /<link[^>]+rel=["'][^"']*(?:icon|apple-touch-icon|shortcut icon)[^"']*["'][^>]*>/gi

/** Only need the `<head>` for icon link discovery. */
const HTML_SNIFF_BYTES = 256 * 1024
/** Only need the first bytes to verify an image response. */
const IMAGE_SNIFF_BYTES = 1024

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36"

export const RESOURCE_ICONS_DIR = path.join(
  process.cwd(),
  "public",
  "uploads",
  "resource-icons"
)

function extractIconHref(html: string): string | null {
  const matches = html.match(iconHrefRegex)
  if (!matches || matches.length === 0) return null

  for (const tag of matches) {
    const hrefMatch = tag.match(/(?:href|content)=["']([^"']+)["']/i)
    if (hrefMatch?.[1]) return hrefMatch[1]
  }
  return null
}

function resolveAsAbsolute(base: string, href: string): string {
  try {
    return new URL(href, base).toString()
  } catch {
    return href
  }
}

function sanitizeDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "")
  } catch {
    return "website"
  }
}

async function readBodyLimited(res: Response, maxBytes: number): Promise<Buffer> {
  const reader = res.body?.getReader()
  if (!reader) return Buffer.from(await res.arrayBuffer())
  const chunks: Uint8Array[] = []
  let total = 0
  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done || !value) break
      chunks.push(value)
      total += value.byteLength
      if (total >= maxBytes) break
    }
  } finally {
    reader.releaseLock()
  }
  return Buffer.concat(chunks)
}

async function fetchLimited(url: string, maxBytes: number): Promise<Buffer> {
  const res = await fetch(url, {
    redirect: "follow",
    headers: {
      "User-Agent": UA,
      Accept: "image/*,text/html,*/*;q=0.1",
    },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`)
  return readBodyLimited(res, maxBytes)
}

function looksLikeImage(buffer: Buffer): boolean {
  if (buffer.length < 4) return false
  // ICO
  if (buffer[0] === 0x00 && buffer[1] === 0x00 && buffer[2] === 0x01 && buffer[3] === 0x00)
    return true
  // PNG
  if (
    buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47
  )
    return true
  // JPEG
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return true
  // WebP / GIF / SVG (text)
  if (buffer.subarray(0, 4).toString("ascii") === "RIFF") return true
  const head = buffer.subarray(0, 32).toString("utf-8").toLowerCase()
  if (head.includes("<svg") || head.includes("<?xml")) return true
  return false
}

/** Verify that a URL responds with an actual image using only head bytes. */
async function isImageUrl(url: string): Promise<boolean> {
  try {
    const buffer = await fetchLimited(url, IMAGE_SNIFF_BYTES)
    const contentType =
      buffer.subarray(0, 8).toString("utf-8") || ""
    if (contentType.includes("<html")) return false
    return looksLikeImage(buffer)
  } catch {
    return false
  }
}

/**
 * Resolve a website's icon as an EXTERNAL absolute URL (no download, no
 * server storage). Parses the homepage <link rel="icon"> first, then falls
 * back to conventional /favicon.ico & /favicon.png.
 * Third-party CDN links (e.g. https://www.7-zip.org/7ziplogo.png) are
 * returned verbatim so the website itself serves the bytes.
 */
export async function resolveFaviconUrl(input: string): Promise<string> {
  const baseUrl = input.startsWith("http") ? input : `https://${input}`
  const origin = new URL(baseUrl).origin

  // 1) Parse the homepage for a declared icon link.
  try {
    const htmlBuffer = await fetchLimited(baseUrl, HTML_SNIFF_BYTES)
    const href = extractIconHref(htmlBuffer.toString("utf-8"))
    if (href) {
      const absolute = resolveAsAbsolute(baseUrl, href)
      if (await isImageUrl(absolute)) return absolute
    }
  } catch {
    // homepage unreachable; try conventional paths below
  }

  // 2) Conventional fallbacks.
  for (const p of ["/favicon.ico", "/favicon.png"]) {
    const url = `${origin}${p}`
    if (await isImageUrl(url)) return url
  }

  throw new Error("未能找到该网站可访问的图标外链")
}

function guessExt(contentType: string | undefined, url: string): string {
  if (contentType?.includes("png")) return "png"
  if (contentType?.includes("svg")) return "svg"
  if (contentType?.includes("jpeg") || contentType?.includes("jpg")) return "jpg"
  if (contentType?.includes("webp")) return "webp"
  const u = url.toLowerCase()
  if (u.includes(".png")) return "png"
  if (u.includes(".svg")) return "svg"
  if (u.endsWith(".ico") || !contentType) return "ico"
  return "png"
}

/**
 * Fetch a website's favicon, persist a copy locally, and return its public
 * URL. Used by the CLI with `--save`; the in-browser form uses
 * `resolveFaviconUrl` to avoid storing files on the server.
 */
export async function fetchAndSaveFavicon(input: string): Promise<string> {
  const baseUrl = input.startsWith("http") ? input : `https://${input}`
  const domain = sanitizeDomain(baseUrl)

  await fs.mkdir(RESOURCE_ICONS_DIR, { recursive: true })

  const candidates: string[] = []
  try {
    const page = await fetchLimited(baseUrl, HTML_SNIFF_BYTES)
    const href = extractIconHref(page.toString("utf-8"))
    if (href) candidates.push(resolveAsAbsolute(baseUrl, href))
  } catch {
    // homepage not reachable; fall back to conventional paths
  }

  const origin = new URL(baseUrl).origin
  candidates.push(`${origin}/favicon.ico`, `${origin}/favicon.png`)

  for (const candidate of candidates) {
    if (!candidate) continue
    try {
      const buffer = await fetchLimited(candidate, 2 * 1024 * 1024)
      if (!looksLikeImage(buffer)) continue

      const ext = guessExt(undefined, candidate)
      const hash = crypto.createHash("md5").update(buffer).digest("hex").slice(0, 8)
      const filename = `${domain}-${hash}.${ext}`
      const filePath = path.join(RESOURCE_ICONS_DIR, filename)
      await fs.writeFile(filePath, buffer)

      return `/uploads/resource-icons/${filename}`
    } catch {
      continue
    }
  }

  throw new Error("未能从该网站抓取到图标")
}
