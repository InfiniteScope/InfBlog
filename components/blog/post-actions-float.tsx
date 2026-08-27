"use client"

import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { useSession } from "next-auth/react"
import { AnimatePresence, motion } from "motion/react"
import { Bookmark, BookmarkCheck, Heart } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface PostActionsFloatProps {
  slug: string
  initialLikes: number
  initialFavorites?: number
}

/**
 * 文章详情页右下角固定操作组：点赞 + 收藏。
 * - 不随滚动移动（fixed），位于回到顶部按钮上方
 * - 点赞：无需登录，同访客同篇只计一次
 * - 收藏：需登录；未登录时在按钮旁展示提示，不强制跳转
 */
export function PostActionsFloat({
  slug,
  initialLikes,
  initialFavorites = 0,
}: PostActionsFloatProps) {
  const { status } = useSession()
  const [likes, setLikes] = useState(initialLikes)
  const [liked, setLiked] = useState(false)
  const [favorites, setFavorites] = useState(initialFavorites)
  const [favorited, setFavorited] = useState(false)
  const [showLoginHint, setShowLoginHint] = useState(false)
  const [likeBusy, setLikeBusy] = useState(false)
  const [favBusy, setFavBusy] = useState(false)
  const [mounted, setMounted] = useState(false)

  // 与服务端一致：首帧不渲染（null），挂载后再 portal——避免 hydration 不匹配
  useEffect(() => setMounted(true), [])

  // 初始状态：是否已赞 / 已收藏
  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const [statsRes, favRes] = await Promise.all([
          fetch(`/api/posts/${encodeURIComponent(slug)}/view`),
          fetch(`/api/posts/${encodeURIComponent(slug)}/favorite`),
        ])
        if (cancelled) return
        if (statsRes.ok) {
          const data = await statsRes.json()
          if (typeof data.favorites === "number") setFavorites(data.favorites)
          if (typeof data.likes === "number") setLikes(data.likes)
        }
        if (favRes.ok) {
          const data = await favRes.json()
          setFavorited(Boolean(data.favorited))
        }
      } catch {
        // 静默失败，保持初始值
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [slug])

  async function handleLike() {
    if (likeBusy) return
    setLikeBusy(true)
    try {
      const res = await fetch(`/api/posts/${encodeURIComponent(slug)}/like`, {
        method: "POST",
      })
      if (res.ok) {
        const data = await res.json()
        setLikes(data.likes)
        setLiked(Boolean(data.liked))
      }
    } catch {
      // ignore
    } finally {
      setLikeBusy(false)
    }
  }

  async function handleFavorite() {
    if (favBusy) return
    if (status !== "authenticated") {
      // 不粗暴跳登录：按钮旁展示提示
      setShowLoginHint(true)
      setTimeout(() => setShowLoginHint(false), 3200)
      return
    }
    setFavBusy(true)
    try {
      const res = await fetch(`/api/posts/${encodeURIComponent(slug)}/favorite`, {
        method: "POST",
      })
      if (res.ok) {
        const data = await res.json()
        setFavorited(Boolean(data.favorited))
        // 收藏/取消后计数更新（+1 / -1）
        setFavorites((prev) => Math.max(0, prev + (data.favorited ? 1 : -1)))
      } else if (res.status === 401) {
        setShowLoginHint(true)
        setTimeout(() => setShowLoginHint(false), 3200)
      }
    } catch {
      // ignore
    } finally {
      setFavBusy(false)
    }
  }

  // PageTransition 的 transform 会让 fixed 退化为 absolute（按钮被"冲到"页面底部），
  // 与留言框同样的坑：portal 到 body 脱离转场层，真正固定在视口右下角。
  // mounted 前与服务端一致（null），避免 hydration mismatch。
  if (!mounted || typeof document === "undefined") return null

  return createPortal(
    <div className="fixed bottom-20 right-6 z-40 flex flex-col items-end gap-3">
      {/* 未登录收藏提示（按钮左侧气泡） */}
      <AnimatePresence>
        {showLoginHint && (
          <motion.span
            initial={{ opacity: 0, x: 8, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 8, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="rounded-lg border border-border bg-background/95 px-3 py-1.5 text-xs text-muted-foreground shadow-md backdrop-blur-md"
          >
            请先登录，登陆后方可使用收藏
          </motion.span>
        )}
      </AnimatePresence>

      {/* 收藏 */}
      <Button
        variant="outline"
        size="sm"
        onClick={handleFavorite}
        disabled={favBusy}
        aria-label={favorited ? "取消收藏" : "收藏本文"}
        title={favorited ? "取消收藏" : "收藏本文"}
        className={cn(
          "h-11 gap-1.5 rounded-full border-border/60 bg-background/80 px-3 shadow-lg backdrop-blur-md transition-colors hover:border-accent/60 hover:bg-accent/10",
          favorited && "border-accent/70 text-accent"
        )}
      >
        {favorited ? (
          <BookmarkCheck className="h-5 w-5" />
        ) : (
          <Bookmark className="h-5 w-5" />
        )}
        <span className="min-w-4 text-xs font-medium tabular-nums">
          {favorites}
        </span>
      </Button>

      {/* 点赞 */}
      <Button
        variant="outline"
        size="sm"
        onClick={handleLike}
        disabled={likeBusy}
        aria-label={liked ? "取消点赞" : "点赞本文"}
        title={liked ? "取消点赞" : "点赞本文"}
        className={cn(
          "h-11 gap-1.5 rounded-full border-border/60 bg-background/80 px-3 shadow-lg backdrop-blur-md transition-colors hover:border-accent/60 hover:bg-accent/10",
          liked && "border-rose-400/70 text-rose-500"
        )}
      >
        <Heart className={cn("h-5 w-5", liked && "fill-rose-500")} />
        <span className="min-w-4 text-xs font-medium tabular-nums">{likes}</span>
      </Button>
      </div>,
    document.body
  )
}
