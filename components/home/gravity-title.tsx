"use client"

import { useEffect, useRef } from "react"

interface GravityTitleProps {
  text: string
  className?: string
}

/**
 * moonshot.ai 式 hero 标题：
 * 1. 引力层——逐字母测量与 hero 月亮（#hero-moon）的距离，按引力平方反比
 *    把字母向月心弯折（--gx/--gy/--gr），并以距离为相位缓慢脉动。
 * 2. liquify 层——同一标题的第二份拷贝（aria-hidden），经 #moon-liquify
 *    SVG filter（feTurbulence 位移场 + R/B 色散）做液态扭曲，再用以月心
 *    为圆心的径向 mask 限定：文字进入月盘半径 ≈1.4R 内"融化折射"
 *    （moonshot liquify 层：dist = max(0, 1 - d*4)，mix 0.21）。
 *    两层字母共用同一 compute()（.gravity-letter 全量匹配），像素级重合。
 */
export function GravityTitle({ text, className }: GravityTitleProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const root = ref.current
    if (!root) return

    const compute = () => {
      const moon = document.getElementById("hero-moon")
      // 月亮未挂载或被隐藏（display:none 尺寸为 0）时保持原位
      if (!moon || !root.isConnected) return
      const m = moon.getBoundingClientRect()
      if (!m.width) return
      const mcx = m.left + m.width / 2
      const mcy = m.top + m.height / 2
      const R = m.width / 2

      /* liquify mask 中心/半径跟随月心（相对标题容器） */
      const box = root.getBoundingClientRect()
      root.style.setProperty("--liq-x", `${(mcx - box.left).toFixed(1)}px`)
      root.style.setProperty("--liq-y", `${(mcy - box.top).toFixed(1)}px`)
      root.style.setProperty("--liq-r", `${(R * 1.4).toFixed(1)}px`)

      root.querySelectorAll<HTMLElement>(".gravity-letter").forEach((letter) => {
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
    /* 主题换肤（html.ui-classic 切换）会让月亮显隐/文字树显隐——随之重算，
       否则转场后 liquify mask 停在兜底值（表现为整行标题被扭曲） */
    const themeObserver = new MutationObserver(compute)
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    })
    /* 月亮被鼠标牵拉时，引力与 liquify mask 实时跟随 */
    const onMoonMove = () => compute()
    window.addEventListener("hero-moon-move", onMoonMove)
    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(timer)
      window.removeEventListener("resize", compute)
      themeObserver.disconnect()
      window.removeEventListener("hero-moon-move", onMoonMove)
    }
  }, [])

  return (
    <div ref={ref} className="relative">
      {/* SVG liquify filter：feTurbulence 位移场（低频横向拉丝 + 缓慢流动）
          + feDisplacementMap + R/B 通道反向偏移合成（moonshot chromab） */}
      <svg aria-hidden className="absolute h-0 w-0">
        <filter
          id="moon-liquify"
          x="-30%"
          y="-30%"
          width="160%"
          height="160%"
          colorInterpolationFilters="sRGB"
        >
          <feTurbulence
            type="turbulence"
            baseFrequency="0.0022 0.02"
            numOctaves="2"
            seed="8"
            result="warp"
          >
            <animate
              attributeName="baseFrequency"
              dur="26s"
              values="0.0022 0.02;0.0028 0.017;0.0022 0.02"
              repeatCount="indefinite"
            />
          </feTurbulence>
          <feDisplacementMap
            in="SourceGraphic"
            in2="warp"
            scale="30"
            xChannelSelector="R"
            yChannelSelector="G"
            result="disp"
          />
          <feOffset in="disp" dx="2.6" result="offR" />
          <feColorMatrix
            in="offR"
            values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0"
            result="chR"
          />
          <feOffset in="disp" dx="-2.6" result="offB" />
          <feColorMatrix
            in="offB"
            values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0"
            result="chB"
          />
          <feColorMatrix
            in="disp"
            values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0"
            result="chG"
          />
          <feBlend in="chR" in2="chG" mode="screen" result="m1" />
          <feBlend in="m1" in2="chB" mode="screen" />
        </filter>
      </svg>

      <h1 aria-label={text} className={className}>
        {text.split("").map((ch, i) => (
          <span key={i} aria-hidden className="gravity-letter">
            {ch}
          </span>
        ))}
      </h1>

      <div aria-hidden className="hero-liquify-wrap">
        <h1 className={className}>
          {text.split("").map((ch, i) => (
            <span key={i} className="gravity-letter">
              {ch}
            </span>
          ))}
        </h1>
      </div>
    </div>
  )
}
