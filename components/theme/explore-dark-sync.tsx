"use client"

import { useEffect } from "react"
import { useTheme } from "next-themes"

import { UI_CLASSIC_CLASS } from "@/components/theme/ui-theme"

const PREV_THEME_KEY = "infblog-prev-theme"

/**
 * 「探索」主题强制深色：进入探索时把 next-themes 切到 dark 并记住用户
 * 原本的深浅色偏好（localStorage "infblog-prev-theme"，由 layout 的
 * 预绘制脚本在同会话首次进入时也写入）；切回经典时还原原偏好。
 * 监听 <html> class 变化：换肤发生在转场满幕瞬间，这里随之生效。
 * 探索期间用户再点深浅色开关会被重新压回 dark（强制深色的语义）。
 */
export function ExploreDarkSync() {
  const { setTheme } = useTheme()

  useEffect(() => {
    const sync = () => {
      try {
        const explore = !document.documentElement.classList.contains(
          UI_CLASSIC_CLASS
        )
        if (explore) {
          if (document.documentElement.classList.contains("dark")) return
          const stored = localStorage.getItem("theme")
          if (!localStorage.getItem(PREV_THEME_KEY)) {
            localStorage.setItem(PREV_THEME_KEY, stored ?? "system")
          }
          setTheme("dark")
        } else {
          const prev = localStorage.getItem(PREV_THEME_KEY)
          if (prev) {
            localStorage.removeItem(PREV_THEME_KEY)
            if (prev === "light" || prev === "dark" || prev === "system") {
              setTheme(prev)
            }
          }
        }
      } catch {
        // 隐私模式等场景下忽略存储失败
      }
    }

    sync()
    const observer = new MutationObserver(sync)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    })
    return () => observer.disconnect()
  }, [setTheme])

  return null
}
