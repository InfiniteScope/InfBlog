"use client"

import { useEffect, useRef } from "react"

import { createMoonScene } from "@/components/theme/moon-scene"

interface HeroMoonCanvasProps {
  text: string
}

/**
 * 探索主题 hero 的 WebGL 场景（用户提供的 moonshot 复刻原型改造）：
 * 日食月 + 棱镜彩虹光束 + shader 内渲染的折射标题 + 扫描线颗粒，
 * 铺满整个 hero（absolute inset-0）。WebGL 不可用时保持静默——
 * HTML 标题（.v2-hero-title）继续作为兜底显示（.webgl-on 才隐藏）。
 */
export function HeroMoonCanvas({ text }: HeroMoonCanvasProps) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const scene = createMoonScene(canvas, { text, parallax: true })
    if (!scene) return

    /* 场景激活：隐藏 HTML 标题（由 shader 渲染），hero 兜底背景色可见 */
    const night = canvas.closest(".v2-hero-night")
    night?.classList.add("webgl-on")

    /* 离屏（滚出视口 / 主题树隐藏）时暂停渲染 */
    const io = new IntersectionObserver(
      (entries) => scene.setPaused(!entries[0]?.isIntersecting),
      { threshold: 0 }
    )
    io.observe(canvas)

    return () => {
      io.disconnect()
      night?.classList.remove("webgl-on")
      scene.dispose()
    }
  }, [text])

  return (
    <canvas
      ref={ref}
      id="hero-moon-canvas"
      aria-hidden
      className="v2-hero-canvas"
    />
  )
}
