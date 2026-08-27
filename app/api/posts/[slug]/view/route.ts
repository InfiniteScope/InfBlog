import { createRateLimiter, clientIp } from "@/lib/rate-limit"
import { trackPostView, getPostStats } from "@/lib/post-stats"

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  })
}

// 每 IP 每 60s 一次有效浏览计数（防刷新刷量）
const viewLimiter = createRateLimiter({ windowMs: 60_000, max: 1 })

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const decoded = decodeURIComponent(slug)
  const stats = await getPostStats(decoded)
  return jsonResponse(stats)
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const decoded = decodeURIComponent(slug)
  const ip = clientIp(request)

  // 每 IP 每篇 60s 一次（防刷）——IP+slug 组合，避免同 IP 访问不同文章时被误吞
  if (viewLimiter.limited(`${ip}:${decoded}`)) {
    const stats = await getPostStats(decoded)
    return jsonResponse(stats, 202)
  }

  const stats = await trackPostView(decoded)
  return jsonResponse(stats)
}
