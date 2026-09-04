import { fetchLimited, resolveFaviconUrl } from "./favicon"

const HTML_SNIFF_BYTES = 256 * 1024

export interface SiteMeta {
  icon?: string
  title?: string
  description?: string
}

function extractByAttrs(html: string, key: "property" | "name", value: string): string | null {
  const re = new RegExp(
    `<meta[^>]+${key}=["']${value}["'][^>]*content=["']([^"']+)["'][^>]*>`,
    "i"
  )
  const m = html.match(re)
  if (m?.[1]) return m[1].trim()
  const re2 = new RegExp(
    `<meta[^>]+content=["']([^"']+)["'][^>]*${key}=["']${value}["'][^>]*>`,
    "i"
  )
  const m2 = html.match(re2)
  return m2?.[1]?.trim() ?? null
}

/** 抓取官网链接的图标 + 标题 + 简介（任一项失败都不影响其它项） */
export async function fetchSiteMeta(input: string): Promise<SiteMeta> {
  const baseUrl = input.startsWith("http") ? input : `https://${input}`
  const meta: SiteMeta = {}

  try {
    const html = (await fetchLimited(baseUrl, HTML_SNIFF_BYTES)).toString("utf-8")
    const title =
      extractByAttrs(html, "property", "og:title") ||
      html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() ||
      undefined
    const description =
      extractByAttrs(html, "property", "og:description") ||
      extractByAttrs(html, "name", "description") ||
      undefined
    if (title) meta.title = title
    if (description) meta.description = description
  } catch {
    // 页面不可达时跳过文本抓取
  }

  try {
    meta.icon = await resolveFaviconUrl(baseUrl)
  } catch {
    // icon 抓取失败跳过
  }

  return meta
}
