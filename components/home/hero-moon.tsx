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

/** 星尘（月周散布的微粒，明灭呼吸） */
const STARS: {
  left: string
  top: string
  size: number
  accent?: boolean
  delay: string
}[] = [
  { left: "-14%", top: "20%", size: 3, accent: true, delay: "0s" },
  { left: "-6%", top: "72%", size: 2, delay: "0.8s" },
  { left: "8%", top: "98%", size: 2.5, accent: true, delay: "1.6s" },
  { left: "58%", top: "-14%", size: 2, delay: "0.4s" },
  { left: "86%", top: "-8%", size: 3, accent: true, delay: "2.2s" },
  { left: "112%", top: "10%", size: 2, delay: "1.1s" },
  { left: "116%", top: "62%", size: 2.5, accent: true, delay: "2.8s" },
  { left: "-18%", top: "50%", size: 2, delay: "3.3s" },
]

/**
 * 探索主题 hero 的月亮：portal 到 body 的独立图层（视口坐标系，
 * 收起侧栏不偏移），z-20 高于 hero 文字（月食交叠）。
 * 鼠标靠近时被引力向指针方向牵拉（弹簧回复）；位移时广播
 * `hero-moon-move` 供引力文字实时重算。
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

  /* 月亮位移 → 引力文字重算（事件很轻，监听器自行决定节流） */
  useMotionValueEvent(sx, "change", () => {
    window.dispatchEvent(new CustomEvent("hero-moon-move"))
  })

  if (!mounted) return null

  return createPortal(
    <motion.div
      className="v2-only v2-moon-layer"
      style={{ transform }}
      aria-hidden
    >
      <div className="v2-moon" id="hero-moon">
        <span className="v2-moon-bead-orbit">
          <span className="v2-moon-bead" />
        </span>
        {STARS.map((s, i) => (
          <span
            key={i}
            className={s.accent ? "v2-moon-star is-accent" : "v2-moon-star"}
            style={{
              left: s.left,
              top: s.top,
              width: s.size,
              height: s.size,
              animationDelay: s.delay,
            }}
          />
        ))}
      </div>
    </motion.div>,
    document.body
  )
}
