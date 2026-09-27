"use client"

import { useEffect, useRef } from "react"
import { toast } from "sonner"

/**
 * 阅读位置恢复：从书签链接进入（#bm-<锚点id> 或 #bm-<0~1百分比>）时
 * 跳转到上次保存的阅读位置。
 * 懒加载图片会推高页面 → 跳转后 0.8s/2s 各校正一次，抵消布局漂移。
 * 去重守卫：dev 的 StrictMode 双 effect / hashchange 连发时，2s 内同 payload 只执行一次。
 */
export function ReadingResume() {
  const lastRunRef = useRef<{ payload: string; at: number } | null>(null)
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([])

  useEffect(() => {
    const tryResume = () => {
      const hash = window.location.hash
      if (!hash.startsWith("#bm-")) return
      const payload = hash.slice(4)

      const now = Date.now()
      if (
        lastRunRef.current?.payload === payload &&
        now - lastRunRef.current.at < 2000
      ) {
        return
      }
      lastRunRef.current = { payload, at: now }

      const jump = () => {
        const anchorEl = document.getElementById(decodeURIComponent(payload))
        if (anchorEl) {
          anchorEl.scrollIntoView({ block: "start", behavior: "instant" })
          return
        }
        const percent = parseFloat(payload)
        if (!Number.isNaN(percent)) {
          const doc = document.documentElement
          const max = doc.scrollHeight - window.innerHeight
          window.scrollTo({ top: Math.max(0, percent * max), behavior: "instant" })
        }
      }

      jump()
      timeoutsRef.current.push(setTimeout(jump, 800))
      timeoutsRef.current.push(setTimeout(jump, 2000))
      toast.info("已回到书签位置", { toasterId: "bottom-toaster" })
    }

    tryResume()

    const onHashChange = () => tryResume()
    window.addEventListener("hashchange", onHashChange)
    return () => {
      window.removeEventListener("hashchange", onHashChange)
      timeoutsRef.current.forEach(clearTimeout)
      timeoutsRef.current = []
    }
  }, [])

  return null
}
