import { prisma } from "@/lib/prisma"

/**
 * 访问来源统计（应用内，不依赖 nginx 日志）。
 *
 * 口径说明（重要）：
 * - `ViewsTracker` 在每个标签页**首次**加载时上报一次（sessionStorage 去重），
 *   所以这里的每一条 = 一次“进入站点的访问”，不是每次站内点击。
 * - 只统计真实浏览器：服务端用 UA 过滤常见爬虫/无头浏览器。
 * - 来源取 `document.referrer` 的 host；空 → `(direct)`；本站 → `(internal)`。
 * - 注意：很多外链带 `rel="noopener noreferrer"` 或来自 App 内置浏览器，
 *   Referer 会被抹掉，因此会被算作 direct（这会让“来源”统计偏低）。
 */

export const DIRECT_SOURCE = "(direct)"
export const INTERNAL_SOURCE = "(internal)"

const OWN_HOSTS = ["infinitescope.site", "localhost", "127.0.0.1"]

/** 常见爬虫 / 无头浏览器 / 抓取器 UA */
const BOT_RE =
  /bot|crawl|spider|headless|facebookexternalhit|go-http-client|curl|python|scanner|wget|slurp|preview|monitor|uptime|pingdom|semrush|ahrefs|mj12|dotbot|bytespider/i

/** 固定按北京时间取日期（避免服务器时区变化影响分日） */
export function shanghaiDate(date: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date)
}

export function isBotUserAgent(ua: string | null | undefined): boolean {
  if (!ua) return true
  return BOT_RE.test(ua)
}

/** 把 Referer 归类为：(direct) / (internal) / 域名（去掉 www） */
export function classifyReferrer(referrer: string | null | undefined): string {
  if (!referrer) return DIRECT_SOURCE
  try {
    const host = new URL(referrer).hostname.toLowerCase().replace(/^www\./, "")
    if (!host) return DIRECT_SOURCE
    if (OWN_HOSTS.some((own) => host === own || host.endsWith(`.${own}`))) {
      return INTERNAL_SOURCE
    }
    return host
  } catch {
    return DIRECT_SOURCE
  }
}

export async function trackReferralVisit(input: {
  path?: string | null
  referrer?: string | null
  userAgent?: string | null
}): Promise<void> {
  try {
    if (isBotUserAgent(input.userAgent)) return

    const path = (input.path ?? "/").split("?")[0] || "/"
    if (!path.startsWith("/")) return

    const referrer = input.referrer ? input.referrer.slice(0, 500) : null
    const source = classifyReferrer(referrer)

    await prisma.referralVisit.create({
      data: {
        date: shanghaiDate(),
        source,
        path: path.slice(0, 200),
        referrer,
      },
    })
  } catch (error) {
    // 统计失败不能影响页面（调用方是 best-effort 的埋点）
    console.error("[referral] track failed:", error)
  }
}

export interface DailyReferral {
  date: string
  source: string
  count: number
}

/** 取最近 N 天（含今天）的日期数组，升序 */
export function recentDates(days: number): string[] {
  const now = Date.now()
  return Array.from({ length: days }, (_, index) =>
    shanghaiDate(new Date(now - (days - 1 - index) * 86_400_000))
  )
}

export async function getReferralRows(
  sinceDate: string
): Promise<DailyReferral[]> {
  const rows = await prisma.referralVisit.groupBy({
    by: ["date", "source"],
    where: { date: { gte: sinceDate } },
    _count: { _all: true },
  })

  return rows.map((row) => ({
    date: row.date,
    source: row.source,
    count: row._count._all,
  }))
}
