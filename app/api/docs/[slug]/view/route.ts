import { createRateLimiter, clientIp } from "@/lib/rate-limit"
import { trackPostView, getPostStats } from "@/lib/post-stats"

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  })
}

/**
 * 文库档案阅读量。与文章共用同一套统计与限流预算（`statsType = "doc"`，
 * 即 `post_stats.type = 'doc'`），但**限流键与文章分开计数**，
 * 避免同一 IP 刚看完文章再看档案时被误吞。
 */
const viewLimiter = createRateLimiter({ windowMs: 10_000, max: 1 })

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const decoded = decodeURIComponent(slug)
  const stats = await getPostStats(decoded, "doc")
  return jsonResponse(stats)
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const decoded = decodeURIComponent(slug)
  const ip = clientIp(request)

  // 每 IP 每档案 10s 一次（防刷）——IP+slug 组合，避免同 IP 访问不同档案被误吞
  if (viewLimiter.limited(`doc:${ip}:${decoded}`)) {
    const stats = await getPostStats(decoded, "doc")
    return jsonResponse(stats, 202)
  }

  const stats = await trackPostView(decoded, "doc")
  return jsonResponse(stats)
}
