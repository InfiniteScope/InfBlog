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

export function sanitizeDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "")
  } catch {
    return "website"
  }
}

async function readBodyLimited(res: Response, maxBytes: number): Promise<Buffer> {  const reader = res.body?.getReader()
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

/**
 * SSRF 防护：拒绝内网 / 回环 / 链路本地 / 云元数据网段的 IP。
 * 直接判断 hostname 为 IP 时立即拦截；域名则以解析结果为据，
 * 任何一次解析命中私有段即拒绝（防 DNS rebinding 双解析差异）。
 */
function isPrivateIp(ip: string): boolean {
  // IPv6：回环 / 未指定 / 链路本地 / ULA / IPv4 映射 / NAT64 一律视为私有
  if (ip.includes(":")) {
    const low = ip.toLowerCase()
    const mapped = low.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)
    if (mapped) return isPrivateIp(mapped[1])
    return (
      low.startsWith("::") ||
      low.startsWith("fe8") ||
      low.startsWith("fe9") ||
      low.startsWith("fea") ||
      low.startsWith("feb") ||
      low.startsWith("fc") ||
      low.startsWith("fd") ||
      low.startsWith("64:ff9")
    )
  }

  const parts = ip.split(".").map(Number)
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n) || n < 0 || n > 255)) {
    return true // 解析不出合法 IPv4 一律拒绝
  }
  const [a, b] = parts
  return (
    a === 0 || // 0.0.0.0/8
    a === 10 || // 10.0.0.0/8
    a === 127 || // 127.0.0.0/8
    a === 169 && b === 254 || // 169.254.0.0/16 (AWS/GCP metadata)
    a === 172 && b >= 16 && b <= 31 || // 172.16.0.0/12
    a === 192 && b === 168 || // 192.168.0.0/16
    a === 100 && b >= 64 && b <= 127 || // 100.64.0.0/10 CGNAT
    a === 198 && b === 18 || // 198.18.0.0/15 benchmarking
    a === 224 || // 224.0.0.0/4 multicast
    a >= 240 // 240.0.0.0/4 reserved
  )
}

/** 校验 URL 的主机名与解析结果不落在内网/回环段；不合法抛错 */
async function assertUrlSafe(input: string): Promise<void> {
  let url: URL
  try {
    url = new URL(input)
  } catch {
    throw new Error("URL 无效")
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("仅支持 http/https")
  }

  const hostname = url.hostname

  // 直接是 IP 字面量：同步检查
  if (/^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
    if (isPrivateIp(hostname)) throw new Error("内网地址被禁止")
    return
  }
  // IPv6 / localhost 等一律禁止（云环境元数据走 169.254，但留白即拒绝）
  if (hostname === "localhost" || hostname.endsWith(".local")) {
    throw new Error("内网地址被禁止")
  }

  // 域名：解析并逐一校验；至少一个结果安全才放行
  const dns = await import("node:dns/promises")
  let addrs: { address: string }[]
  try {
    addrs = await dns.lookup(hostname, { all: true })
  } catch {
    throw new Error("域名解析失败")
  }
  for (const a of addrs) {
    if (isPrivateIp(a.address)) throw new Error("域名解析到内网地址，已拦截")
  }
  if (addrs.length === 0) throw new Error("域名无解析结果")
}

export async function fetchLimited(
  url: string,
  maxBytes: number,
  signal?: AbortSignal
): Promise<Buffer> {
  // SSRF 防线：任何请求、任何跳转前都必须过安全校验
  const target = new URL(url)
  await assertUrlSafe(url)

  // 手动跟随 redirect，每次跳转重新校验（不信任 Location 目标解绑后仍安全）
  let current = target
  for (let hop = 0; hop < 5; hop++) {
    const res = await fetch(current, {
      redirect: "manual",
      signal,
      headers: {
        "User-Agent": UA,
        Accept: "image/*,text/html,*/*;q=0.1",
      },
    })

    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get("location")
      res.body?.cancel()
      if (!loc) throw new Error(`重定向无 Location (${res.status})`)
      current = new URL(loc, current)
      await assertUrlSafe(current.toString())
      continue
    }

    if (!res.ok) throw new Error(`HTTP ${res.status} for ${current}`)
    return readBodyLimited(res, maxBytes)
  }
  throw new Error("重定向次数过多")
}

export function looksLikeImage(buffer: Buffer): boolean {
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

export function guessExt(contentType: string | undefined, url: string): string {
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
