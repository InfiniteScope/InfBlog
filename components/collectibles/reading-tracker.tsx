"use client"

import { useEffect, useRef } from "react"
import { useSession } from "next-auth/react"

import { claimCollectible, notifyCollectible } from "@/lib/collectibles-client"

const READER_SECONDS = 30 * 60
const TICK = 30

/**
 * 挂在博客文章页。累计阅读时长（页面可见 + 用户活跃）到 30min 授予
 * "Reader...?" 藏品。进度存 localStorage，跨页面累计。
 */
export function ReadingTracker() {
  const { status } = useSession()
  const lastActivityRef = useRef(Date.now())

  useEffect(() => {
    if (status !== "authenticated") return
    const KEY = "collectible:reader:seconds"
    const FLAG = "collectible:reader:claimed"
    if (localStorage.getItem(FLAG)) return

    const activityEvents = ["pointermove", "keydown", "scroll", "click"]
    const onActivity = () => {
      lastActivityRef.current = Date.now()
    }
    const visibility = () => document.visibilityState === "visible"

    activityEvents.forEach((name) =>
      window.addEventListener(name, onActivity, { passive: true })
    )

    const interval = setInterval(async () => {
      // count only when visible and there was activity within the last 60s
      if (!visibility()) return
      if (Date.now() - lastActivityRef.current > 60_000) return
      const elapsed = Number(localStorage.getItem(KEY) || 0)
      const total = elapsed + TICK
      localStorage.setItem(KEY, String(total))
      if (total >= READER_SECONDS) {
        const result = await claimCollectible("reader")
        if (result === "claimed") {
          notifyCollectible("reader")
          localStorage.setItem(FLAG, "1")
          localStorage.setItem(KEY, "0")
        } else if (result === "owned") {
          localStorage.setItem(FLAG, "1")
          localStorage.setItem(KEY, "0")
        }
      }
    }, TICK * 1000)

    return () => {
      clearInterval(interval)
      activityEvents.forEach((name) =>
        window.removeEventListener(name, onActivity)
      )
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status])

  return null
}
