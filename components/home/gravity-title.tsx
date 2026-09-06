"use client"

import { useEffect, useRef } from "react"

interface GravityTitleProps {
  text: string
  className?: string
}

/**
 * 引力波标题：逐字母测量与 hero 月亮（#hero-moon）的距离，
 * 按引力平方反比把字母向月心弯折（--gx/--gy/--gr），
 * 再以距离为相位缓慢脉动（gravity-wave），如引力波扫过。
 */
export function GravityTitle({ text, className }: GravityTitleProps) {
  const ref = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const compute = () => {
      const moon = document.getElementById("hero-moon")
      // 月亮未挂载或被隐藏（display:none 尺寸为 0）时保持原位
      if (!moon || !el.isConnected) return
      const m = moon.getBoundingClientRect()
      if (!m.width) return
      const mcx = m.left + m.width / 2
      const mcy = m.top + m.height / 2
      const R = m.width / 2

      el.querySelectorAll<HTMLElement>(".gravity-letter").forEach((letter) => {
        const r = letter.getBoundingClientRect()
        const lx = r.left + r.width / 2
        const ly = r.top + r.height / 2
        const dx = mcx - lx
        const dy = mcy - ly
        const d = Math.max(Math.hypot(dx, dy), 1)
        // 平方反比引力，月缘处最强，远处趋零
        const pull = Math.min(34, Math.pow((R * 1.35) / d, 2) * 24)
        const ux = dx / d
        const uy = dy / d
        letter.style.setProperty("--gx", `${(ux * pull).toFixed(1)}px`)
        letter.style.setProperty("--gy", `${(uy * pull).toFixed(1)}px`)
        letter.style.setProperty("--gr", `${(ux * pull * 0.14).toFixed(2)}deg`)
        letter.style.setProperty("--gd", `${(d / 900).toFixed(2)}s`)
      })
    }

    compute()
    const raf = requestAnimationFrame(compute) // 等 portal 月亮挂载
    const timer = setTimeout(compute, 300) // 等字体/布局稳定
    document.fonts?.ready.then(compute).catch(() => {})
    window.addEventListener("resize", compute)
    /* 月亮被鼠标牵拉时，字母引力实时跟随 */
    const onMoonMove = () => compute()
    window.addEventListener("hero-moon-move", onMoonMove)
    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(timer)
      window.removeEventListener("resize", compute)
      window.removeEventListener("hero-moon-move", onMoonMove)
    }
  }, [])

  return (
    <h1 ref={ref} className={className} aria-label={text}>
      {text.split("").map((ch, i) => (
        <span key={i} aria-hidden className="gravity-letter">
          {ch}
        </span>
      ))}
    </h1>
  )
}
