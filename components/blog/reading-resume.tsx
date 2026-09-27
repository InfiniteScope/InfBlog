"use client"

import { useEffect } from "react"
import { toast } from "sonner"

/**
 * 阅读位置恢复：从书签链接进入（#bm-<锚点id> 或 #bm-<0~1百分比>）时
 * 跳转到上次保存的阅读位置。
 * 懒加载图片会推高页面 → 跳转后 0.8s/2s 各校正一次，抵消布局漂移。
 * 同页内点击书签链接（hashchange，不重挂载）也会触发跳转。
 */
export function ReadingResume() {
  useEffect(() => {
    const tryResume = () => {
      const hash = window.location.hash
      if (!hash.startsWith("#bm-")) return false

      const payload = hash.slice(4)

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
      setTimeout(jump, 800)
      setTimeout(jump, 2000)
      toast.info("已回到书签位置", { toasterId: "bottom-toaster" })
      return true
    }

    // 首次挂载时（整页加载）尝试一次
    tryResume()

    const onHashChange = () => tryResume()
    window.addEventListener("hashchange", onHashChange)
    return () => window.removeEventListener("hashchange", onHashChange)
  }, [])

  return null
}
