"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSession } from "next-auth/react"
import { Loader2, Menu, User } from "lucide-react"
import { useEffect, useState } from "react"

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

  useEffect(() => {
    const current = window.location.pathname + window.location.search
    setLoginHref(`/login?callbackUrl=${encodeURIComponent(current)}`)
  }, [pathname])

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl">
      <div className="relative flex h-14 items-center justify-between px-4 md:px-6">
        {/* Left: mobile menu + desktop nav */}
        <div className="flex items-center gap-1 md:flex-1">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">打开菜单</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[280px] p-0">
              <Sidebar danmaku={danmaku} />
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
        <div className="flex items-center gap-1 md:flex-1 md:justify-end">
          <MusicPlayerMini />
          <AppearanceToggle />
          <FlowToggle />
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
      </div>
    </header>
  )
}
