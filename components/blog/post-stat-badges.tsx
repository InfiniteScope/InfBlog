"use client"

import { useEffect, useState } from "react"
import { Bookmark, Eye, Heart } from "lucide-react"

export const POST_STATS_EVENT = "post-stats:update"

export interface PostStatsPayload {
  totalViews: number
  monthViews: number
  likes: number
  favorites: number
}

/**
 * 文章头部统计徽标（👁 总/月 · ❤ 点赞 · 🔖 收藏）。
 * - 首帧用服务端传入的初始值（避免 SSR/客户端差异）
 * - 挂载后拉取一次 API；此后监听 POST_STATS_EVENT，
 *   浮动按钮点赞/收藏后同步更新，无需刷新页面
 */
export function PostStatBadges({
  slug,
  initial,
}: {
  slug: string
  initial: PostStatsPayload
}) {
  const [stats, setStats] = useState<PostStatsPayload>(initial)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    let cancelled = false

    fetch(`/api/posts/${encodeURIComponent(slug)}/view`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data && typeof data.likes === "number") {
          setStats((prev) => ({ ...prev, ...data }))
        }
      })
      .catch(() => {})

    const onUpdate = (e: Event) => {
      const detail = (e as CustomEvent<PostStatsPayload>).detail
      if (detail) setStats((prev) => ({ ...prev, ...detail }))
    }
    window.addEventListener(POST_STATS_EVENT, onUpdate)
    return () => {
      cancelled = true
      window.removeEventListener(POST_STATS_EVENT, onUpdate)
    }
  }, [slug])

  if (!mounted) {
    return (
      <span className="flex items-center gap-4">
        <span className="flex items-center gap-1" title="总浏览量 / 本月浏览量">
          <Eye className="h-4 w-4" />
          {initial.totalViews} / {initial.monthViews}
        </span>
        <span className="flex items-center gap-1" title="点赞数">
          <Heart className="h-4 w-4" />
          {initial.likes}
        </span>
        <span className="flex items-center gap-1" title="收藏数">
          <Bookmark className="h-4 w-4" />
          {initial.favorites}
        </span>
      </span>
    )
  }

  return (
    <span className="flex items-center gap-4">
      <span className="flex items-center gap-1" title="总浏览量 / 本月浏览量">
        <Eye className="h-4 w-4" />
        {stats.totalViews} / {stats.monthViews}
      </span>
      <span className="flex items-center gap-1" title="点赞数">
        <Heart className="h-4 w-4" />
        {stats.likes}
      </span>
      <span className="flex items-center gap-1" title="收藏数">
        <Bookmark className="h-4 w-4" />
        {stats.favorites}
      </span>
    </span>
  )
}
