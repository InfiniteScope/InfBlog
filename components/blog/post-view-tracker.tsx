"use client"

import { useEffect } from "react"
import { POST_STATS_EVENT } from "@/components/blog/post-stat-badges"

/**
 * 文章详情页浏览计数：挂载后 POST 一次（服务端 60s/IP 限流防刷）。
 * 返回最新统计并通过事件广播给页面其他部分（如浮动操作组）。
 */
export function PostViewTracker({ slug }: { slug: string }) {
  useEffect(() => {
    const key = `post-viewed:${slug}`
    // sessionStorage 去重：同一标签页会话内只计一次
    if (sessionStorage.getItem(key)) return
    sessionStorage.setItem(key, "1")

    fetch(`/api/posts/${encodeURIComponent(slug)}/view`, { method: "POST" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && typeof data.totalViews === "number") {
          window.dispatchEvent(
            new CustomEvent(POST_STATS_EVENT, {
              detail: {
                totalViews: data.totalViews,
                monthViews: data.monthViews,
                likes: data.likes,
                favorites: data.favorites,
              },
            })
          )
        }
      })
      .catch(() => {})
  }, [slug])

  return null
}
