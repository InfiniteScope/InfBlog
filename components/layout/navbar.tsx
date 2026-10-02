"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSession } from "next-auth/react"
import { Loader2, Menu, User, ChevronUp } from "lucide-react"
import { useEffect, useRef, useState } from "react"

import { siteConfig } from "@/lib/config"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet"
import { ThemeToggle } from "@/components/theme-toggle"
import { Sidebar } from "@/components/layout/sidebar"
import { UserMenu } from "@/components/layout/user-menu"
import { SearchCommand } from "@/components/search-command"
import { FlowToggle } from "@/components/flow/flow-toggle"
import { AppearanceToggle } from "@/components/theme/appearance-toggle"
import { MusicPlayerMini } from "@/components/music/music-player-mini"
import { WeatherWidget } from "@/components/weather/weather-widget"
import { NavbarMore } from "@/components/layout/navbar-more"
import { useNavbarVisibility } from "@/components/layout/navbar-visibility-provider"
import {
  useAspectRatio,
  ASPECT_RATIO_THRESHOLD,
  DRAWER_BREAKPOINT,
} from "@/lib/hooks/use-aspect-ratio"
import type { Danmaku } from "@prisma/client"
import type { Post } from "@/lib/mdx"

interface NavbarProps {
  danmaku: Pick<Danmaku, "id" | "content" | "color" | "createdAt">[]
  posts: Post[]
  unreadCount?: number
}

export function Navbar({ danmaku, posts, unreadCount = 0 }: NavbarProps) {
  const pathname = usePathname()
  const { status } = useSession()
  const [loginHref, setLoginHref] = useState("/login")
  const [navOpen, setNavOpen] = useState(false)
  const viewport = useAspectRatio()
  const { aspectRatio } = viewport
  const { hidden, collapse } = useNavbarVisibility()
  // 细长屏幕（比例 + 宽度双条件）：次要功能收起进"更多"
  const wideLayout =
    aspectRatio >= ASPECT_RATIO_THRESHOLD ||
    viewport.width >= DRAWER_BREAKPOINT

  // 顶栏空间实测：天气条保持视觉居中；左右内容侵入中线安全区时收起。
  // 替代旧的比例阈值猜测（ASPECT_RATIO_THRESHOLD 只决定右侧次要功能折叠）。
  const headerInnerRef = useRef<HTMLDivElement>(null)
  const leftGroupRef = useRef<HTMLDivElement>(null)
  const rightGroupRef = useRef<HTMLDivElement>(null)
  const weatherRef = useRef<HTMLDivElement>(null)
  const [weatherFits, setWeatherFits] = useState(true)

  useEffect(() => {
    const header = headerInnerRef.current
    if (!header) return

    const measure = () => {
      const left = leftGroupRef.current
      const right = rightGroupRef.current
      const weather = weatherRef.current
      if (!left || !right || !weather) return
      if (window.innerWidth < DRAWER_BREAKPOINT) return // 窄屏天气走抽屉

      const headerRect = header.getBoundingClientRect()
      const hw = weather.offsetWidth
      const centerLeft = headerRect.width / 2 - hw / 2
      const centerRight = headerRect.width / 2 + hw / 2

      /* 左右组是 flex-1 弹性盒，盒子会顶到中线——要量的是"内容"的边沿，
         即左组可见子元素的最右缘、右组可见子元素的最左缘 */
      const visibleRight = (el: HTMLElement) =>
        Math.max(
          0,
          ...Array.from(el.children)
            .filter((c) => (c as HTMLElement).offsetWidth > 0)
            .map((c) => c.getBoundingClientRect().right - headerRect.left)
        )
      const visibleLeft = (el: HTMLElement) =>
        Math.min(
          Infinity,
          ...Array.from(el.children)
            .filter((c) => (c as HTMLElement).offsetWidth > 0)
            .map((c) => c.getBoundingClientRect().left - headerRect.left)
        )

      const leftEdge = visibleRight(left)
      const rightEdge = visibleLeft(right)
      setWeatherFits(
        leftEdge <= centerLeft - 12 && rightEdge >= centerRight + 12
      )
    }

    measure()
    const timer = setTimeout(measure, 300) // 等天气数据/字体就位
    document.fonts?.ready.then(measure).catch(() => {})

    const ro = new ResizeObserver(measure)
    ro.observe(header)
    if (leftGroupRef.current) ro.observe(leftGroupRef.current)
    if (rightGroupRef.current) ro.observe(rightGroupRef.current)
    if (weatherRef.current) ro.observe(weatherRef.current)

    return () => {
      clearTimeout(timer)
      ro.disconnect()
    }
  }, [pathname, status, wideLayout])

  useEffect(() => {
    const current = window.location.pathname + window.location.search
    setLoginHref(`/login?callbackUrl=${encodeURIComponent(current)}`)
  }, [pathname])

  // 切页时自动收起抽屉
  useEffect(() => {
    setNavOpen(false)
  }, [pathname])

  return (
    <header
      className={cn(
        "sticky top-0 z-40 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl transition-transform duration-300",
        hidden && "-translate-y-full"
      )}
    >
      <div ref={headerInnerRef} className="relative flex h-14 items-center justify-between px-4 md:px-6">
        {/* Left: mobile menu + desktop nav */}
        <div ref={leftGroupRef} className="flex items-center gap-1 md:flex-1">
          <Sheet open={navOpen} onOpenChange={setNavOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">打开菜单</span>
              </Button>
            </SheetTrigger>
            <SheetContent
              side="left"
              className="flex w-[280px] flex-col overflow-hidden p-0"
            >
              {/* Mobile nav drawer: 顶部导航列表 */}
              <div className="shrink-0 border-b border-border/60 p-4">
                <p className="mb-2 font-mono text-[10px] tracking-widest text-accent">
                  // NAVIGATION
                </p>
                <nav className="flex flex-col gap-1">
                  {siteConfig.nav.map((item) => {
                    const active = pathname === item.href
                    return (
                      <Button
                        key={item.href}
                        variant={active ? "secondary" : "ghost"}
                        size="sm"
                        className={cn(
                          "justify-start",
                          active
                            ? "font-medium"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                        asChild
                      >
                        <Link href={item.href}>{item.name}</Link>
                      </Button>
                    )
                  })}
                </nav>
                {aspectRatio < ASPECT_RATIO_THRESHOLD && (
                  <div className="mt-3 flex justify-center">
                    <WeatherWidget />
                  </div>
                )}
              </div>
              <Sidebar danmaku={danmaku} className="min-h-0 flex-1" />
            </SheetContent>
          </Sheet>

          <Link
            href="/"
            className="font-display text-lg tracking-tight lg:hidden"
          >
            {siteConfig.name}
          </Link>

          <nav className="hidden items-center gap-1 lg:flex">
            {siteConfig.nav.map((item) => {
              const active = pathname === item.href
              return (
                <Button
                  key={item.href}
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "group relative text-sm transition-colors",
                    active
                      ? "font-medium text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  asChild
                >
                  <Link href={item.href}>
                    {item.name}
                    <span
                      className={cn(
                        "absolute bottom-1 left-1/2 h-0.5 w-0 -translate-x-1/2 rounded-full bg-accent transition-all duration-300",
                        active && "w-4",
                        !active && "group-hover:w-4"
                      )}
                    />
                  </Link>
                </Button>
              )
            })}
          </nav>
        </div>

        {/* Right Actions */}
        <div ref={rightGroupRef} className="flex items-center gap-1 md:flex-1 md:justify-end">
          <MusicPlayerMini />
          {wideLayout ? (
            <>
              <AppearanceToggle />
              <FlowToggle />
            </>
          ) : (
            <NavbarMore />
          )}
          <SearchCommand posts={posts} />
          <ThemeToggle />

          {status === "loading" ? (
            <Button variant="ghost" size="icon" disabled>
              <Loader2 className="h-[1.2rem] w-[1.2rem] animate-spin" />
            </Button>
          ) : status === "authenticated" ? (
            <UserMenu unreadCount={unreadCount} />
          ) : (
            <Button variant="ghost" size="icon" asChild>
              <Link href={loginHref} aria-label="登录">
                <User className="h-[1.2rem] w-[1.2rem]" />
              </Link>
            </Button>
          )}
        </div>

        {/* Center: 天气/时间——视觉居中优先；实测空间不足时收起（淡入淡出） */}
        <div
          ref={weatherRef}
          className={cn(
            "absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 transition-opacity duration-200 lg:block",
            weatherFits ? "opacity-100" : "invisible opacity-0"
          )}
        >
          <WeatherWidget />
        </div>
      </div>

      {/* 下缘热区：悬浮提示单击可收起顶栏（随顶栏一起滑出视口） */}
      <button
        type="button"
        onClick={collapse}
        aria-label="收起导航栏"
        className="group absolute inset-x-0 top-full z-10 flex h-3 cursor-pointer items-start justify-center"
      >
        <span
          aria-hidden
          className="flex -translate-y-1 items-center gap-1 rounded-full border border-border/60 bg-background/95 px-2 py-0.5 text-[10px] leading-none text-muted-foreground opacity-0 shadow-sm backdrop-blur-md transition-all duration-200 group-hover:translate-y-1 group-hover:opacity-100"
        >
          <ChevronUp className="h-3 w-3" />
          单击收起导航栏
        </span>
      </button>
    </header>
  )
}
