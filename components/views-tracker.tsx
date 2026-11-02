"use client"

import { useEffect } from "react"

const TRACKED_KEY = "infblog-viewed"

/**
 * Site-wide page view tracker. Counts a page load once per browser session
 * (sessionStorage guard), affecting total/week/today on every page —
 * not just the homepage.
 */
export function ViewsTracker() {
  useEffect(() => {
    if (sessionStorage.getItem(TRACKED_KEY) === "1") return

    // path + 外部来源（document.referrer）。Referer 头拿到的是本页 URL，
    // 所以来源只能由客户端带上来；空字符串 = 直接访问。
    const payload = JSON.stringify({
      path: window.location.pathname,
      referrer: document.referrer || null,
    })

    fetch("/api/views", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
      keepalive: true,
    })
      .catch(() => {
        // ignore; counting is best-effort
      })
      .finally(() => {
        try {
          sessionStorage.setItem(TRACKED_KEY, "1")
        } catch {
          // storage unavailable; will just recount on next load
        }
      })
  }, [])

  return null
}
