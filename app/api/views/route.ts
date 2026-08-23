import { trackPageView, getViewStats } from "@/lib/views"
import { clientIp, createRateLimiter } from "@/lib/rate-limit"

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  })
}

// ---- Shared in-memory rate limiter ----
// One POST per IP per 60s window. The whole app runs on a single Node
// process (standalone), so an in-memory map is sufficient. If the site
// scales to multiple instances, move this to Redis / Nginx.
const viewsLimiter = createRateLimiter({ windowMs: 60_000, max: 1 })

export async function GET() {
  const stats = await getViewStats()
  return jsonResponse(stats)
}

export async function POST(request: Request) {
  const ip = clientIp(request)
  if (viewsLimiter.limited(ip)) {
    // Still return stats so the UI stays correct; just don't count.
    const stats = await getViewStats()
    return jsonResponse(stats, 202)
  }

  await trackPageView()
  const stats = await getViewStats()
  return jsonResponse(stats)
}
