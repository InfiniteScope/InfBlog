"use client"

import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useMotionValueEvent,
  useSpring,
} from "motion/react"

/**
 * 探索主题 hero 的月亮：portal 到 body 的独立图层（视口坐标系，
 * 收起侧栏不偏移），z-20 高于 hero 文字（月食交叠）。
 * 视觉严格参照 moonshot.ai hero 的日食月（纯黑盘 + 细白环弧巡游）。
 * 鼠标靠近时被引力向指针方向牵拉（弹簧回复）；位移时广播
 * `hero-moon-move` 供引力/liquify 文字实时重算。
 *
 * 结构：motion 层（鼠标引力位移）> .v2-moon-rise（转场月升/碎裂由
 * 主题转场引擎用 WAAPI 驱动——转场与首页共用这同一个 DOM 月亮，
 * 不再另画 canvas 副本）> .v2-moon（#hero-moon，CSS 绘制本体）。
 */
export function HeroMoon() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const mx = useMotionValue(0)
  const my = useMotionValue(0)
  const sx = useSpring(mx, { stiffness: 42, damping: 14 })
  const sy = useSpring(my, { stiffness: 42, damping: 14 })
  const transform = useMotionTemplate`translate(${sx}px, ${sy}px)`

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

    const onMove = (e: MouseEvent) => {
      const moon = document.getElementById("hero-moon")
      if (!moon) return
      const r = moon.getBoundingClientRect()
      if (!r.width) return
      const mcx = r.left + r.width / 2
      const mcy = r.top + r.height / 2
      const dx = e.clientX - mcx
      const dy = e.clientY - mcy
      const d = Math.max(Math.hypot(dx, dy), 1)
      /* 引力牵拉：越近越强，上限 26px */
      const pull = Math.min(26, Math.pow((r.width * 0.9) / d, 2) * 26)
      mx.set((dx / d) * pull)
      my.set((dy / d) * pull)
    }
    const onLeave = () => {
      mx.set(0)
      my.set(0)
    }

    window.addEventListener("mousemove", onMove)
    document.documentElement.addEventListener("mouseleave", onLeave)
    return () => {
      window.removeEventListener("mousemove", onMove)
      document.documentElement.removeEventListener("mouseleave", onLeave)
    }
  }, [mx, my])

  /* 月亮位移 → 引力/liquify 文字重算（事件很轻，监听器自行决定节流） */
  useMotionValueEvent(sx, "change", () => {
    window.dispatchEvent(new CustomEvent("hero-moon-move"))
  })

  if (!mounted) return null

  return createPortal(
    <motion.div
      className="v2-moon-layer"
      style={{ transform }}
      aria-hidden
    >
      <div className="v2-moon-rise" id="hero-moon-rise">
        <div className="v2-moon" id="hero-moon" />
      </div>
    </motion.div>,
    document.body
  )
}
