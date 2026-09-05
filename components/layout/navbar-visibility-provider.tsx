"use client"

import { usePathname } from "next/navigation"
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react"
import { ChevronDown } from "lucide-react"

import { cn } from "@/lib/utils"

/** 向下累计滚动超过该距离后收起顶栏 */
const HIDE_DELTA = 72
/** 向上累计滚动超过该距离后展开顶栏 */
const SHOW_DELTA = 32
/** 页面顶部区间内顶栏始终可见 */
const TOP_ZONE = 64
/** 至少滚过该绝对距离才允许收起（避免顶部附近误触） */
const MIN_HIDE_SCROLL_Y = 140

interface NavbarVisibilityValue {
  hidden: boolean
  reveal: () => void
}

const NavbarVisibilityContext = createContext<NavbarVisibilityValue>({
  hidden: false,
  reveal: () => {},
})

export function useNavbarVisibility() {
  return useContext(NavbarVisibilityContext)
}

/**
 * 顶栏滚动可见性：
 * - 向下累计滚动 > HIDE_DELTA 且越过 MIN_HIDE_SCROLL_Y → 收起
 * - 向上累计滚动 > SHOW_DELTA，或回到顶部 TOP_ZONE 内 → 展开
 * - 收起时由 NavbarExpandButton 提供手动展开入口
 */
export function NavbarVisibilityProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [hidden, setHidden] = useState(false)
  const pathname = usePathname()
  const lastY = useRef(0)
  const accDown = useRef(0)
  const accUp = useRef(0)

  const reveal = useCallback(() => {
    accDown.current = 0
    accUp.current = 0
    setHidden(false)
  }, [])

  // 切页时恢复展开，并以当前滚动位置为基准
  useEffect(() => {
    lastY.current = window.scrollY
    reveal()
  }, [pathname, reveal])

  useEffect(() => {
    lastY.current = window.scrollY
    let ticking = false

    const onScroll = () => {
      if (ticking) return
      ticking = true
      requestAnimationFrame(() => {
        ticking = false
        const y = window.scrollY
        const delta = y - lastY.current
        lastY.current = y

        if (y <= TOP_ZONE) {
          reveal()
          return
        }

        if (delta > 0) {
          accDown.current += delta
          accUp.current = 0
          if (accDown.current >= HIDE_DELTA && y > MIN_HIDE_SCROLL_Y) {
            setHidden(true)
            accDown.current = 0
          }
        } else if (delta < 0) {
          accUp.current += -delta
          accDown.current = 0
          if (accUp.current >= SHOW_DELTA) {
            setHidden(false)
            accUp.current = 0
          }
        }
      })
    }

    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [reveal])

  return (
    <NavbarVisibilityContext.Provider value={{ hidden, reveal }}>
      {children}
    </NavbarVisibilityContext.Provider>
  )
}

/** 顶栏收起后，顶部居中悬浮的展开按钮 */
export function NavbarExpandButton() {
  const { hidden, reveal } = useNavbarVisibility()

  return (
    <button
      type="button"
      onClick={reveal}
      aria-label="展开导航栏"
      aria-hidden={!hidden}
      tabIndex={hidden ? 0 : -1}
      className={cn(
        "fixed left-1/2 top-2 z-50 flex h-8 -translate-x-1/2 items-center gap-1.5 rounded-full border border-border/60 bg-background/80 px-3 text-xs text-muted-foreground shadow-md backdrop-blur-xl transition-all duration-300 hover:text-foreground",
        hidden
          ? "translate-y-0 opacity-100"
          : "pointer-events-none -translate-y-12 opacity-0"
      )}
    >
      <ChevronDown className="h-3.5 w-3.5" />
      展开导航
    </button>
  )
}
