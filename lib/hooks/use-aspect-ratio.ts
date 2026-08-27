"use client"

import { useEffect, useState } from "react"

interface Viewport {
  width: number
  height: number
  aspectRatio: number
}

const SSR_VIEWPORT: Viewport = {
  width: 1280,
  height: 800,
  aspectRatio: 1.6,
}

/**
 * 视口信息。重要：SSR 与客户端首帧必须返回相同值（固定常量），
 * 挂载后再用 useEffect 更新为真实窗口——否则 hydration 时
 * WeatherBar 等依赖长宽比的地方会出现分支不一致（水合失败）。
 */
export function useAspectRatio(): Viewport {
  const [viewport, setViewport] = useState<Viewport>(SSR_VIEWPORT)

  useEffect(() => {
    function update() {
      setViewport({
        width: window.innerWidth,
        height: window.innerHeight,
        aspectRatio: window.innerWidth / window.innerHeight,
      })
    }

    update()
    window.addEventListener("resize", update)
    return () => window.removeEventListener("resize", update)
  }, [])

  return viewport
}

export const ASPECT_RATIO_THRESHOLD = 1.61
export const DRAWER_BREAKPOINT = 1024
