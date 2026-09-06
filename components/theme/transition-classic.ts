import { drawMoon, getMoonHome } from "@/components/theme/moon-home"

interface EngineCallbacks {
  onSwap: () => void
  onDone: () => void
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))
const lerp = (a: number, b: number, p: number) => a + (b - a) * p
const easeOutCubic = (p: number) => 1 - Math.pow(1 - p, 3)
const easeInOutCubic = (p: number) =>
  p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2
const easeInQuad = (p: number) => p * p

/** 确定性伪随机（同一碎片每帧一致） */
function rand(seed: number) {
  let s = seed
  return () => {
    s = (s * 16807 + 19487171) % 2147483647
    return s / 2147483647
  }
}

interface Shard {
  x: number
  y: number
  dirX: number
  dirY: number
  dist: number
  size: number
  verts: [number, number][]
  accent: boolean
  spin: number
  delay: number
}

interface Crack {
  points: [number, number][]
}

const SWAP_AT = 1.18
const DURATION = 3.35
const SHARD_COUNT = 46

/**
 * 「从想象之境回到现实」：月显（探索的月亮浮现于夜空）→ 世界凝成玻璃
 * （凝霜 + 冰纹）→ 整屏碎裂为形态多样的多边形四散 → 水滴坠入屏心
 * → 引力涟漪荡开，经典界面浮现。表达"无限"主题的归返面。
 */
export function playClassicTransition(
  canvas: HTMLCanvasElement,
  cb: EngineCallbacks
): () => void {
  const ctx = canvas.getContext("2d")
  if (!ctx) {
    cb.onSwap()
    cb.onDone()
    return () => undefined
  }

  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const W = window.innerWidth
  const H = window.innerHeight
  canvas.width = Math.round(W * dpr)
  canvas.height = Math.round(H * dpr)
  ctx.scale(dpr, dpr)

  const cx = W / 2
  const cy = H / 2
  const base = Math.min(W, H)
  const moon = getMoonHome()

  /* 经典主题（Moss & Sand）目标配色，按当前深浅色选取 */
  const dark = document.documentElement.classList.contains("dark")
  const veilColor = dark ? "160 14% 8%" : "48 24% 96%"
  const shardColor = dark ? "80 14% 88%" : "150 18% 15%"
  const accentColor = dark ? "180 35% 50%" : "180 45% 38%"
  const ringColor = dark ? "0 0% 100%" : "150 18% 15%"

  /* 预生成玻璃碎片：散布全屏、形态多样（三角/四边/五边）、大小随机 */
  const rng = rand(20260905)
  const shards: Shard[] = Array.from({ length: SHARD_COUNT }, (_, i) => {
    const x = rng() * W
    const y = rng() * H
    const dx = x - cx
    const dy = y - cy
    const d = Math.max(Math.hypot(dx, dy), 1)
    const sideCount = 3 + Math.floor(rng() * 3)
    const size = base * (0.018 + rng() * 0.045)
    const baseAng = rng() * Math.PI * 2
    const verts: [number, number][] = Array.from(
      { length: sideCount },
      (_, k) => {
        const a = baseAng + (k / sideCount) * Math.PI * 2 + (rng() - 0.5) * 0.5
        const rr = size * (0.55 + rng() * 0.6)
        return [Math.cos(a) * rr, Math.sin(a) * rr]
      }
    )
    return {
      x,
      y,
      dirX: dx / d,
      dirY: dy / d,
      dist: d,
      size,
      verts,
      accent: i % 6 === 0,
      spin: (rng() - 0.5) * 7,
      delay: (1 - d / (Math.hypot(W, H) / 2)) * 0.18, // 中心先碎
    }
  })

  /* 冰纹：自中心放射的折线 */
  const cracks: Crack[] = Array.from({ length: 6 }, (_, k) => {
    const ang = (k / 6) * Math.PI * 2 + (rng() - 0.5) * 0.6
    const points: [number, number][] = [[cx, cy]]
    let px = cx
    let py = cy
    let a = ang
    for (let s = 0; s < 4; s++) {
      const segLen = base * (0.1 + rng() * 0.12)
      a += (rng() - 0.5) * 0.5
      px += Math.cos(a) * segLen
      py += Math.sin(a) * segLen
      points.push([px, py])
    }
    return { points }
  })

  let raf = 0
  let swapped = false
  const t0 = performance.now()

  const frame = (now: number) => {
    const t = (now - t0) / 1000
    ctx.clearRect(0, 0, W, H)

    /* 第一幕·月显：探索的月亮自夜空中显现、增亮 */
    const nightA = easeOutCubic(clamp01(t / 0.9)) * 0.55
    const frostIn = easeInOutCubic(clamp01((t - 0.9) / 0.28))
    if (nightA > 0.001) {
      ctx.fillStyle = `rgba(4,6,10,${nightA * (1 - frostIn)})`
      ctx.fillRect(0, 0, W, H)
    }
    const moonP = easeOutCubic(clamp01((t - 0.1) / 0.7))
    const moonPulse = 1 + Math.sin(clamp01(t) * Math.PI) * 0.02
    if (frostIn < 1) {
      drawMoon(
        ctx,
        moon.cx,
        moon.cy,
        moon.R * moonPulse * (0.96 + 0.04 * moonP),
        moonP * (1 - frostIn)
      )
    }

    /* 第二幕·凝玻璃：霜幕合拢 + 一道斜扫的寒光 */
    if (frostIn > 0) {
      ctx.fillStyle = `hsla(${veilColor} / ${frostIn})`
      ctx.fillRect(0, 0, W, H)
      const sheenX = lerp(-W * 0.3, W * 1.3, frostIn)
      const sheen = ctx.createLinearGradient(
        sheenX - W * 0.12,
        0,
        sheenX + W * 0.12,
        H
      )
      sheen.addColorStop(0, "rgba(255,255,255,0)")
      sheen.addColorStop(0.5, `rgba(255,255,255,${0.12 * frostIn})`)
      sheen.addColorStop(1, "rgba(255,255,255,0)")
      ctx.fillStyle = sheen
      ctx.fillRect(0, 0, W, H)
    }

    /* 冰纹闪现（碎裂前兆） */
    const crackP = clamp01((t - SWAP_AT) / 0.16)
    if (t >= SWAP_AT && crackP < 1) {
      ctx.strokeStyle = `hsla(${ringColor} / ${(1 - crackP) * 0.7})`
      ctx.lineWidth = 1.5
      for (const crack of cracks) {
        ctx.beginPath()
        crack.points.forEach(([px, py], j) => {
          if (j === 0) ctx.moveTo(px, py)
          else ctx.lineTo(px, py)
        })
        ctx.stroke()
      }
    }

    /* 第三幕·碎裂：整屏玻璃炸开为形态多样的多边形（碎片即霜幕本身） */
    const shatterActive = t >= SWAP_AT + 0.08
    if (shatterActive) {
      /* 霜幕残余随碎片四散而消退，露出换肤后的经典界面 */
      const frostLeft = 1 - easeInOutCubic(clamp01((t - SWAP_AT - 0.08) / 0.55))
      if (frostLeft > 0.001) {
        ctx.fillStyle = `hsla(${veilColor} / ${frostLeft})`
        ctx.fillRect(0, 0, W, H)
      }
      for (const s of shards) {
        const p = clamp01((t - SWAP_AT - 0.08 - s.delay) / 0.6)
        if (p <= 0 || p >= 1) continue
        const fly = easeInQuad(p)
        const gx = s.x + s.dirX * fly * (s.dist + base * 0.55)
        const gy =
          s.y + s.dirY * fly * (s.dist + base * 0.55) + 140 * p * p // 微重力下坠
        ctx.save()
        ctx.translate(gx, gy)
        ctx.rotate(s.spin * p)
        ctx.globalAlpha = 1 - easeInQuad(p) * 0.9
        ctx.beginPath()
        s.verts.forEach(([vx, vy], j) => {
          if (j === 0) ctx.moveTo(vx, vy)
          else ctx.lineTo(vx, vy)
        })
        ctx.closePath()
        ctx.fillStyle = s.accent
          ? `hsla(${accentColor} / 0.85)`
          : `hsla(${veilColor} / 0.9)`
        ctx.fill()
        ctx.strokeStyle = `hsla(${shardColor} / 0.65)`
        ctx.lineWidth = 1
        ctx.stroke()
        ctx.restore()
      }
      ctx.globalAlpha = 1
    }

    /* 第四幕·水滴：坠入屏心，拖三枚残影 */
    const dropP = easeInQuad(clamp01((t - 1.95) / 0.3))
    if (dropP > 0 && dropP < 1) {
      const dropY = lerp(-40, cy, dropP)
      for (let k = 1; k <= 3; k++) {
        ctx.beginPath()
        ctx.arc(cx, dropY - k * 26 * dropP, 6 * (1 - k * 0.22), 0, Math.PI * 2)
        ctx.fillStyle = `hsla(${accentColor} / ${0.25 * (1 - k * 0.28)})`
        ctx.fill()
      }
      ctx.save()
      ctx.translate(cx, dropY)
      ctx.scale(1, 1 + dropP * 0.4)
      ctx.beginPath()
      ctx.arc(0, 0, 6, 0, Math.PI * 2)
      ctx.fillStyle = `hsla(${accentColor} / 1)`
      ctx.fill()
      ctx.restore()
    }

    /* 冲击闪光 */
    const flashP = clamp01((t - 2.25) / 0.14)
    if (flashP > 0 && flashP < 1) {
      const fr = base * 0.16 * easeOutCubic(flashP)
      const flash = ctx.createRadialGradient(cx, cy, 0, cx, cy, fr)
      flash.addColorStop(0, `hsla(${accentColor} / ${0.5 * (1 - flashP)})`)
      flash.addColorStop(1, `hsla(${accentColor} / 0)`)
      ctx.fillStyle = flash
      ctx.beginPath()
      ctx.arc(cx, cy, fr, 0, Math.PI * 2)
      ctx.fill()
    }

    /* 第五幕·引力涟漪：四环错峰荡开 + 透镜微凸（参考月面引力波） */
    const maxR = Math.hypot(W, H) / 2 + 40
    for (let k = 0; k < 4; k++) {
      const p = clamp01((t - 2.25 - k * 0.14) / 1.0)
      if (p <= 0 || p >= 1) continue
      const rr = maxR * easeOutCubic(p)
      ctx.beginPath()
      ctx.arc(cx, cy, rr, 0, Math.PI * 2)
      ctx.strokeStyle = `hsla(${ringColor} / ${(1 - p) * (k === 0 ? 0.45 : 0.28)})`
      ctx.lineWidth = lerp(3.5, 0.75, p)
      ctx.stroke()
      /* 折射副环（引力波的双影） */
      ctx.beginPath()
      ctx.arc(cx, cy, Math.max(rr - 7, 0), 0, Math.PI * 2)
      ctx.strokeStyle = `hsla(${accentColor} / ${(1 - p) * 0.18})`
      ctx.lineWidth = 1
      ctx.stroke()
    }

    if (!swapped && t >= SWAP_AT) {
      swapped = true
      cb.onSwap()
    }
    if (t >= DURATION) {
      cb.onDone()
      return
    }
    raf = requestAnimationFrame(frame)
  }

  raf = requestAnimationFrame(frame)
  return () => cancelAnimationFrame(raf)
}
