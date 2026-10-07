"use client"

import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"

import type { BookmarkType } from "@/lib/bookmarks"

interface ReadingResumeProps {
  slug: string
  type: BookmarkType
}

/** 当前位置与书签位置相差不足这个比例时，视为「已经读到这里」，不再打扰 */
const SAME_POSITION_TOLERANCE = 0.06
/** 位置太靠前（基本等于还没读）的书签没有跳转价值，不提示 */
const MIN_MEANINGFUL_PERCENT = 0.08

function computePercent(): number {
  const doc = document.documentElement
  const max = doc.scrollHeight - window.innerHeight
  return max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0
}

/**
 * 阅读位置恢复与书签续读提示。
 *
 * 两条路径：
 * 1. **显式深链**（`#bm-<锚点id>` 或 `#bm-<0~1百分比>`）：从「书签&收藏」弹层点进来时，
 *    直接跳转并提示「已回到书签位置」。
 * 2. **直接打开页面**：已登录且这篇存过书签时，主动弹一条询问
 *    「读到 X%，是否跳转？」——**跳不跳由用户点**，不自动抢走滚动位置。
 *
 * 抑制策略（避免打扰）：URL 已带 `#bm-`（走路径 1）、同标签页本会话已问过一次、
 * 位置相差不足 6%、书签进度不足 8% —— 任一命中都不提示。
 *
 * 懒加载图片会推高页面 → 跳转后按 0 / 0.8s / 2s 校正三次，抵消布局漂移。
 * 去重守卫：dev 的 StrictMode 双 effect / hashchange 连发时，2s 内同 payload 只执行一次。
 */
export function ReadingResume({ slug, type }: ReadingResumeProps) {
  const lastRunRef = useRef<{ payload: string; at: number } | null>(null)
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([])
  // 用户点过「不用了」/ 已经问过一次 → 本组件生命周期内不再弹
  const suppressedRef = useRef(false)
  const [resumable, setResumable] = useState<{
    percent: number
    anchor: string | null
    label: string | null
  } | null>(null)

  /** 跳转到指定锚点 / 百分比位置，并做两次延迟校正 */
  const jumpTo = (anchor: string | null, percent: number) => {
    const jump = () => {
      const anchorEl = anchor ? document.getElementById(anchor) : null
      if (anchorEl) {
        anchorEl.scrollIntoView({ block: "start", behavior: "instant" })
        return
      }
      const doc = document.documentElement
      const max = doc.scrollHeight - window.innerHeight
      window.scrollTo({ top: Math.max(0, percent * max), behavior: "instant" })
    }
    jump()
    timeoutsRef.current.push(setTimeout(jump, 800))
    timeoutsRef.current.push(setTimeout(jump, 2000))
  }

  /* ---------- 路径 1：显式深链 #bm-* ---------- */
  useEffect(() => {
    const tryResume = () => {
      const hash = window.location.hash
      if (!hash.startsWith("#bm-")) return
      const payload = hash.slice(4)

      const now = Date.now()
      if (
        lastRunRef.current?.payload === payload &&
        now - lastRunRef.current.at < 2000
      ) {
        return
      }
      lastRunRef.current = { payload, at: now }
      // 深链优先：不再弹「是否跳转」的询问
      suppressedRef.current = true

      const decoded = decodeURIComponent(payload)
      const percent = parseFloat(decoded)
      jumpTo(document.getElementById(decoded) ? decoded : null, percent)
      toast.info("已回到书签位置", { toasterId: "bottom-toaster" })
    }

    tryResume()

    const onHashChange = () => tryResume()
    window.addEventListener("hashchange", onHashChange)
    return () => {
      window.removeEventListener("hashchange", onHashChange)
      timeoutsRef.current.forEach(clearTimeout)
      timeoutsRef.current = []
    }
    // jumpTo 只读 ref 与 window，无需进依赖
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* ---------- 路径 2：直接打开页面 → 查书签并询问 ---------- */
  useEffect(() => {
    if (typeof window === "undefined") return
    // URL 带 #bm- → 交给路径 1，避免两套逻辑打架
    if (window.location.hash.startsWith("#bm-")) return
    // 同一标签页会话内已经问过这篇，不再重复打扰
    const seenKey = `bm-prompted:${type}:${slug}`
    try {
      if (sessionStorage.getItem(seenKey)) return
    } catch {
      // 隐私模式下 sessionStorage 可能不可用，忽略
    }

    const controller = new AbortController()
    let cancelled = false

    fetch(`/api/bookmarks?type=${type}&slug=${encodeURIComponent(slug)}`, {
      signal: controller.signal,
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || suppressedRef.current) return
        const bm = data?.bookmark as
          | { percent: number; anchor: string | null; label: string | null }
          | null
          | undefined
        if (!bm || typeof bm.percent !== "number") return
        if (bm.percent < MIN_MEANINGFUL_PERCENT) return
        // 已经读到这里了，不用问
        if (Math.abs(computePercent() - bm.percent) < SAME_POSITION_TOLERANCE) {
          return
        }
        setResumable({
          percent: bm.percent,
          anchor: bm.anchor ?? null,
          label: bm.label ?? null,
        })
      })
      .catch(() => {
        // 未登录 / 网络异常：静默，不打扰阅读
      })

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [slug, type])

  /* ---------- 弹出询问 ---------- */
  useEffect(() => {
    if (!resumable || suppressedRef.current) return
    suppressedRef.current = true
    try {
      sessionStorage.setItem(`bm-prompted:${type}:${slug}`, "1")
    } catch {
      // 忽略
    }

    const { percent, anchor, label } = resumable
    const percentText = `读到 ${Math.round(percent * 100)}%`
    toast.info(`上次${label ? `读到「${label}」` : percentText}`, {
      toasterId: "bottom-toaster",
      // 需要用户决策，默认 4s 太短
      duration: 12000,
      description: label ? `${percentText} · 要跳回上次的位置吗？` : "要跳回上次的位置吗？",
      action: {
        label: "跳转到书签",
        onClick: () => {
          jumpTo(anchor, percent)
          toast.success(`已回到 ${percentText} 的位置`, {
            toasterId: "bottom-toaster",
          })
        },
      },
      cancel: {
        label: "从头看",
        onClick: () => {
          window.scrollTo({ top: 0, behavior: "smooth" })
        },
      },
    })
    // resumable 只在拿到书签后从 null 变为对象，jumpTo 只读 ref
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resumable, slug, type])

  return null
}
