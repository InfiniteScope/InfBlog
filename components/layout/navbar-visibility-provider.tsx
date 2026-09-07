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
  /** 手动收起顶栏（导航栏下缘热区单击触发） */
  collapse: () => void
}

const NavbarVisibilityContext = createContext<NavbarVisibilityValue>({
  hidden: false,
  reveal: () => {},
  collapse: () => {},
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

  const collapse = useCallback(() => {
    accDown.current = 0
    accUp.current = 0
    setHidden(true)
  }, [])

  // 切页时恢复展开，并以当前滚动位置为基准
  useEffect(() => {
    lastY.current = window.scrollY
    reveal()
  }, [pathname, reveal])

  useEffect(() => {
    lastY.current = window.scrollY
    let ticking = false
    // 首页阅读流不被滚动打断：向下滚动不自动收起（其他页面照常）
    const exempt = pathname === "/"

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
          accUp.current = 0
          // 首页：向下滚动不自动收起
          if (exempt) return
          accDown.current += delta
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
  }, [pathname, reveal, collapse])

  return (
    <NavbarVisibilityContext.Provider value={{ hidden, reveal, collapse }}>
      {children}
    </NavbarVisibilityContext.Provider>
  )
}

/**
 * 顶栏收起后的手动展开入口：老式拉线开关。
 * 一根细线从视口上缘垂下，末端是一枚开关拉珠；
 * 悬浮时线身拉长、拉珠下沉，单击「拉一下」——拉珠下坠回弹，
 * 顶栏随之落下。导航栏可见时整根线收进视口外。
 */
export function NavbarExpandButton() {
  const { hidden, reveal } = useNavbarVisibility()
  const [pulling, setPulling] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current)
    },
    []
  )

  const handlePull = () => {
    if (pulling) return
    setPulling(true)
    reveal()
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setPulling(false), 450)
  }

  return (
    <button
      type="button"
      onClick={handlePull}
      aria-label="展开导航栏"
      title="拉一下，展开导航栏"
      aria-hidden={!hidden}
      tabIndex={hidden ? 0 : -1}
      className={cn(
        "group fixed right-10 top-0 z-50 flex w-8 flex-col items-center transition-all duration-500 ease-out md:right-14",
        hidden
          ? "translate-y-0 opacity-100"
          : "pointer-events-none -translate-y-20 opacity-0"
      )}
    >
      {/* 拉线：从视口上缘垂下 */}
      <span
        aria-hidden
        className={cn(
          "block w-0.5 origin-top rounded-full bg-gradient-to-b from-border via-muted-foreground/50 to-muted-foreground/90 transition-[height,background] duration-300 ease-out",
          pulling ? "h-16" : "h-10 group-hover:h-14"
        )}
      />
      {/* 开关拉珠：老式旋钮式小圆柱 */}
      <span
        aria-hidden
        className={cn(
          "block h-4 w-3 -translate-y-px rounded-full border border-muted-foreground/50 bg-gradient-to-b from-background via-muted-foreground/25 to-muted-foreground/75 shadow-sm ring-1 ring-inset ring-background/60 transition-[transform,box-shadow] duration-300 ease-out group-hover:shadow-md",
          pulling
            ? "translate-y-2 shadow-md"
            : "group-hover:translate-y-0.5 group-active:translate-y-1.5"
        )}
      />
      {/* 悬浮提示：保持语义明确，但不破坏开关造型 */}
      <span
        aria-hidden
        className="pointer-events-none absolute right-full top-11 mr-1 whitespace-nowrap rounded-full border border-border/60 bg-background/90 px-2 py-0.5 font-mono text-[10px] tracking-widest text-muted-foreground opacity-0 shadow-sm backdrop-blur-md transition-all duration-200 group-hover:-translate-x-0.5 group-hover:opacity-100 md:top-15"
      >
        展开导航
      </span>
    </button>
  )
}
