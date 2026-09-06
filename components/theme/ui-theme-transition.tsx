"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react"

import {
  applyUiTheme,
  getUiTheme,
  type UiTheme,
} from "@/components/theme/ui-theme"
import { playExploreTransition } from "@/components/theme/transition-explore"
import { playClassicTransition } from "@/components/theme/transition-classic"

interface UiThemeTransitionValue {
  start: (theme: UiTheme) => void
}

const UiThemeTransitionContext = createContext<UiThemeTransitionValue>({
  start: () => {},
})

export function useUiThemeTransition() {
  return useContext(UiThemeTransitionContext)
}

/**
 * UI 主题转场编排：经典 ⇄ 探索各有一段 canvas 编排动画
 * （探索 = 月升棱镜；经典 = 碎形涟漪），满幕瞬间完成换肤。
 * reduced-motion 直接切换无动画。
 */
export function UiThemeTransitionProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [active, setActive] = useState<UiTheme | null>(null)

  const start = useCallback((theme: UiTheme) => {
    if (getUiTheme() === theme) return
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (reduce) {
      applyUiTheme(theme)
      return
    }
    setActive(theme)
  }, [])

  const handleDone = useCallback(() => setActive(null), [])

  /* 调试参数：?transition=explore|classic 自动播放转场（供截图验收/演示） */
  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get("transition")
    if (p === "explore" || p === "classic") {
      const timer = setTimeout(() => start(p), 400)
      return () => clearTimeout(timer)
    }
  }, [start])

  return (
    <UiThemeTransitionContext.Provider value={{ start }}>
      {children}
      {active && <TransitionOverlay theme={active} onDone={handleDone} />}
    </UiThemeTransitionContext.Provider>
  )
}

function TransitionOverlay({
  theme,
  onDone,
}: {
  theme: UiTheme
  onDone: () => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) {
      onDone()
      return
    }
    return theme === "explore"
      ? playExploreTransition(canvas, {
          onSwap: () => applyUiTheme("explore"),
          onDone,
        })
      : playClassicTransition(canvas, {
          onSwap: () => applyUiTheme("classic"),
          onDone,
        })
  }, [theme, onDone])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="fixed inset-0 z-[100] h-full w-full"
    />
  )
}
