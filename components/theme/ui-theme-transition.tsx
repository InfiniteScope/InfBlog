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
 * 月亮不再由 canvas 另画——引擎直接驱动首页那只 #hero-moon 本体
 * （同一个 DOM 元素），转场与主界面共享同一个月亮。
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
  const veilRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) {
      onDone()
      return
    }
    /* 首页那只月亮（portal 月层）——转场与主界面共用的同一个元素。
       veil = 月亮下方的夜幕层（z-15 < 月亮 z-20）：入夜氛围不暗化月体；
       canvas（z-100）在月亮之上，承担霜幕/碎裂等需要盖过月面的特效。 */
    const moon = {
      rise: document.getElementById("hero-moon-rise"),
      veil: veilRef.current,
    }
    return theme === "explore"
      ? playExploreTransition(canvas, {
          onSwap: () => applyUiTheme("explore"),
          onDone,
        }, moon)
      : playClassicTransition(canvas, {
          onSwap: () => applyUiTheme("classic"),
          onDone,
        }, moon)
  }, [theme, onDone])

  return (
    <>
      <div
        ref={veilRef}
        aria-hidden
        className="pointer-events-none fixed inset-0 z-[15] bg-[#020408] opacity-0"
      />
      <canvas
        ref={canvasRef}
        aria-hidden
        className="fixed inset-0 z-[100] h-full w-full"
      />
    </>
  )
}
