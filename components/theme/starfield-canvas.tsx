"use client"

import { useEffect, useRef } from "react"

/** 确定性伪随机（同一星野每次一致） */
function rand(seed: number) {
  let s = seed
  return () => {
    s = (s * 16807 + 19487171) % 2147483647
    return s / 2147483647
  }
}

interface Star {
  x: number
  y: number
  r: number
  baseA: number
  color: string
  period: number
  phase: number
  amp: number
}

interface HeroStar {
  x: number
  y: number
  r: number
  color: string
}

interface BandGlow {
  x: number
  y: number
  rx: number
  ry: number
  rot: number
  a: number
}

/**
 * 程序化星野（探索主题专属，深色/非经典/非心流时显示）：
 * - 银河带：对角线 + 侧向高斯散布 + 结点式宽度/亮度起伏 + 暗尘埃巷
 * - 约 260 颗星：位置种子随机（泊松+成团），亮度幂律分布（多暗少亮），
 *   色温抽样（白/蓝白/暖黄/橙），**每颗星独立周期与相位闪烁**
 * - 3 颗主角星：大光晕 + 实核 + 十字衍射芒
 * - 30fps 即可（闪烁极低频）；reduced-motion 画一帧静态即停
 */
export function StarfieldCanvas() {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    let W = 0
    let H = 0
    let stars: Star[] = []
    let heroes: HeroStar[] = []
    let bandGlows: BandGlow[] = []
    let lanes: BandGlow[] = []
    let raf = 0
    let frameNo = 0

    const build = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      W = window.innerWidth
      H = window.innerHeight
      canvas.width = Math.round(W * dpr)
      canvas.height = Math.round(H * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      const rng = rand(20261007)
      const base = Math.min(W, H)

      /* 银河带：从左下向右上（略弯）的对角轴 */
      const A = { x: W * 0.02, y: H * 0.96 }
      const B = { x: W * 0.96, y: H * 0.04 }
      const dirX = B.x - A.x
      const dirY = B.y - A.y
      const dirLen = Math.hypot(dirX, dirY)
      const normX = -dirY / dirLen
      const normY = dirX / dirLen
      const bandRot = Math.atan2(dirY, dirX)

      /* 近似正态（三次均匀和） */
      const gauss = () => (rng() + rng() + rng() - 1.5) * 1.4

      /* 色温抽样 */
      const pickColor = () => {
        const p = rng()
        if (p < 0.66) return "rgba(240,244,250,"
        if (p < 0.82) return "rgba(210,226,248,"
        if (p < 0.92) return "rgba(255,240,214,"
        return "rgba(255,214,180,"
      }

      const mkStar = (x: number, y: number, boost = 1): Star => ({
        x,
        y,
        r: 0.4 + Math.pow(rng(), 3) * 1.2 * boost,
        baseA: Math.min((0.1 + Math.pow(rng(), 2) * 0.55) * boost, 0.85),
        color: pickColor(),
        period: 4 + rng() * 10,
        phase: rng() * Math.PI * 2,
        amp: 0.2 + rng() * 0.35,
      })

      stars = []
      /* 带内尘埃：沿轴均匀取 s，侧向高斯散布，宽度结点式起伏 */
      for (let i = 0; i < 170; i++) {
        const s = rng()
        const knot = 0.5 + 0.9 * Math.abs(Math.sin(s * 9.3 + 1.7) * Math.sin(s * 4.1 + 0.4))
        const lat = gauss() * base * 0.05 * knot
        const x = A.x + dirX * s + normX * lat
        const y = A.y + dirY * s + normY * lat
        if (x < -20 || x > W + 20 || y < -20 || y > H + 20) continue
        stars.push(mkStar(x, y, 1))
      }
      /* 背景散星：全屏泊松（允许少量落在带内，自然如此） */
      for (let i = 0; i < 90; i++) {
        stars.push(mkStar(rng() * W, rng() * H, 0.9))
      }

      /* 主角星：带内一颗、带外两颗（光晕 + 衍射芒） */
      const h1s = 0.44 + (rng() - 0.5) * 0.06
      heroes = [
        {
          x: A.x + dirX * h1s,
          y: A.y + dirY * h1s,
          r: 2.2,
          color: "rgba(255,255,255,",
        },
        {
          x: W * (0.72 + rng() * 0.12),
          y: H * (0.14 + rng() * 0.12),
          r: 2.0,
          color: "rgba(208,230,248,",
        },
        {
          x: W * (0.1 + rng() * 0.12),
          y: H * (0.66 + rng() * 0.14),
          r: 1.9,
          color: "rgba(255,255,255,",
        },
      ]

      /* 银河光晕：沿轴 9 块软椭圆（亮度结点式起伏） */
      bandGlows = []
      for (let i = 0; i < 9; i++) {
        const s = i / 8 + (rng() - 0.5) * 0.05
        const knotA = 0.55 + 0.8 * Math.abs(Math.sin(s * 8.1 + 0.9))
        bandGlows.push({
          x: A.x + dirX * s,
          y: A.y + dirY * s,
          rx: base * (0.09 + rng() * 0.07) * knotA,
          ry: base * (0.018 + rng() * 0.02) * knotA,
          rot: bandRot,
          a: (0.028 + rng() * 0.03) * knotA,
        })
      }

      /* 暗尘埃巷：银河带上的两块暗斑（压出结构） */
      lanes = [0.3, 0.64].map((s) => ({
        x: A.x + dirX * s,
        y: A.y + dirY * s,
        rx: base * (0.05 + rng() * 0.03),
        ry: base * (0.012 + rng() * 0.012),
        rot: bandRot,
        a: 0.5 + rng() * 0.2,
      }))
    }

    const draw = (now: number) => {
      const t = now / 1000
      ctx.clearRect(0, 0, W, H)

      /* 银河光带 */
      for (const g of bandGlows) {
        ctx.save()
        ctx.translate(g.x, g.y)
        ctx.rotate(g.rot)
        ctx.scale(1, g.ry / g.rx)
        const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, g.rx)
        grad.addColorStop(0, `rgba(214,228,244,${g.a})`)
        grad.addColorStop(1, "rgba(214,228,244,0)")
        ctx.fillStyle = grad
        ctx.beginPath()
        ctx.arc(0, 0, g.rx, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
      }
      /* 暗尘埃巷 */
      for (const l of lanes) {
        ctx.save()
        ctx.translate(l.x, l.y)
        ctx.rotate(l.rot)
        ctx.scale(1, l.ry / l.rx)
        const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, l.rx)
        grad.addColorStop(0, `rgba(5,8,12,${l.a})`)
        grad.addColorStop(1, "rgba(5,8,12,0)")
        ctx.fillStyle = grad
        ctx.beginPath()
        ctx.arc(0, 0, l.rx, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
      }

      /* 星：每颗按自己的周期与相位闪烁 */
      for (const st of stars) {
        const tw =
          1 - st.amp / 2 + (st.amp / 2) * Math.sin((t / st.period) * Math.PI * 2 + st.phase)
        ctx.fillStyle = `${st.color}${(st.baseA * tw).toFixed(3)})`
        ctx.beginPath()
        ctx.arc(st.x, st.y, st.r, 0, Math.PI * 2)
        ctx.fill()
      }

      /* 主角星：光晕 + 实核 + 十字衍射芒 */
      for (const h of heroes) {
        const tw = 0.85 + 0.15 * Math.sin(t * 1.3 + h.x)
        const glow = ctx.createRadialGradient(h.x, h.y, 0, h.x, h.y, h.r * 6)
        glow.addColorStop(0, `${h.color}${0.5 * tw})`)
        glow.addColorStop(0.35, `${h.color}${0.12 * tw})`)
        glow.addColorStop(1, `${h.color}0)`)
        ctx.fillStyle = glow
        ctx.beginPath()
        ctx.arc(h.x, h.y, h.r * 6, 0, Math.PI * 2)
        ctx.fill()

        ctx.fillStyle = `${h.color}${0.95 * tw})`
        ctx.beginPath()
        ctx.arc(h.x, h.y, h.r, 0, Math.PI * 2)
        ctx.fill()

        ctx.strokeStyle = `${h.color}${0.4 * tw})`
        ctx.lineWidth = 0.8
        ctx.beginPath()
        ctx.moveTo(h.x - h.r * 4.5, h.y)
        ctx.lineTo(h.x + h.r * 4.5, h.y)
        ctx.moveTo(h.x, h.y - h.r * 4.5)
        ctx.lineTo(h.x, h.y + h.r * 4.5)
        ctx.stroke()
      }
    }

    const frame = (now: number) => {
      raf = 0
      /* 30fps 足够（闪烁是极低频信号） */
      if (frameNo++ % 2 === 0) draw(now)
      if (!reduced) raf = requestAnimationFrame(frame)
    }

    build()
    if (reduced) {
      draw(0)
    } else {
      raf = requestAnimationFrame(frame)
    }

    const onResize = () => {
      build()
      if (reduced) draw(0)
    }
    window.addEventListener("resize", onResize)

    return () => {
      if (raf) cancelAnimationFrame(raf)
      window.removeEventListener("resize", onResize)
    }
  }, [])

  return <canvas ref={ref} className="v2-starfield-canvas" aria-hidden />
}
