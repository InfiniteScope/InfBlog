"use client"

import { useCallback, useEffect, useRef } from "react"
import { usePathname } from "next/navigation"
import { toast } from "sonner"

import { showBookmarkPrompt } from "@/components/blog/bookmark-prompt"
import {
  computeScrollPercent,
  isPositionResumable,
  scrollToBookmarkPercent,
} from "@/lib/bookmark-scroll"
import type { BookmarkType } from "@/lib/bookmarks"

interface ReadingResumeProps {
  slug: string
  type: BookmarkType
}

/** 位置太靠前（基本等于还没读）的书签没有跳转价值，不提示 */
const MIN_MEANINGFUL_PERCENT = 0.08

/**
 * 模块级守卫：记录"正在提示哪一篇"。
 * 同一 slug 即使组件被意外挂载两次，也只会弹出一个提示
 * （组件内的 ref 是每个实例独立的，拦不住另一个实例）。
 *
 * **必须在卸载时清空**：用户的诉求是"每次点进去都要提示"，而客户端路由
 * （点列表卡片回文章）不会重载模块——不清空的话第二次进入同一篇就再也不弹了。
 */
let promptedKey: string | null = null

/**
 * 阅读位置恢复与书签续读提示。
 *
 * 两条路径：
 * 1. **显式深链**（`#bm-<百分比>`，从「书签&收藏」点进来）：直接跳转
 *    （0 / 0.8s / 2s 三次校正，抵消懒加载图片造成的布局漂移），不弹询问。
 * 2. **直接打开页面**：已登录且这篇存过书签时，**每次进入都会**弹一条底部提示
 *    「上次读到 X%」+ 按钮「跳转到书签位置」/「取消」。
 *
 * 提示行为：只弹一次 / 10 秒自动消失（带倒计时进度条）/ 切换页面立即消失（淡出）。
 */
export function ReadingResume({ slug, type }: ReadingResumeProps) {
  const pathname = usePathname()
  const lastRunRef = useRef<{ payload: string; at: number } | null>(null)
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([])
  // 深链已经处理过 → 不再弹询问（每个实例各自判断）
  const suppressedRef = useRef(false)

  const clearTimers = useCallback(() => {
    timeoutsRef.current.forEach(clearTimeout)
    timeoutsRef.current = []
  }, [])

  /** 按百分比跳转 + 延迟校正 */
  const jumpTo = useCallback(
    (percent: number) => {
      clearTimers()
      timeoutsRef.current = scrollToBookmarkPercent(percent)
    },
    [clearTimers]
  )

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
      // 深链优先：不弹询问
      suppressedRef.current = true

      const percent = parseFloat(decodeURIComponent(payload))
      if (Number.isNaN(percent)) return
      jumpTo(percent)
      toast.info("已回到书签位置", { toasterId: "bottom-toaster" })
    }

    tryResume()
    const onHashChange = () => tryResume()
    window.addEventListener("hashchange", onHashChange)
    return () => {
      window.removeEventListener("hashchange", onHashChange)
      clearTimers()
    }
  }, [jumpTo, clearTimers])

  /* ---------- 路径 2：直接打开页面 → 查书签并询问 ---------- */
  useEffect(() => {
    if (typeof window === "undefined") return
    // URL 带 #bm- → 交给路径 1
    if (window.location.hash.startsWith("#bm-")) return
    // 本次进入已经提示过同一篇（防重复挂载），不再弹
    const key = `${pathname}#${type}:${slug}`
    if (promptedKey === key) return

    const controller = new AbortController()
    // 提示的关闭函数（由 showBookmarkPrompt 返回）：卸载/换页时调用，撤掉提示
    let dismissPromptRef: (() => void) | undefined

    fetch(`/api/bookmarks?type=${type}&slug=${encodeURIComponent(slug)}`, {
      signal: controller.signal,
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (controller.signal.aborted) return
        const bm = data?.bookmark as
          | { percent: number; anchor: string | null; label: string | null }
          | null
          | undefined
        if (!bm || typeof bm.percent !== "number") return
        if (bm.percent < MIN_MEANINGFUL_PERCENT) return
        // 已经读到这里了，跳过去也不会动，就不问了。
        // 判据放在"提示真正显示前"（fetch 解析后），这样用户在请求往返期间
        // 用右下角书签按钮跳到书签位置的情况也能被识别。
        if (!isPositionResumable(computeScrollPercent(), bm.percent)) return

        // 占位标记（同步），确保任何重复挂载都不会再弹
        promptedKey = key

        // 弹出提示（内含倒计时进度条）。自动关闭由 showBookmarkPrompt 内部的
        // 显式定时器负责——sonner 悬停时会暂停自己的计时器，不能依赖它。
        dismissPromptRef = showBookmarkPrompt({
          bookmark: bm,
          onJump: jumpTo,
        })
      })
      .catch(() => {
        // 未登录 / 网络异常：静默，不打扰阅读
      })

    return () => {
      controller.abort()
      // 切换页面/离开：立即撤掉提示，不让它残留到别的界面（sonner 自带淡出过渡）
      dismissPromptRef?.()
      clearTimers()
      // 释放守卫，让"下次再进入这篇"能重新提示
      if (promptedKey === key) promptedKey = null
    }
  }, [slug, type, pathname, jumpTo, clearTimers])

  return null
}
