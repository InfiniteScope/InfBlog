/**
 * glance-of-tech 快报服务的数据层。
 * 服务端 fetch（revalidate 5min）；服务不可用时返回 null，
 * 页面据此渲染友好空态，而不是把 500 抛给用户。
 */

export interface DigestItem {
  source: string
  title: string
  url: string
  imageUrl: string | null
  summary: string | null
  tags: string[]
  publishedAt: string | null
}

export interface Digest {
  date: string
  period: "morning" | "evening"
  title: string
  summary: string | null
  degraded: boolean
  generatedAt: string
  items: DigestItem[]
}

export interface DigestSummary {
  date: string
  period: "morning" | "evening"
  title: string
  generatedAt: string
}

interface DigestListResponse {
  content: DigestSummary[]
  totalElements: number
  totalPages: number
}

const API_BASE = (
  process.env.GLANCE_API_BASE || "http://127.0.0.1:8081/api/digest"
).replace(/\/+$/, "")

async function fetchJson<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      next: { revalidate: 300 },
      // 注意：AbortSignal 必须每次新建，模块级共享的 timeout signal
      // 会在 8s 后永久处于 aborted 态，拖垮所有后续请求
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return null
    return (await res.json()) as T
  } catch {
    return null
  }
}

export function getLatestDigest(): Promise<Digest | null> {
  return fetchJson<Digest>("/latest")
}

export function getDigestList(size = 30): Promise<DigestSummary[]> {
  return fetchJson<DigestListResponse>(`/list?size=${size}`).then(
    (data) => data?.content ?? []
  )
}

export function getDigest(
  date: string,
  period: string
): Promise<Digest | null> {
  return fetchJson<Digest>(`/${date}/${period}`)
}
