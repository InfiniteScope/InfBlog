/**
 * 轻量内存 IP 限流（单机 standalone 适用）。
 * 
 * 多个 API 端点共用同一个按键空间（按 方法+路径+IP 分组）？不需要：
 * 每个端点独立实例化一个限流器即可，避免互相干扰。
 */
interface RateLimitEntry {
  count: number
  resetAt: number
}

export interface RateLimitOptions {
  /** 窗口时长（毫秒） */
  windowMs: number
  /** 窗口内最大次数 */
  max: number
}

export function createRateLimiter(options: RateLimitOptions) {
  const hits = new Map<string, RateLimitEntry>()

  function limited(key: string): boolean {
    const now = Date.now()
    const entry = hits.get(key)
    if (!entry || now > entry.resetAt) {
      hits.set(key, { count: 1, resetAt: now + options.windowMs })
      return false
    }
    if (entry.count >= options.max) {
      return true
    }
    entry.count += 1
    return false
  }

  // 防止 Map 无限膨胀：每个窗口周期清一次过期条目
  const cleanup = setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of hits) {
      if (now > entry.resetAt) hits.delete(key)
    }
  }, options.windowMs)
  // 不阻止进程退出（Node standalone 会随进程终结）
  cleanup.unref?.()

  return { limited }
}

/** 从请求中提取客户端 IP（Nginx 后面取 x-forwarded-for 首段） */
export function clientIp(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for")
  if (fwd) return fwd.split(",")[0].trim()
  return request.headers.get("x-real-ip") || "unknown"
}
