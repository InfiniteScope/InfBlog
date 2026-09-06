interface EngineCallbacks {
  onSwap: () => void
  onDone: () => void
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))
const lerp = (a: number, b: number, p: number) => a + (b - a) * p
const easeOutCubic = (p: number) => 1 - Math.pow(1 - p, 3)
const easeInOutCubic = (p: number) =>
  p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2

/** 《月之暗面》光谱七色 */
const SPECTRUM = [
  "#ff453a",
  "#ff9f0a",
  "#ffd60a",
  "#30d158",
  "#40c8e0",
  "#0a84ff",
  "#bf5af2",
]

function hexA(hex: string, a: number) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${a})`
}

const SWAP_AT = 2.05
const DURATION = 2.65

/**
 * 「月升 · 棱镜」：夜幕 → 月升 → 棱镜浮现 → 白光射入 → 七色分化
 * → 整体旋转 -12° → 满幕换肤 → 月光渐隐揭示探索主题。
 * 返回取消函数。
 */
export function playExploreTransition(
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
  const my = H * 0.42
  const R = Math.min(W, H) * 0.16
  const px = cx
  const py = my
  const PS = R * 0.52

  let raf = 0
  let swapped = false
  const t0 = performance.now()

  const frame = (now: number) => {
    const t = (now - t0) / 1000
    const master = 1 - easeInOutCubic(clamp01((t - SWAP_AT) / (DURATION - SWAP_AT)))
    ctx.clearRect(0, 0, W, H)

    /* 夜幕 */
    const skyA = easeOutCubic(clamp01(t / 0.4)) * master
    if (skyA > 0.001) {
      const sky = ctx.createLinearGradient(0, 0, 0, H)
      sky.addColorStop(0, `rgba(2,4,8,${skyA})`)
      sky.addColorStop(1, `rgba(7,10,16,${skyA})`)
      ctx.fillStyle = sky
      ctx.fillRect(0, 0, W, H)
    }

    /* 月升（谢幕时继续缓缓上移） */
    const riseP = easeOutCubic(clamp01((t - 0.12) / 0.85))
    const drift = easeInOutCubic(clamp01((t - SWAP_AT) / (DURATION - SWAP_AT))) * -16
    const moonY = lerp(H + R * 1.6, my, riseP) + drift
    const moonA = riseP * master
    if (moonA > 0.001) {
      const glow = ctx.createRadialGradient(cx, moonY, R * 0.6, cx, moonY, R * 2.2)
      glow.addColorStop(0, `rgba(210,225,235,${0.1 * moonA})`)
      glow.addColorStop(1, "rgba(210,225,235,0)")
      ctx.fillStyle = glow
      ctx.beginPath()
      ctx.arc(cx, moonY, R * 2.2, 0, Math.PI * 2)
      ctx.fill()

      const disc = ctx.createRadialGradient(
        cx - R * 0.3,
        moonY - R * 0.35,
        R * 0.1,
        cx,
        moonY,
        R
      )
      disc.addColorStop(0, `rgba(246,247,244,${0.98 * moonA})`)
      disc.addColorStop(0.65, `rgba(196,203,208,${0.9 * moonA})`)
      disc.addColorStop(1, `rgba(150,160,168,${0.75 * moonA})`)
      ctx.fillStyle = disc
      ctx.beginPath()
      ctx.arc(cx, moonY, R, 0, Math.PI * 2)
      ctx.fill()

      /* 晨昏线 */
      ctx.save()
      ctx.beginPath()
      ctx.arc(cx, moonY, R, 0, Math.PI * 2)
      ctx.clip()
      const term = ctx.createLinearGradient(
        cx - R,
        moonY - R * 0.2,
        cx + R,
        moonY + R * 0.2
      )
      term.addColorStop(0, "rgba(4,6,10,0)")
      term.addColorStop(0.48, "rgba(4,6,10,0)")
      term.addColorStop(0.62, `rgba(4,6,10,${0.8 * moonA})`)
      term.addColorStop(1, `rgba(4,6,10,${0.88 * moonA})`)
      ctx.fillStyle = term
      ctx.fillRect(cx - R, moonY - R, R * 2, R * 2)
      ctx.restore()
    }

    /* 棱镜 + 光束组（绕棱镜中心整体旋转） */
    const rot =
      easeInOutCubic(clamp01((t - 1.5) / 0.4)) * ((-12 * Math.PI) / 180)
    ctx.save()
    ctx.translate(px, py)
    ctx.rotate(rot)
    ctx.translate(-px, -py)

    ctx.globalCompositeOperation = "lighter"

    /* 白光（左侧入射） */
    const beamP = easeOutCubic(clamp01((t - 1.02) / 0.18))
    if (beamP > 0) {
      const x0 = -W * 0.06
      const x1 = lerp(x0, px - PS * 0.86, beamP)
      const g = ctx.createLinearGradient(x0, py, x1, py)
      g.addColorStop(0, "rgba(255,255,255,0)")
      g.addColorStop(0.25, `rgba(255,255,255,${0.85 * master})`)
      g.addColorStop(1, `rgba(255,255,255,${master})`)
      ctx.strokeStyle = g
      ctx.lineWidth = R * 0.09
      ctx.lineCap = "round"
      ctx.shadowColor = "rgba(255,255,255,0.8)"
      ctx.shadowBlur = 24 * master
      ctx.beginPath()
      ctx.moveTo(x0, py)
      ctx.lineTo(x1, py)
      ctx.stroke()
      ctx.shadowBlur = 0
    }

    /* 七色光（右侧分化，扇形展开） */
    const specP = easeOutCubic(clamp01((t - 1.22) / 0.32))
    if (specP > 0) {
      const sx = px + PS * 0.5
      const sy = py + PS * 0.1
      SPECTRUM.forEach((color, i) => {
        const ang = ((-4 + i * 3.2) * Math.PI) / 180
        const len = (W * 1.1 - sx) * specP
        const ex = sx + Math.cos(ang) * len
        const ey = sy + Math.sin(ang) * len
        const g = ctx.createLinearGradient(sx, sy, ex, ey)
        g.addColorStop(0, hexA(color, 0.95 * master))
        g.addColorStop(1, hexA(color, 0.15 * master))
        ctx.strokeStyle = g
        ctx.lineWidth = R * 0.045
        ctx.lineCap = "round"
        ctx.shadowColor = color
        ctx.shadowBlur = 16 * master
        ctx.beginPath()
        ctx.moveTo(sx, sy)
        ctx.lineTo(ex, ey)
        ctx.stroke()
      })
      ctx.shadowBlur = 0
    }

    /* 棱镜本体（加法混合外） */
    ctx.globalCompositeOperation = "source-over"
    const prismP = easeOutCubic(clamp01((t - 0.92) / 0.22))
    if (prismP > 0) {
      const s = PS * (0.9 + 0.1 * prismP)
      ctx.globalAlpha = prismP * master
      ctx.beginPath()
      ctx.moveTo(px, py - s)
      ctx.lineTo(px + s * 0.9, py + s * 0.62)
      ctx.lineTo(px - s * 0.9, py + s * 0.62)
      ctx.closePath()
      ctx.fillStyle = "rgba(255,255,255,0.05)"
      ctx.fill()
      ctx.strokeStyle = "rgba(255,255,255,0.9)"
      ctx.lineWidth = 1.5
      ctx.stroke()
      ctx.globalAlpha = 1
    }

    ctx.restore()

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
