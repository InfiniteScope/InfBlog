/**
 * 全站日期时间展示的统一格式化层。
 *
 * 为什么不用 `toLocaleDateString` / `toLocaleString`：
 * 1. **时区不确定**——`2026-09-08T08:56:41.599Z` 在不同时区的访客眼里会显示成不同的时刻，
 *    同一篇文章的"发布时间"应该对所有人一致；这里固定为 `Asia/Shanghai`（站点运维时区）。
 * 2. **输出不可控**——`toLocale*` 的具体串依赖浏览器/Node 的 locale 数据，服务端与客户端
 *    可能不一致，会触发 React 水合不匹配。这里用显式 options + 手工拼接，输出恒定。
 *
 * 输出示例：`2026-08-18 18:18`；只有日期时（frontmatter 写 `date: '2026-08-27'`）为 `2026-08-27`。
 */

export const SITE_TIME_ZONE = "Asia/Shanghai"

const dateTimeFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: SITE_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
})

const dateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: SITE_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
})

/**
 * 源串是否带时间部分。
 * `'2026-08-27'` / `'2026-08-27T00:00:00.000Z'`（无时间信息时的回退值）→ false，只显示日期。
 * 判据「含 T 且时分秒非全零」：因为 `new Date('2026-08-27')` 会被解析成 UTC 午夜，
 * 若照样格式化就会显示出没有意义的 `08:00`（东八区）。
 */
export function hasTimePart(raw?: string | null): boolean {
  if (!raw) return false
  if (!raw.includes("T")) return false
  const m = /T(\d{2}):(\d{2})(?::(\d{2}))?/.exec(raw)
  if (!m) return false
  return !(m[1] === "00" && m[2] === "00" && (!m[3] || m[3] === "00"))
}

/** 日期（可含时间）：有真实时间则精确到分钟，否则只到日 */
export function formatDateTime(raw: string): string {
  const d = new Date(raw)
  if (Number.isNaN(d.getTime())) return raw
  if (!hasTimePart(raw)) return dateFormatter.format(d)
  // en-CA 的官方输出是 `2026-08-18, 18:18`（带逗号），这里去掉逗号得到 `2026-08-18 18:18`
  return dateTimeFormatter.format(d).replace(",", "")
}

/** 强制只到日（用于"注册时间""日期型字段"等） */
export function formatDate(raw: string | Date): string {
  const d = raw instanceof Date ? raw : new Date(raw)
  if (Number.isNaN(d.getTime())) return String(raw)
  return dateFormatter.format(d)
}

/** 强制精确到分钟（用于时间戳类字段，如评论/通知的 createdAt） */
export function formatDateTimeStrict(raw: string | Date): string {
  const d = raw instanceof Date ? raw : new Date(raw)
  if (Number.isNaN(d.getTime())) return String(raw)
  return dateTimeFormatter.format(d).replace(",", "")
}

/** 仅按月-日展示（如快报条目的发布日期，显示为 `09-17`） */
export function formatMonthDay(raw: string | Date): string {
  const d = raw instanceof Date ? raw : new Date(raw)
  if (Number.isNaN(d.getTime())) return String(raw)
  const full = dateFormatter.format(d) // YYYY-MM-DD
  return full.slice(5)
}

/** 日期里的 `YYYY-MM-DD` 部分（用于同一天/同一分钟的判定） */
function dayKey(raw: string): string {
  const d = new Date(raw)
  if (Number.isNaN(d.getTime())) return raw
  return dateFormatter.format(d)
}

function minuteKey(raw: string): string {
  const d = new Date(raw)
  if (Number.isNaN(d.getTime())) return raw
  return dateTimeFormatter.format(d)
}

/**
 * 是否需要展示"更新时间"：
 * - 缺失 → 不展示
 * - 与发布时间精确到分钟相同 → 不展示（避免同一时刻重复显示两条）
 * - **早于发布时间**（文件 mtime 回退、部署重写文件等造成的脏数据）→ 不展示，宁缺勿错
 */
export function shouldShowUpdatedAt(
  date: string,
  updatedAt?: string | null
): boolean {
  if (!updatedAt) return false
  const published = new Date(date).getTime()
  const updated = new Date(updatedAt).getTime()
  if (Number.isNaN(published) || Number.isNaN(updated)) {
    return updatedAt !== date
  }
  if (updated < published) return false
  return minuteKey(date) !== minuteKey(updatedAt)
}

/**
 * 判断两个时间戳是否属于"同一次修改"（用于收藏列表等只需要日的场景）
 * 精确到分钟相同即视为同一时刻。
 */
export function isSameMoment(a: string, b: string): boolean {
  const da = new Date(a).getTime()
  const db = new Date(b).getTime()
  if (Number.isNaN(da) || Number.isNaN(db)) return a === b
  return minuteKey(a) === minuteKey(b)
}

/** 仅按"日"比较（供只需要日期粒度的场景使用） */
export function isSameDay(a: string, b: string): boolean {
  return dayKey(a) === dayKey(b)
}
