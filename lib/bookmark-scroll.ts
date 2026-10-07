/**
 * 书签相关的共享客户端工具：位置捕获、保存、跳转。
 * 由 `BookmarkButton`（右下角书签按钮）与 `ReadingResume`（续读提示）共用，
 * 避免两处各写一份滚动/请求逻辑而行为漂移。
 */

/** 当前位置与目标位置相差不足这个比例时，视为「已经读到这里」 */
export const SAME_POSITION_TOLERANCE = 0.06

export interface BookmarkPosition {
  percent: number
  anchor: string | null
  label: string | null
}

export type SaveResult =
  | { ok: true; position: BookmarkPosition }
  | { ok: false; status: number }

/**
 * 是否值得提示/跳转：位置离目标足够远，跳过去才有意义。
 * 各提示点共用同一判据。
 */
export function isPositionResumable(
  currentPercent: number,
  targetPercent: number
): boolean {
  return (
    Number.isFinite(currentPercent) &&
    Number.isFinite(targetPercent) &&
    Math.abs(currentPercent - targetPercent) >= SAME_POSITION_TOLERANCE
  )
}

export function computeScrollPercent(): number {
  if (typeof window === "undefined") return 0
  const doc = document.documentElement
  const max = doc.scrollHeight - window.innerHeight
  return max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0
}

/**
 * 记录当前阅读位置：滚动百分比 + 最近一个已越过的小节标题（锚点 + 文字）。
 * 锚点用于回报位置给用户（「读到『XXX』」），跳转优先用百分比。
 */
export function captureBookmarkPosition(): BookmarkPosition {
  const percent = computeScrollPercent()

  let anchor: string | null = null
  let label: string | null = null
  const heads = document.querySelectorAll(
    "article h1[id], article h2[id], article h3[id], article h4[id], article h5[id], article h6[id]"
  )
  for (const h of heads) {
    if (h.getBoundingClientRect().top + window.scrollY <= window.scrollY + 120) {
      anchor = h.id
      label = h.textContent?.trim() ?? null
    } else {
      break
    }
  }
  return { percent, anchor, label }
}

export async function saveBookmark(input: {
  type: "post" | "doc"
  slug: string
  title: string
  percent: number
  anchor: string | null
  label: string | null
}): Promise<SaveResult> {
  try {
    const res = await fetch("/api/bookmarks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    })
    if (!res.ok) return { ok: false, status: res.status }
    return { ok: true, position: { percent: input.percent, anchor: input.anchor, label: input.label } }
  } catch {
    return { ok: false, status: 0 }
  }
}

/**
 * 按百分比跳转到书签位置。懒加载图片会推高页面 → 按 0 / 0.8s / 2s 校正三次。
 * 注意：按百分比而非锚点定位，因为锚点靠上方对齐、会把用户带到章节开头而不是原文位置。
 */
export function scrollToBookmarkPercent(
  percent: number,
  onSettle?: () => void
): ReturnType<typeof setTimeout>[] {
  const jump = () => {
    const doc = document.documentElement
    const max = doc.scrollHeight - window.innerHeight
    window.scrollTo({ top: Math.max(0, percent * max), behavior: "instant" })
  }
  jump()
  const timers = [setTimeout(jump, 800), setTimeout(jump, 2000)]
  if (onSettle) timers.push(setTimeout(onSettle, 2200))
  return timers
}
