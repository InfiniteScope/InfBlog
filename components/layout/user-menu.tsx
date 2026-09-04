"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useSession, signOut } from "next-auth/react"
import { Bell, BookMarked, Bookmark, Box, LogOut, Settings, Trophy, User } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { CollectiblesDialog } from "@/components/collectibles/collectibles-dialog"
import { FavoritesDialog } from "@/components/blog/favorites-dialog"
import {
  COLLECTIBLE_REVEAL_EVENT,
  fetchMyCollectibles,
} from "@/lib/collectibles-client"
import type { CollectibleId } from "@/lib/collectibles"

export function UserMenu({ unreadCount = 0 }: { unreadCount?: number }) {
  const { data: session, update } = useSession()
  const user = session?.user
  const canManage =
    user?.role === "OWNER" || user?.role === "ADMIN"
  const isOwner = user?.role === "OWNER"

  // 角色/资料由后台修改后，回到页面时自动刷新 JWT（后台升级为 ADMIN 即可见）
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === "visible") void update()
    }
    const onFocus = () => void update()
    window.addEventListener("focus", onFocus)
    document.addEventListener("visibilitychange", refresh)
    return () => {
      window.removeEventListener("focus", onFocus)
      document.removeEventListener("visibilitychange", refresh)
    }
  }, [update])

  const [collectibles, setCollectibles] = useState<CollectibleId[]>([])
  const [galleryOpen, setGalleryOpen] = useState(false)
  const [catalogOpen, setCatalogOpen] = useState(false)
  const [favoritesOpen, setFavoritesOpen] = useState(false)

  useEffect(() => {
    if (!user?.id) return
    let cancelled = false
    const refresh = () => {
      fetchMyCollectibles().then((items) => {
        if (!cancelled) setCollectibles(items)
      })
    }
    refresh()
    // 获得新藏品后立刻刷新列表（无需手动刷新）
    window.addEventListener(COLLECTIBLE_REVEAL_EVENT, refresh)
    return () => {
      cancelled = true
      window.removeEventListener(COLLECTIBLE_REVEAL_EVENT, refresh)
    }
  }, [user?.id])

  const displayName = user?.nickname || user?.name || "用户"
  const fallback = displayName.slice(0, 2)

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="relative rounded-full">
            <Avatar className="h-8 w-8">
              <AvatarImage src={user?.image || undefined} alt={displayName} />
              <AvatarFallback className="text-xs font-medium">
                {fallback}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">{displayName}</p>
              {user?.name && user.name !== displayName && (
                <p className="text-xs leading-none text-muted-foreground">
                  {user.name}
                </p>
              )}
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/messages" className="cursor-pointer">
              <Bell className="mr-2 h-4 w-4" />
              消息
              {unreadCount > 0 && (
                <span className="ml-auto rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-medium text-accent-foreground">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault()
              setFavoritesOpen(true)
            }}
            className="cursor-pointer"
          >
            <Bookmark className="mr-2 h-4 w-4" />
            我的收藏
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/resources/mine" className="cursor-pointer">
              <Box className="mr-2 h-4 w-4" />
              资源管理
            </Link>
          </DropdownMenuItem>
          {collectibles.length > 0 && (
            <DropdownMenuItem
              onSelect={(e) => {
                e.preventDefault()
                setGalleryOpen(true)
              }}
              className="cursor-pointer"
            >
              <Trophy className="mr-2 h-4 w-4" />
              网站藏品
              <span className="ml-auto text-[10px] text-muted-foreground">
                ×{collectibles.length}
              </span>
            </DropdownMenuItem>
          )}
          {isOwner && (
            <DropdownMenuItem
              onSelect={(e) => {
                e.preventDefault()
                setCatalogOpen(true)
              }}
              className="cursor-pointer"
            >
              <BookMarked className="mr-2 h-4 w-4" />
              藏品图鉴
            </DropdownMenuItem>
          )}
          <DropdownMenuItem asChild>
            <Link href="/profile" className="cursor-pointer">
              <User className="mr-2 h-4 w-4" />
              个人资料
            </Link>
          </DropdownMenuItem>
            {canManage && (
              <DropdownMenuItem asChild>
                <Link href="/admin" className="cursor-pointer">
                  <Settings className="mr-2 h-4 w-4" />
                  管理
                </Link>
              </DropdownMenuItem>
            )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => signOut({ callbackUrl: "/" })}
            className="cursor-pointer text-destructive focus:text-destructive"
          >
            <LogOut className="mr-2 h-4 w-4" />
            退出登录
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <FavoritesDialog open={favoritesOpen} onOpenChange={setFavoritesOpen} />
      <CollectiblesDialog
        open={galleryOpen}
        onOpenChange={setGalleryOpen}
        own={collectibles}
      />
      <CollectiblesDialog
        open={catalogOpen}
        onOpenChange={setCatalogOpen}
        own={collectibles}
        catalog
      />
    </>
  )
}
