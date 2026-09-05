"use client"

import { useEffect, useState } from "react"
import { History, Sparkles } from "lucide-react"

const STORAGE_KEY = "infblog-ui"
const LEGACY_CLASS = "legacy-ui"

/**
 * UI 版本开关：v2「Terminal Blueprint」↔ 旧版「Moss & Sand」。
 * 纯 CSS class 切换（html.legacy-ui），无需刷新；localStorage 记忆，
 * 首屏由 layout 内联脚本在渲染前应用，无闪烁。
 */
export function UiVersionToggle() {
  const [legacy, setLegacy] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setLegacy(document.documentElement.classList.contains(LEGACY_CLASS))
    setMounted(true)
  }, [])

  const toggle = () => {
    const next = !legacy
    setLegacy(next)
    document.documentElement.classList.toggle(LEGACY_CLASS, next)
    try {
      if (next) {
        localStorage.setItem(STORAGE_KEY, "legacy")
      } else {
        localStorage.removeItem(STORAGE_KEY)
      }
    } catch {
      // 隐私模式等场景下忽略存储失败
    }
  }

  //  hydration 完成前渲染占位，避免按钮闪现错误文案
  if (!mounted) {
    return (
      <div
        className="fixed bottom-8 right-[4.75rem] z-40 h-7 w-24"
        aria-hidden
      />
    )
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={legacy ? "切换到新版界面" : "切换到旧版界面"}
      className="fixed bottom-8 right-[4.75rem] z-40 flex h-7 items-center gap-1.5 rounded-full border border-border/60 bg-background/70 px-3 font-mono text-[10px] tracking-widest text-muted-foreground backdrop-blur-xl transition-colors hover:border-accent/50 hover:text-foreground"
    >
      {legacy ? <Sparkles className="h-3 w-3" /> : <History className="h-3 w-3" />}
      {legacy ? "V2 · 新版界面" : "V1 · 旧版界面"}
    </button>
  )
}
