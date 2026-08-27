import { auth } from "@/auth"
import { createRateLimiter, clientIp } from "@/lib/rate-limit"
import { toggleFavorite, hasFavorited } from "@/lib/post-stats"

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  })
}

const favLimiter = createRateLimiter({ windowMs: 10_000, max: 5 })

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await auth()
  // 未登录：不粗暴跳转，由前端展示提示文案
  if (!session?.user) {
    return jsonResponse({ message: "请先登录，登陆后方可使用收藏", favorited: false }, 401)
  }

  const { slug } = await params
  const decoded = decodeURIComponent(slug)
  const ip = clientIp(request)

  if (favLimiter.limited(`${ip}-${session.user.id}`)) {
    return jsonResponse({ message: "操作太频繁，稍后再试" }, 429)
  }

  const result = await toggleFavorite(decoded, session.user.id)
  return jsonResponse(result)
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return jsonResponse({ favorited: false }, 200)
  }
  const { slug } = await params
  const favorited = await hasFavorited(decodeURIComponent(slug), session.user.id)
  return jsonResponse({ favorited })
}
