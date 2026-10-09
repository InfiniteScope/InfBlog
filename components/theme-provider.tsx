"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes"

import { UI_CLASSIC_CLASS } from "@/components/theme/ui-theme"

type PointerLikeEvent = {
  clientX?: number
  clientY?: number
}

interface ThemeTransitionContextValue {
  /** Toggle between light and dark with a View Transition reveal. */
  toggleWithTransition: (event?: PointerLikeEvent) => void
}

const ThemeTransitionContext = React.createContext<ThemeTransitionContextValue | null>(null)

/**
 * 「探索」主题强制深色 —— 用 next-themes 原生的 `forcedTheme`，而不是伪造用户偏好。
 *
 * 为什么必须用 forcedTheme：
 * 旧实现是在探索时调 `setTheme("dark")`，那会写共享的 localStorage("theme")。
 * next-themes 自己也监听 storage 事件，于是**任何一次多余写入都会广播给所有
 * 标签页**：用户中键在新标签打开导航链接时，原标签的深浅色被反复改写
 * （表现为"界面被切换"）。而且用户真实偏好被覆盖成 dark，退出探索后无法还原。
 *
 * forcedTheme 只在内存里覆盖解析结果、不落盘，所以既保证探索恒为深色，
 * 又不污染用户偏好，也不会产生跨标签写入。
 *
 * 以 `<html>` 上的 ui-classic 类作为"当前是否探索"的唯一来源（换肤时由
 * applyUiTheme 切换），并只在它真正翻转时更新状态。
 */
function ForcedThemeSync({
  setForced,
}: {
  setForced: (v: "dark" | undefined) => void
}) {
  React.useEffect(() => {
    const read = () =>
      !document.documentElement.classList.contains(UI_CLASSIC_CLASS)
    let last = read()
    setForced(last ? "dark" : undefined)

    const observer = new MutationObserver(() => {
      const explore = read()
      if (explore === last) return
      last = explore
      setForced(explore ? "dark" : undefined)
    })
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    })
    return () => observer.disconnect()
  }, [setForced])

  return null
}

export function useThemeTransition() {
  const context = React.useContext(ThemeTransitionContext)
  if (!context) {
    throw new Error("useThemeTransition must be used within ThemeProvider")
  }
  return context
}

function ThemeTransitionProvider({ children }: { children: React.ReactNode }) {
  const { resolvedTheme, setTheme } = useTheme()

  const toggleWithTransition = React.useCallback(
    (event?: PointerLikeEvent) => {
      const nextTheme = resolvedTheme === "dark" ? "light" : "dark"

      const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
      if (!("startViewTransition" in document) || prefersReducedMotion) {
        setTheme(nextTheme)
        return
      }

      let originX = window.innerWidth / 2
      let originY = window.innerHeight / 2

      if (event?.clientX != null && event?.clientY != null) {
        originX = event.clientX
        originY = event.clientY
      }

      document.documentElement.style.setProperty("--vt-origin-x", `${originX}px`)
      document.documentElement.style.setProperty("--vt-origin-y", `${originY}px`)

      const doc = document as Document & {
        startViewTransition?: (callback: () => void | Promise<void>) => {
          ready: Promise<void>
          finished: Promise<void>
          updateCallbackDone: Promise<void>
        }
      }

      doc.startViewTransition?.(() => {
        setTheme(nextTheme)
      })
    },
    [resolvedTheme, setTheme]
  )

  return (
    <ThemeTransitionContext.Provider value={{ toggleWithTransition }}>
      {children}
    </ThemeTransitionContext.Provider>
  )
}

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false
  }

  return (
    target.isContentEditable ||
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT"
  )
}

function ThemeHotkey() {
  const { resolvedTheme } = useTheme()
  const { toggleWithTransition } = useThemeTransition()

  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || event.repeat) {
        return
      }

      if (event.metaKey || event.ctrlKey || event.altKey) {
        return
      }

      if (!event.key || event.key.toLowerCase() !== "d") {
        return
      }

      if (isTypingTarget(event.target)) {
        return
      }

      toggleWithTransition()
    }

    window.addEventListener("keydown", onKeyDown)

    return () => {
      window.removeEventListener("keydown", onKeyDown)
    }
  }, [resolvedTheme, toggleWithTransition])

  return null
}

function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  /* 探索主题下强制深色：用 next-themes 的 forcedTheme（不写 localStorage） */
  const [forced, setForced] = React.useState<"dark" | undefined>(undefined)

  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      forcedTheme={forced}
      {...props}
    >
      <ForcedThemeSync setForced={setForced} />
      <ThemeTransitionProvider>
        <ThemeHotkey />
        {children}
      </ThemeTransitionProvider>
    </NextThemesProvider>
  )
}

export { ThemeProvider }
