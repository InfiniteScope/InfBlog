import { getMoonHome } from "@/components/theme/moon-home"

interface EngineCallbacks {
  onSwap: () => void
  onDone: () => void
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))
const lerp = (a: number, b: number, p: number) => a + (b - a) * p
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
  facetA: [number, number][]
  facetB: [number, number][]
  splitV: [number, number]
  splitM: [number, number]
  accent: boolean
  spin: number
  delay: number
}

interface Crack {
  points: [number, number][]
}

/* 时间轴（秒）：月显聚光 → 凝霜自边缘合拢（镜面月影）→ 冰纹 → 碎镜 → 滴水成月 */
const SWAP_AT = 1.75
const SHATTER_START = SWAP_AT + 0.17
const DROP_START = 2.95
const IMPACT_AT = 3.35
const DURATION = 4.8
const SHARD_COUNT = 48

/**
 * 「镜花水月」（按 docs/Prompt.md 原案 + 方案评审细化）：
 * 月显——聚光灯收拢到 hero 月亮上（保持）；凝霜——霜幕自四缘向月心合拢，
 * 霜面如镜，月之倒影浮现其上（压扁、调暗、发软的月影）；
 * 碎镜——整块霜幕炸成 3-6 边玻璃碎片：刻面分割线劈出明暗子面、
 * 棱边折射厚度、红蓝色散、内嵌一弯月影残片，且有一道**世界坐标系固定**
 * 的斜向反光带扫过——碎片翻滚穿过时表面闪光随转动扫过（真玻璃的关键）；
 * 滴水——一滴水坠入屏心，水面立起一条正弦抖动的**竖直月光带**（水月），
 * 涟漪上弧亮、下弧暗、环缘波形畸变，撞击点水星飞溅。
 * 表达"无限"主题的归返面：想象之月碎入镜，镜碎落成水，水中又见月。
 */
export function playClassicTransition(
  canvas: HTMLCanvasElement,
  cb: EngineCallbacks,
  veil: HTMLElement | null
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
  const moonHome = getMoonHome()
  const mx = moonHome.cx
  const my = moonHome.cy
  const mR = moonHome.R
  const maxD = Math.max(
    Math.hypot(mx, my),
    Math.hypot(W - mx, my),
    Math.hypot(mx, H - my),
    Math.hypot(W - mx, H - my)
  )

  /* 经典主题（Moss & Sand）目标配色，按当前深浅色选取 */
  const dark = document.documentElement.classList.contains("dark")
  const veilColor = dark ? "160 14% 8%" : "48 24% 96%"
  const accentColor = dark ? "180 35% 50%" : "180 45% 38%"
  const ringColor = dark ? "0 0% 100%" : "150 18% 15%"

  /* —— 夜幕层：月显期轻压入夜（spotlight 由 canvas 径向渐变完成） —— */
  const veilEl = veil
  document.documentElement.classList.add("ui-theme-transitioning")

  /* 世界反光带：固定角度，碎裂后缓慢扫屏（真玻璃反光固定于环境，不随碎片转） */
  const SHEEN_ANG = -0.42
  const sheenAxis = { dx: Math.cos(SHEEN_ANG), dy: Math.sin(SHEEN_ANG) }
  const sheenNorm = { dx: -Math.sin(SHEEN_ANG), dy: Math.cos(SHEEN_ANG) }
  const SHEEN_SIGMA = base * 0.17

  /* 预生成玻璃碎片：散布全屏、3-6 边、带刻面分割、确定性 */
  const rng = rand(20260905)
  const shards: Shard[] = Array.from({ length: SHARD_COUNT }, (_, i) => {
    const x = rng() * W
    const y = rng() * H
    const dx = x - mx
    const dy = y - my
    const d = Math.max(Math.hypot(dx, dy), 1)
    const sideCount = 3 + Math.floor(rng() * 4)
    const size = base * (0.032 + rng() * 0.058)
    const baseAng = rng() * Math.PI * 2
    const verts: [number, number][] = Array.from(
      { length: sideCount },
      (_, k) => {
        const a = baseAng + (k / sideCount) * Math.PI * 2 + (rng() - 0.5) * 0.5
        const rr = size * (0.55 + rng() * 0.6)
        return [Math.cos(a) * rr, Math.sin(a) * rr]
      }
    )
    const n = verts.length
    const center: [number, number] = [
      verts.reduce((s, v) => s + v[0] / n, 0),
      verts.reduce((s, v) => s + v[1] / n, 0),
    ]
    const v0 = verts[0]
    const v1 = verts[1 % n]
    const v2 = verts[2 % n]
    const mid: [number, number] = [(v1[0] + v2[0]) / 2, (v1[1] + v2[1]) / 2]
    return {
      x,
      y,
      dirX: dx / d,
      dirY: dy / d,
      dist: d,
      size,
      verts,
      facetA: [v0, v1, mid, center],
      facetB: [mid, ...verts.slice(2), center],
      splitV: v1,
      splitM: mid,
      accent: i % 6 === 0,
      spin: (rng() - 0.5) * 5.4,
      delay: (1 - d / maxD) * 0.22, // 自月心向外依距离先后碎
    }
  })

  /* 冰纹：自月心放射的折线 */
  const cracks: Crack[] = Array.from({ length: 7 }, (_, k) => {
    const ang = (k / 7) * Math.PI * 2 + (rng() - 0.5) * 0.6
    const points: [number, number][] = [[mx, my]]
    let px = mx
    let py = my
    let a = ang
    for (let s = 0; s < 5; s++) {
      const segLen = base * (0.08 + rng() * 0.12)
      a += (rng() - 0.5) * 0.55
      px += Math.cos(a) * segLen
      py += Math.sin(a) * segLen
      points.push([px, py])
    }
    return { points }
  })

  const drawShard = (
    s: Shard,
    gx: number,
    gy: number,
    rot: number,
    alpha: number
  ) => {
    ctx.save()
    ctx.translate(gx, gy)
    ctx.rotate(rot)

    const pathOf = (verts: [number, number][]) => {
      ctx.beginPath()
      verts.forEach(([vx, vy], j) => {
        if (j === 0) ctx.moveTo(vx, vy)
        else ctx.lineTo(vx, vy)
      })
      ctx.closePath()
    }
    const wholePath = () => pathOf(s.verts)

    /* 玻璃体折射渐变（受光面 → 体色 → 背光面），mul 控制子面明暗 */
    const makeGlass = (mul: number) => {
      const g = ctx.createLinearGradient(-s.size, -s.size, s.size, s.size)
      if (s.accent) {
        g.addColorStop(0, `hsla(${accentColor} / ${0.92 * alpha * mul})`)
        g.addColorStop(0.55, `hsla(${accentColor} / ${0.72 * alpha * mul})`)
        g.addColorStop(1, `hsla(${accentColor} / ${0.48 * alpha * mul})`)
      } else {
        g.addColorStop(0, `rgba(255,255,255,${Math.min(0.95 * alpha * mul, 1)})`)
        g.addColorStop(0.5, `hsla(${veilColor} / ${0.9 * alpha * mul})`)
        g.addColorStop(
          1,
          `hsla(${dark ? "160 10% 22%" : "150 8% 62%"} / ${0.85 * alpha * mul})`
        )
      }
      return g
    }

    /* 刻面：两条子面微差（晶体质感，而非整片平涂） */
    pathOf(s.facetA)
    ctx.fillStyle = makeGlass(1.08)
    ctx.fill()
    pathOf(s.facetB)
    ctx.fillStyle = makeGlass(0.92)
    ctx.fill()

    /* 色散（折射色边）：红蓝微偏移双线 */
    ctx.save()
    ctx.translate(0.9, 0)
    wholePath()
    ctx.strokeStyle = `rgba(255,110,90,${0.28 * alpha})`
    ctx.lineWidth = 1
    ctx.stroke()
    ctx.restore()
    ctx.save()
    ctx.translate(-0.9, 0)
    wholePath()
    ctx.strokeStyle = `rgba(90,160,255,${0.28 * alpha})`
    ctx.lineWidth = 1
    ctx.stroke()
    ctx.restore()

    /* 反光刃边 + 棱边折射厚度（内侧细描） */
    wholePath()
    ctx.strokeStyle = `rgba(255,255,255,${0.8 * alpha})`
    ctx.lineWidth = 1.2
    ctx.stroke()
    ctx.save()
    ctx.translate(-0.7, -0.7)
    wholePath()
    ctx.strokeStyle = `rgba(255,255,255,${0.3 * alpha})`
    ctx.lineWidth = 0.8
    ctx.stroke()
    ctx.restore()

    /* 刻面棱线（子面分界的一线亮） */
    ctx.beginPath()
    ctx.moveTo(s.splitV[0], s.splitV[1])
    ctx.lineTo(s.splitM[0], s.splitM[1])
    ctx.strokeStyle = `rgba(255,255,255,${0.32 * alpha})`
    ctx.lineWidth = 1
    ctx.stroke()

    /* 内嵌月影残片（"镜"的碎片：一弯月弧封在玻璃里，随碎片旋转） */
    if (!s.accent) {
      ctx.beginPath()
      ctx.arc(0, 0, s.size * 0.34, -0.6, 0.7)
      ctx.strokeStyle = `rgba(205,228,240,${0.22 * alpha})`
      ctx.lineWidth = Math.max(1.2, s.size * 0.09)
      ctx.lineCap = "round"
      ctx.stroke()
    }

    /* 世界反光带：环境固定方向，碎片翻滚穿过时闪光扫过表面。
       梯度方向换算到碎片本地坐标（-rot），保持世界对齐 */
    const dn = (gx - sheenCx) * sheenNorm.dx + (gy - sheenCy) * sheenNorm.dy
    const boost = Math.exp(-(dn * dn) / (2 * SHEEN_SIGMA * SHEEN_SIGMA)) * 0.6
    if (boost > 0.02) {
      const cosR = Math.cos(-rot)
      const sinR = Math.sin(-rot)
      const lax = sheenAxis.dx * cosR - sheenAxis.dy * sinR
      const lay = sheenAxis.dx * sinR + sheenAxis.dy * cosR
      const k = s.size * 1.5
      const g = ctx.createLinearGradient(-lax * k, -lay * k, lax * k, lay * k)
      g.addColorStop(0, "rgba(255,255,255,0)")
      g.addColorStop(0.5, `rgba(255,255,255,${boost * alpha})`)
      g.addColorStop(1, "rgba(255,255,255,0)")
      wholePath()
      ctx.clip()
      ctx.fillStyle = g
      ctx.fillRect(-k, -k, k * 2, k * 2)
    }

    ctx.restore()
  }

  /* 镜面月影：霜面如镜，月之倒影（压扁、调暗、发软），碎裂即散 */
  const drawMoonReflection = (a: number) => {
    if (a <= 0.001) return
    ctx.save()
    ctx.translate(mx, my + mR * 1.2)
    ctx.scale(1, 0.5)
    const refl = ctx.createRadialGradient(0, 0, 0, 0, 0, mR * 0.9)
    refl.addColorStop(0, `rgba(215,232,244,${0.22 * a})`)
    refl.addColorStop(0.6, `rgba(215,232,244,${0.08 * a})`)
    refl.addColorStop(1, "rgba(215,232,244,0)")
    ctx.fillStyle = refl
    ctx.beginPath()
    ctx.arc(0, 0, mR * 0.9, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }

  /* 世界反光带的中心（随碎裂缓慢扫屏） */
  let sheenCx = -W * 0.15
  const sheenCy = H * 0.45

  let raf = 0
  let swapped = false
  let finished = false
  const t0 = performance.now()

  const dispose = () => {
    cancelAnimationFrame(raf)
    if (veilEl) veilEl.style.opacity = ""
    document.documentElement.classList.remove("ui-theme-transitioning")
  }

  const frame = (now: number) => {
    const t = (now - t0) / 1000
    ctx.clearRect(0, 0, W, H)

    /* 第一幕·月显：聚光灯收拢到月亮——四周暗下，月缘亮弧增亮脉动 */
    const spotP = easeInOutCubic(clamp01(t / 1.05))
    if (spotP > 0.001) {
      const holeR = lerp(Math.max(W, H) * 0.9, mR * 1.9, spotP)
      const sg = ctx.createRadialGradient(
        mx,
        my,
        Math.max(holeR * 0.5, 1),
        mx,
        my,
        Math.max(holeR, 1)
      )
      sg.addColorStop(0, "rgba(4,6,10,0)")
      sg.addColorStop(0.55, `rgba(4,6,10,${0.34 * spotP})`)
      sg.addColorStop(1, `rgba(4,6,10,${0.78 * spotP})`)
      ctx.fillStyle = sg
      ctx.fillRect(0, 0, W, H)

      const pulse = 0.5 + 0.5 * Math.sin(t * 2.4)
      const glow = ctx.createRadialGradient(mx, my, mR * 0.7, mx, my, mR * 1.75)
      glow.addColorStop(0, "rgba(255,255,255,0)")
      glow.addColorStop(0.72, `rgba(235,244,252,${(0.16 + 0.1 * pulse) * spotP})`)
      glow.addColorStop(0.86, `rgba(64,200,224,${(0.08 + 0.05 * pulse) * spotP})`)
      glow.addColorStop(1, "rgba(255,255,255,0)")
      ctx.fillStyle = glow
      ctx.beginPath()
      ctx.arc(mx, my, mR * 1.75, 0, Math.PI * 2)
      ctx.fill()
    }
    if (veilEl) {
      veilEl.style.opacity = (
        0.3 *
        spotP *
        (1 - easeInOutCubic(clamp01((t - 1.15) / 0.3)))
      ).toFixed(3)
    }

    /* 第二幕·凝霜：霜幕自四缘向月心合拢 + 寒光斜扫 + 镜面月影 */
    const frostP = easeInOutCubic(clamp01((t - 1.15) / 0.6))
    if (frostP > 0) {
      const holeR = lerp(maxD, 0, frostP)
      const fg = ctx.createRadialGradient(
        mx,
        my,
        Math.max(holeR - 70, 0),
        mx,
        my,
        Math.max(holeR, 1)
      )
      fg.addColorStop(0, `hsla(${veilColor} / 0)`)
      fg.addColorStop(1, `hsla(${veilColor} / 1)`)
      ctx.fillStyle = fg
      ctx.fillRect(0, 0, W, H)

      const sheenP = clamp01((t - 1.4) / 0.35)
      if (sheenP > 0) {
        const sx = lerp(-W * 0.3, W * 1.3, sheenP)
        const sg2 = ctx.createLinearGradient(sx - W * 0.12, 0, sx + W * 0.12, H)
        sg2.addColorStop(0, "rgba(255,255,255,0)")
        sg2.addColorStop(
          0.5,
          `rgba(255,255,255,${0.12 * sheenP * (1 - frostP * 0.5)})`
        )
        sg2.addColorStop(1, "rgba(255,255,255,0)")
        ctx.fillStyle = sg2
        ctx.fillRect(0, 0, W, H)
      }

      /* 霜面如镜：月之倒影浮现（碎裂开始后即散） */
      if (t < SHATTER_START) {
        drawMoonReflection(frostP * clamp01((t - 1.3) / 0.3))
      }
    }

    /* 冰纹闪现（碎裂前兆，自月心放射） */
    const crackP = clamp01((t - SWAP_AT) / 0.17)
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

    /* 第三幕·碎镜：霜幕炸成玻璃碎片（世界反光带同步扫屏） */
    if (t >= SHATTER_START) {
      sheenCx = lerp(-W * 0.15, W * 1.15, clamp01((t - SHATTER_START) / 1.35))

      const frostLeft = 1 - easeInOutCubic(clamp01((t - SHATTER_START) / 0.62))
      if (frostLeft > 0.001) {
        ctx.fillStyle = `hsla(${veilColor} / ${frostLeft})`
        ctx.fillRect(0, 0, W, H)
      }
      for (const s of shards) {
        const p = clamp01((t - SHATTER_START - s.delay) / 1.2)
        if (p <= 0 || p >= 1) continue
        const fly = easeInQuad(p)
        const wobble = Math.sin(p * 9 + s.size) * (1 - p) * 6
        const gx = s.x + s.dirX * fly * (s.dist + base * 0.5) + wobble
        const gy = s.y + s.dirY * fly * (s.dist + base * 0.5) + 190 * p * p
        drawShard(s, gx, gy, s.spin * p + wobble * 0.04, 1 - easeInQuad(p) * 0.92)
      }
    }

    /* 第四幕·滴水：坠入屏心，拖四枚残影 */
    const dropP = easeInQuad(clamp01((t - DROP_START) / (IMPACT_AT - DROP_START)))
    if (dropP > 0 && dropP < 1) {
      const dropY = lerp(-40, cy, dropP)
      for (let k = 1; k <= 4; k++) {
        ctx.beginPath()
        ctx.arc(cx, dropY - k * 24 * dropP, 6.5 * (1 - k * 0.2), 0, Math.PI * 2)
        ctx.fillStyle = `hsla(${accentColor} / ${0.25 * (1 - k * 0.22)})`
        ctx.fill()
      }
      ctx.save()
      ctx.translate(cx, dropY)
      ctx.scale(1, 1 + dropP * 0.45)
      ctx.beginPath()
      ctx.arc(0, 0, 6.5, 0, Math.PI * 2)
      ctx.fillStyle = `hsla(${accentColor} / 1)`
      ctx.fill()
      ctx.restore()
    }

    /* 冲击闪光 + 水星飞溅 */
    const flashP = clamp01((t - IMPACT_AT) / 0.14)
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
    const splashP = clamp01((t - IMPACT_AT) / 0.7)
    if (splashP > 0 && splashP < 1) {
      for (let i = 0; i < 8; i++) {
        const ang = -Math.PI / 2 + (i - 3.5) * 0.3
        const d = easeOutCubic(splashP) * base * (0.05 + (i % 3) * 0.02)
        const xx = cx + Math.cos(ang) * d
        const yy = cy + Math.sin(ang) * d + 240 * splashP * splashP * 0.35
        ctx.beginPath()
        ctx.arc(xx, yy, 1.8, 0, Math.PI * 2)
        ctx.fillStyle = `hsla(${accentColor} / ${(1 - splashP) * 0.8})`
        ctx.fill()
      }
    }

    /* 水月：屏心立起正弦抖动的竖直月光带（波光粼粼的水面月影） */
    const wp = clamp01((t - IMPACT_AT) / 1.4)
    if (t >= IMPACT_AT && wp < 1) {
      const colH = H * 0.4
      const slices = 26
      ctx.lineCap = "round"
      for (let s = 0; s < slices; s++) {
        const depth = s / slices
        const yy = cy + 10 + depth * colH
        const amp = base * 0.014 * (0.35 + depth)
        const off = Math.sin(yy * 0.05 + t * 2.3 + depth * 3.2) * amp
        const wHalf =
          base * 0.03 * (1 - depth * 0.55) * (0.72 + 0.28 * Math.sin(yy * 0.11 + t * 3.1))
        const shimmer = 0.55 + 0.45 * Math.sin(yy * 0.13 + t * 2.7)
        const a = (1 - wp) * (1 - depth) * 0.42 * shimmer
        if (a <= 0.004) continue
        ctx.strokeStyle =
          s % 5 === 0 ? `hsla(${accentColor} / ${a * 0.7})` : `rgba(226,238,246,${a})`
        ctx.lineWidth = 2.4
        ctx.beginPath()
        ctx.moveTo(cx + off - wHalf, yy)
        ctx.lineTo(cx + off + wHalf, yy)
        ctx.stroke()
      }
    }

    /* 引力涟漪：上弧亮（受天光）、下弧暗，环缘波形畸变 */
    const maxR = Math.hypot(W, H) / 2 + 40
    const SEGS = 44
    for (let k = 0; k < 4; k++) {
      const p = clamp01((t - IMPACT_AT - k * 0.16) / 1.2)
      if (p <= 0 || p >= 1) continue
      const rr = maxR * easeOutCubic(p)
      for (const [a0, a1, mul] of [
        [Math.PI, Math.PI * 2, 1],
        [0, Math.PI, 0.32],
      ] as const) {
        ctx.beginPath()
        for (let s = 0; s <= SEGS; s++) {
          const ang = a0 + ((a1 - a0) * s) / SEGS
          const wob = Math.sin(ang * 7 + k * 2.2 + t * 3.2) * 2.4 * (1 - p * 0.5)
          const x = cx + Math.cos(ang) * (rr + wob)
          const y = cy + Math.sin(ang) * (rr + wob)
          if (s === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        }
        ctx.strokeStyle = `hsla(${ringColor} / ${(1 - p) * 0.42 * mul})`
        ctx.lineWidth = lerp(3.2, 0.7, p)
        ctx.stroke()
      }
    }

    if (!swapped && t >= SWAP_AT) {
      swapped = true
      cb.onSwap()
    }
    if (t >= DURATION) {
      if (!finished) {
        finished = true
        dispose()
        cb.onDone()
      }
      return
    }
    raf = requestAnimationFrame(frame)
  }

  raf = requestAnimationFrame(frame)
  return () => {
    if (!finished) {
      finished = true
      dispose()
    }
  }
}

function easeOutCubic(p: number) {
  return 1 - Math.pow(1 - p, 3)
}
