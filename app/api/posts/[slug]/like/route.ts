import { createRateLimiter } from "@/lib/rate-limit"
import { auth } from "@/auth"
import {
  likePost,
  visitorKeyFrom,
  hasLiked,
  getPostStats,
} from "@/lib/post-stats"

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  })
}

// 点赞限流：幂等接口（同访客同篇唯一）本身已防重复计数，这里只需
// 挡住极端连点（如脚本），给 0.75s 窗口即可，不影响正常 toggle 体验
const likeLimiter = createRateLimiter({ windowMs: 750, max: 1 })

/** 查询当前访客是否已赞 + 最新点赞数（页面加载时点亮图标） */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const decoded = decodeURIComponent(slug)
  const session = await auth()
  const visitorKey = visitorKeyFrom(request)
  const [liked, stats] = await Promise.all([
    hasLiked(decoded, visitorKey, session?.user?.id),
    getPostStats(decoded),
  ])
  return jsonResponse({ liked, likes: stats.likes })
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const decoded = decodeURIComponent(slug)
  const session = await auth()
  const visitorKey = visitorKeyFrom(request)

  if (likeLimiter.limited(visitorKey)) {
    return jsonResponse({ message: "操作太频繁，稍后再试" }, 429)
  }

  const result = await likePost(decoded, visitorKey, session?.user?.id)
  return jsonResponse(result)
}
