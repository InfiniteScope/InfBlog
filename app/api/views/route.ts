import { trackPageView, getViewStats } from "@/lib/views"

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  })
}

// ---- Simple in-memory rate limiter for the counting endpoint ----
// One POST per IP per 60s window. The whole app runs on a single Node
// process (standalone), so an in-memory map is sufficient. If the site
// scales to multiple instances, move this to Redis / Nginx.
const WINDOW_MS = 60 * 1000
const MAX_PER_WINDOW = 1
const hits = new Map<string, { count: number; resetAt: number }>()

function rateLimited(ip: string): boolean {
  const now = Date.now()
  const entry = hits.get(ip)
  if (!entry || now > entry.resetAt) {
    hits.set(ip, { count: 1, resetAt: now + WINDOW_MS })
    return false
  }
  if (entry.count >= MAX_PER_WINDOW) {
    return true
  }
  entry.count += 1
  return false
}

function clientIp(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for")
  if (fwd) return fwd.split(",")[0].trim()
  return request.headers.get("x-real-ip") || "unknown"
}

export async function GET() {
  const stats = await getViewStats()
  return jsonResponse(stats)
}

export async function POST(request: Request) {
  const ip = clientIp(request)
  if (rateLimited(ip)) {
    // Still return stats so the UI stays correct; just don't count.
    const stats = await getViewStats()
    return jsonResponse(stats, 202)
  }

  await trackPageView()
  const stats = await getViewStats()
  return jsonResponse(stats)
}
