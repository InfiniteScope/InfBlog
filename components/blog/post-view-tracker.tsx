"use client"

import { useEffect } from "react"
import { POST_STATS_EVENT } from "@/components/blog/post-stat-badges"

/**
 * 内容详情页浏览计数：挂载后 POST 一次（服务端 10s/IP 限流防刷）。
 * 返回最新统计并通过事件广播给页面其他部分（如浮动操作组）。
 *
 * `type` 必须传对：sessionStorage 去重键与接口路径都按它区分。
 * （早期只按 slug 去重——若文章与档案同名，会互相抑制计数。）
 */
export function PostViewTracker({
  slug,
  type = "post",
}: {
  slug: string
  type?: "post" | "doc"
}) {
  useEffect(() => {
    const key = `viewed:${type}:${slug}`
    // sessionStorage 去重：同一标签页会话内只计一次
    if (sessionStorage.getItem(key)) return
    sessionStorage.setItem(key, "1")

    const endpoint =
      type === "doc"
        ? `/api/docs/${encodeURIComponent(slug)}/view`
        : `/api/posts/${encodeURIComponent(slug)}/view`

    fetch(endpoint, { method: "POST" })
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
  }, [slug, type])

  return null
}
