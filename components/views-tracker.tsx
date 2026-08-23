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
    if (sessionStorage.getItem(TRACKED_KEY) !== "1") {
      fetch("/api/views", { method: "POST" }).catch(() => {
        // ignore; counting is best-effort
      }).finally(() => {
        try {
          sessionStorage.setItem(TRACKED_KEY, "1")
        } catch {
          // storage unavailable; will just recount on next load
        }
      })
    }
  }, [])

  return null
}
