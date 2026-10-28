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
 * 内容头部统计徽标（Eye 总/月 · Heart 点赞 · Bookmark 收藏）。
 * - 首帧用服务端传入的初始值（避免 SSR/客户端差异）
 * - 挂载后拉取一次 API；此后监听 POST_STATS_EVENT，
 *   浮动按钮点赞/收藏后同步更新，无需刷新页面
 * - 文库档案只有阅读量，用 `ViewCountBadge`（见下）
 */
export function PostStatBadges({
  slug,
  initial,
  type = "post",
}: {
  slug: string
  initial: PostStatsPayload
  type?: "post" | "doc"
}) {
  const [stats, setStats] = useState<PostStatsPayload>(initial)
  const [mounted, setMounted] = useState(false)

  // SSR 已用同一份数据算好 initial（页面是动态渲染，渲染时就是最新值），
  // 挂载后再拉一次纯属重复请求 —— 这里只监听点赞/收藏后的同步事件。
  useEffect(() => {
    setMounted(true)

    const onUpdate = (e: Event) => {
      const detail = (e as CustomEvent<PostStatsPayload>).detail
      if (detail) setStats((prev) => ({ ...prev, ...detail }))
    }
    window.addEventListener(POST_STATS_EVENT, onUpdate)
    return () => {
      window.removeEventListener(POST_STATS_EVENT, onUpdate)
    }
  }, [])

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

/**
 * 只显示阅读量的徽标（文库档案用：档案没有点赞/收藏）。
 * 同样首帧用服务端初始值、挂载后拉一次、并监听同一事件同步。
 */
export function ViewCountBadge({
  slug,
  initial,
  type = "doc",
  className,
}: {
  slug: string
  initial: { totalViews: number; monthViews: number }
  type?: "post" | "doc"
  className?: string
}) {
  const [stats, setStats] = useState(initial)

  // 同上：initial 来自 SSR，不再在挂载后重复请求
  useEffect(() => {
    const onUpdate = (e: Event) => {
      const detail = (e as CustomEvent<PostStatsPayload>).detail
      if (detail && typeof detail.totalViews === "number") {
        setStats({
          totalViews: detail.totalViews,
          monthViews: detail.monthViews ?? 0,
        })
      }
    }
    window.addEventListener(POST_STATS_EVENT, onUpdate)
    return () => {
      window.removeEventListener(POST_STATS_EVENT, onUpdate)
    }
  }, [])

  return (
    <span
      className={className ?? "flex items-center gap-1"}
      title="总浏览量 / 本月浏览量"
    >
      <Eye className="h-3.5 w-3.5" />
      {stats.totalViews} / {stats.monthViews}
    </span>
  )
}
