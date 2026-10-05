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

  /** 距离窗口重置还剩多少毫秒（用于提示"请 N 秒后再试"） */
  function retryAfterMs(key: string): number {
    const entry = hits.get(key)
    if (!entry) return 0
    return Math.max(0, entry.resetAt - Date.now())
  }

  /** 成功路径清零（如登录/注册成功后不再占用额度） */
  function clear(key: string): void {
    hits.delete(key)
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

  return { limited, retryAfterMs, clear }
}

/** 从请求中提取客户端 IP（Nginx 后面取 x-forwarded-for 首段） */
export function clientIp(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for")
  if (fwd) return fwd.split(",")[0].trim()
  return request.headers.get("x-real-ip") || "unknown"
}

/** 从 headers() 取客户端 IP（Server Action 内没有 Request 对象时用） */
export function clientIpFromHeaders(headers: Headers): string {
  const fwd = headers.get("x-forwarded-for")
  if (fwd) return fwd.split(",")[0].trim()
  return headers.get("x-real-ip") || "unknown"
}

/* ==========================================================================
   等待式限流（带冷却倒计时）——用于表单类提交入口
   --------------------------------------------------------------------------
   与上面的 createRateLimiter 的区别：这里所有提交**都**记入窗口（用于 UI 倒计时），
   但未超过免费额度 miniFree 时直接放行且不设冷却，达到额度后强制
   「两次提交间隔 ≥ minIntervalMs」；窗口内**静默超过 windowMs** 自动清零
   （即"冷却每 windowMs 刷新一次"）。
   典型用法（弹幕）：miniFree=3、minIntervalMs=3000、windowMs=5min
   → 前 3 条不限速，第 4 条起每条间隔 ≥3 秒，5 分钟不发言则重新从免费额度起算。
   ========================================================================== */

export interface WaitLimiterOptions {
  /** 连续发送多少条以内不做任何限制 */
  miniFree: number
  /** 达到免费额度后，两次提交之间的最小间隔（毫秒） */
  minIntervalMs: number
  /** 滚动窗口：窗口内无提交则计数与冷却一并清零（毫秒） */
  windowMs: number
}

export interface WaitLimiterResult {
  allowed: boolean
  /** 距离可以再次提交还剩多少毫秒（allowed 时为 0） */
  retryAfterMs: number
  /** 下次提交后是否进入限速状态（用于「即将限速」类温和提示，可不用） */
  willThrottleNext: boolean
  /** 窗口内已提交次数（含本次，若本次被记入） */
  hitsInWindow: number
}

export interface WaitLimiter {
  /** 判定并记入一次提交 */
  check(key: string): WaitLimiterResult
  /** 只读判定：不记入（用于预检） */
  peek(key: string): WaitLimiterResult
}

interface WaitBucket {
  /** 窗口内提交时间戳（毫秒） */
  times: number[]
}

export function createWaitLimiter(options: WaitLimiterOptions): WaitLimiter {
  const { miniFree, minIntervalMs, windowMs } = options
  const buckets = new Map<string, WaitBucket>()

  function evaluate(key: string, record: boolean): WaitLimiterResult {
    const now = Date.now()
    const cutoff = now - windowMs
    const bucket = buckets.get(key) ?? { times: [] }

    // 窗口外的记录出清：静默超过 windowMs 后计数与冷却一并刷新
    const times = bucket.times.filter((t) => t > cutoff)
    bucket.times = times

    const last = times.length ? times[times.length - 1] : 0
    const throttled = times.length >= miniFree
    const retryAfterMs = throttled ? Math.max(0, last + minIntervalMs - now) : 0
    const allowed = retryAfterMs === 0

    if (record && allowed) {
      times.push(now)
      bucket.times = times
    }

    if (times.length > 0 || record) {
      buckets.set(key, bucket)
    } else {
      // 无有效记录：清掉键，避免 Map 随访客数增长
      buckets.delete(key)
    }

    return {
      allowed,
      retryAfterMs,
      willThrottleNext: times.length + 1 >= miniFree,
      hitsInWindow: times.length,
    }
  }

  return {
    check: (key) => evaluate(key, true),
    peek: (key) => evaluate(key, false),
  }
}

/** 剩余冷却毫秒 → 面向用户的中文提示（向上取整到秒；无冷却时为 0 秒） */
export function describeRetryAfter(retryAfterMs: number): string {
  if (!(retryAfterMs > 0)) return "0 秒"
  const seconds = Math.ceil(retryAfterMs / 1000)
  return `${seconds} 秒`
}
