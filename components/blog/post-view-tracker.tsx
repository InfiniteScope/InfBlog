"use client"

import { useEffect } from "react"

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

    fetch(`/api/posts/${encodeURIComponent(slug)}/view`, { method: "POST" }).catch(
      () => {}
    )
  }, [slug])

  return null
}
