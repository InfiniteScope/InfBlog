"use client"

import { useEffect } from "react"
import { toast } from "sonner"

/** 提示只需要这几个字段（`/api/bookmarks` 的返回子集） */
export interface BookmarkPromptData {
  percent: number
  label: string | null
}

/** 提示存活时长：用户不操作就自动消失，并伴随倒计时进度条 */
export const PROMPT_DURATION_MS = 10_000

/**
 * 倒计时进度条。挂在 sonner 的 `description` 里，因此它是卡片 React 树的一部分：
 * 卡片重渲染也冲不掉它（这是命令式 append 做不到的）。
 *
 * 为什么不能用 `::after` 伪元素：sonner 用
 * `[data-sonner-toast][data-expanded=true]::after` 做「悬停展开时卡片之间的衔接桥」
 * （`bottom:100%` + `height:calc(var(--gap)+1px)`），特异性更高，会把条形顶到卡片上方、
 * 高度也变成 15px（实测 hover 时 bottom 由 0px 跳到 89.875px）。
 */
function CountdownBar({
  durationMs,
  scopeClass,
}: {
  durationMs: number
  scopeClass: string
}) {
  // 在 effect 里注入 <style>，确保"设好时长变量"发生在"动画起跑"之前
  useEffect(() => {
    const styleEl = document.createElement("style")
    styleEl.setAttribute("data-bm-countdown-style", "")
    // 只作用于这一张卡片：sonner 2.0.8 不在 DOM 上渲染 data-id，
    // 所以调用方另外给它挂了一个稳定 class
    styleEl.textContent = `.${scopeClass}{--bookmark-prompt-ms:${durationMs}ms}`
    document.head.appendChild(styleEl)
    return () => {
      styleEl.remove()
    }
  }, [scopeClass, durationMs])

  return <span className="bm-countdown" data-bm-countdown aria-hidden="true" />
}

interface BookmarkPromptOptions {
  bookmark: BookmarkPromptData
  /** 用户点「跳转到书签位置」 */
  onJump: (percent: number) => void
}

/**
 * 弹出底部「要跳回上次的位置吗？」提示。
 *
 * 自动关闭由**显式定时器**负责，不依赖 sonner 的 `duration`：
 * sonner 在悬停（`data-expanded=true`）时会暂停自己的自动关闭计时器，
 * 而用户的诉求是"到点就走"——鼠标停在提示上 10 秒也必须消失。
 * 倒计时条与定时器同步，所以两者不会出现"条读完了卡片还在"的不一致。
 */
export function showBookmarkPrompt({ bookmark, onJump }: BookmarkPromptOptions) {
  const percent = Math.round(bookmark.percent * 100)
  const scopeClass = `bm-${Math.random().toString(36).slice(2, 9)}`
  let dismissTimer: number | undefined

  const toastId = toast.info(
    bookmark.label ? `上次读到「${bookmark.label}」` : `上次读到 ${percent}%`,
    {
      toasterId: "bottom-toaster",
      // 有限值仅作兜底；真正的关闭交给下面的定时器（sonner 悬停会暂停自己的计时器）
      duration: PROMPT_DURATION_MS * 3,
      className: `bookmark-prompt-toast ${scopeClass}`,
      description: (
        // flex 列布局 + minWidth:0：让容器成为块级盒子，正文自己占一行，
        // 不会被 sonner 的按钮行挤成"位置吗？"这种丑陋折行
        <span style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
          <span>{bookmark.label ? `读到 ${percent}% · ` : ""}要跳回上次的位置吗？</span>
          <CountdownBar durationMs={PROMPT_DURATION_MS} scopeClass={scopeClass} />
        </span>
      ),
      action: {
        label: "跳转到书签位置",
        onClick: () => onJump(bookmark.percent),
      },
      // 「取消」= 什么都不做，留在当前位置（sonner 的 Action.onClick 是必填）
      cancel: { label: "取消", onClick: () => {} },
    }
  )

  dismissTimer = window.setTimeout(() => {
    toast.dismiss(toastId)
  }, PROMPT_DURATION_MS)

  return () => {
    if (dismissTimer !== undefined) window.clearTimeout(dismissTimer)
    toast.dismiss(toastId)
  }
}
