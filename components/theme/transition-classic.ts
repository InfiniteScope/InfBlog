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
  spawnX: number
  spawnY: number
  ringX: number
  ringY: number
  burstX: number
  burstY: number
  size: number
  verts: [number, number][]
  accent: boolean
  spin: number
  delay: number
}

const SWAP_AT = 0.95
const DURATION = 2.45
const SHARD_COUNT = 14

/**
 * 「无限 · 碎形与涟漪」：锐利碎片飞入重组为晶环 → 骤然破碎 → 幕布合拢换肤
 * → 水滴坠入屏幕中心 → 三环涟漪荡开、幕布褪去，揭示经典主题。
 * 返回取消函数。
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
  const ringR = base * 0.2

  /* 经典主题（Moss & Sand）目标配色，按当前深浅色选取 */
  const dark = document.documentElement.classList.contains("dark")
  const veilColor = dark ? "160 14% 8%" : "48 24% 96%"
  const shardColor = dark ? "80 14% 88%" : "150 18% 15%"
  const accentColor = dark ? "180 35% 50%" : "180 45% 38%"
  const ringColor = dark ? "0 0% 100%" : "150 18% 15%"

  /* 预生成碎片：外形锐利（三角/四边），出生点在屏外，目标在晶环上 */
  const rng = rand(20260905)
  const shards: Shard[] = Array.from({ length: SHARD_COUNT }, (_, i) => {
    const spawnAng = (i / SHARD_COUNT) * Math.PI * 2 + (rng() - 0.5) * 0.4
    const ringAng = spawnAng + (rng() - 0.5) * 0.7
    const spawnDist = Math.max(W, H) * 0.75
    const burstAng = ringAng + (rng() - 0.5) * 0.9
    const size = base * (0.05 + rng() * 0.05)
    const tri = rng() > 0.35
    const verts: [number, number][] = tri
      ? [
          [0, -1],
          [0.85 + rng() * 0.2, 0.65],
          [-0.85 - rng() * 0.2, 0.65 + rng() * 0.2],
        ]
      : [
          [0, -1],
          [0.8, -0.1 + rng() * 0.2],
          [0.1, 0.9],
          [-0.8 - rng() * 0.2, 0.2],
        ]
    return {
      spawnX: cx + Math.cos(spawnAng) * spawnDist,
      spawnY: cy + Math.sin(spawnAng) * spawnDist,
      ringX: cx + Math.cos(ringAng) * ringR,
      ringY: cy + Math.sin(ringAng) * ringR,
      burstX: Math.cos(burstAng) * Math.max(W, H) * 0.8,
      burstY: Math.sin(burstAng) * Math.max(W, H) * 0.8,
      size,
      verts,
      accent: i % 5 === 0,
      spin: (rng() - 0.5) * 5,
      delay: rng() * 0.12,
    }
  })

  let raf = 0
  let swapped = false
  const t0 = performance.now()

  const frame = (now: number) => {
    const t = (now - t0) / 1000
    ctx.clearRect(0, 0, W, H)

    /* 幕布：碎片期 0→0.55，破碎期 →1（换肤点），涟漪期 →0 揭示 */
    let veilA: number
    if (t < 0.7) {
      veilA = easeOutCubic(clamp01(t / 0.7)) * 0.55
    } else if (t < SWAP_AT) {
      veilA = lerp(0.55, 1, easeInOutCubic(clamp01((t - 0.7) / (SWAP_AT - 0.7))))
    } else {
      veilA = 1 - easeInOutCubic(clamp01((t - 1.32) / (DURATION - 1.32 - 0.05)))
    }
    if (veilA > 0.001) {
      ctx.fillStyle = `hsla(${veilColor} / ${veilA})`
      ctx.fillRect(0, 0, W, H)
    }

    /* 碎片：飞入 → 环上重组（末端微颤绷紧）→ 破碎四散 */
    for (const s of shards) {
      const inP = easeOutCubic(clamp01((t - s.delay) / 0.6))
      const outP = easeInQuad(clamp01((t - 0.7 - s.delay * 0.5) / 0.25))
      if (inP <= 0 || outP >= 1) continue

      const tremble = inP >= 1 && outP <= 0 ? Math.sin(t * 32 + s.size) * 2.5 : 0
      const x = lerp(s.spawnX, s.ringX, inP) + s.burstX * outP + tremble
      const y = lerp(s.spawnY, s.ringY, inP) + s.burstY * outP
      const alpha = inP * (1 - outP)
      const rot = s.spin * (0.4 + t) + outP * s.spin * 1.6

      ctx.save()
      ctx.translate(x, y)
      ctx.rotate(rot)
      ctx.globalAlpha = alpha
      ctx.beginPath()
      s.verts.forEach(([vx, vy], j) => {
        const X = vx * s.size
        const Y = vy * s.size
        if (j === 0) ctx.moveTo(X, Y)
        else ctx.lineTo(X, Y)
      })
      ctx.closePath()
      ctx.fillStyle = s.accent
        ? `hsla(${accentColor} / 0.9)`
        : `hsla(${shardColor} / 0.85)`
      ctx.fill()
      ctx.strokeStyle = s.accent
        ? `hsla(${accentColor} / 1)`
        : `hsla(${shardColor} / 0.5)`
      ctx.lineWidth = 1
      ctx.stroke()
      ctx.restore()
    }
    ctx.globalAlpha = 1

    /* 水滴：加速坠入屏幕中心，拖三枚残影 */
    const dropP = easeInQuad(clamp01((t - 1.0) / 0.3))
    if (dropP > 0 && dropP < 1) {
      const dropY = lerp(-40, cy, dropP)
      const r = 6
      for (let k = 1; k <= 3; k++) {
        const ty = dropY - k * 26 * dropP
        ctx.beginPath()
        ctx.arc(cx, ty, r * (1 - k * 0.22), 0, Math.PI * 2)
        ctx.fillStyle = `hsla(${accentColor} / ${0.25 * (1 - k * 0.28)})`
        ctx.fill()
      }
      ctx.save()
      ctx.translate(cx, dropY)
      ctx.scale(1, 1 + dropP * 0.4)
      ctx.beginPath()
      ctx.arc(0, 0, r, 0, Math.PI * 2)
      ctx.fillStyle = `hsla(${accentColor} / 1)`
      ctx.fill()
      ctx.restore()
    }

    /* 冲击闪光 */
    const flashP = clamp01((t - 1.3) / 0.14)
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

    /* 涟漪：三环错峰荡开 */
    const maxR = Math.hypot(W, H) / 2 + 40
    for (let k = 0; k < 3; k++) {
      const p = clamp01((t - 1.3 - k * 0.12) / 0.9)
      if (p <= 0 || p >= 1) continue
      const rr = maxR * easeOutCubic(p)
      ctx.beginPath()
      ctx.arc(cx, cy, rr, 0, Math.PI * 2)
      ctx.strokeStyle = `hsla(${ringColor} / ${(1 - p) * (k === 0 ? 0.5 : 0.32)})`
      ctx.lineWidth = lerp(3.5, 0.75, p)
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
