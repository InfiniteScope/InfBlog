"use client"

import { useEffect, useState } from "react"
import { createPortal } from "react-dom"

/**
 * 探索主题 hero 的月亮：portal 到 body，独立于内容流（图层靠下、
 * 视口坐标系），收起侧栏不偏移；仅在 lg+ 渲染（CSS 媒体查询兜底）。
 * 挂载于探索主题树，切到经典时随 ui-classic 隐藏。
 */
export function HeroMoon() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  if (!mounted) return null

  return createPortal(
    <div className="v2-only v2-moon-layer" aria-hidden>
      <div className="v2-moon" id="hero-moon" />
    </div>,
    document.body
  )
}
