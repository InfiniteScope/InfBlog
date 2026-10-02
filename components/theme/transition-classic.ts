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
  accent: boolean
  spin: number
  delay: number
  apex: [number, number]
  apex2: [number, number]
}

interface Crack {
  points: [number, number][]
}

/* 时间轴（秒）：月显聚光 → 凝霜自边缘合拢 → 冰纹 → 满幕碎裂 → 水滴 → 引力涟漪 */
const SWAP_AT = 1.7
const SHATTER_START = SWAP_AT + 0.16
const DROP_START = 2.72
const IMPACT_AT = 3.08
const DURATION = 4.3
const SHARD_COUNT = 56

/**
 * 「从想象之境回到现实」（按 docs/Prompt.md 原案细化）：
 * 月显——聚光灯收拢到 hero 那只月亮上，月缘亮弧增亮脉动；
 * 凝霜——霜幕自屏幕四缘向月心合拢（而非整屏瞬盖），寒光斜扫；
 * 破碎——冰纹自月心炸开，整块霜幕碎成形态多样的大块玻璃
 * （折射渐变 + 反光刃边 + 红蓝色散 + 双棱面高光）四散坠落；
 * 水滴——碎裂尾声中一滴水坠入屏心，引力涟漪（波前透镜 + 干涉双环）
 * 荡开，经典界面浮现。表达"无限"主题的归返面。
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
  /* 到屏幕最远角的距离（凝霜合拢的全程） */
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

  /* —— 夜幕层：月显期只轻压四周（spotlight 由 canvas 径向渐变完成） —— */
  const veilEl = veil
  document.documentElement.classList.add("ui-theme-transitioning")

  /* 预生成玻璃碎片：散布全屏、形态多样（3-6 边）、大块、确定性 */
  const rng = rand(20260905)
  const shards: Shard[] = Array.from({ length: SHARD_COUNT }, (_, i) => {
    const x = rng() * W
    const y = rng() * H
    const dx = x - mx
    const dy = y - my
    const d = Math.max(Math.hypot(dx, dy), 1)
    const sideCount = 3 + Math.floor(rng() * 4)
    const size = base * (0.032 + rng() * 0.062)
    const baseAng = rng() * Math.PI * 2
    const verts: [number, number][] = Array.from(
      { length: sideCount },
      (_, k) => {
        const a = baseAng + (k / sideCount) * Math.PI * 2 + (rng() - 0.5) * 0.5
        const rr = size * (0.55 + rng() * 0.6)
        return [Math.cos(a) * rr, Math.sin(a) * rr]
      }
    )
    /* 棱面高光顶点：离质心最远/次远 */
    const sorted = [...verts].sort(
      (a, b) => Math.hypot(b[0], b[1]) - Math.hypot(a[0], a[1])
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
      spin: (rng() - 0.5) * 6,
      delay: (1 - d / maxD) * 0.22, // 自月心向外依距离先后碎
      apex: sorted[0],
      apex2: sorted[1] ?? sorted[0],
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

  const drawShard = (s: Shard, gx: number, gy: number, rot: number, alpha: number) => {
    ctx.save()
    ctx.translate(gx, gy)
    ctx.rotate(rot)

    const path = () => {
      ctx.beginPath()
      s.verts.forEach(([vx, vy], j) => {
        if (j === 0) ctx.moveTo(vx, vy)
        else ctx.lineTo(vx, vy)
      })
      ctx.closePath()
    }

    /* 色散（折射色边）：红蓝微偏移双线 */
    ctx.save()
    ctx.translate(0.9, 0)
    path()
    ctx.strokeStyle = `rgba(255,110,90,${0.3 * alpha})`
    ctx.lineWidth = 1
    ctx.stroke()
    ctx.restore()
    ctx.save()
    ctx.translate(-0.9, 0)
    path()
    ctx.strokeStyle = `rgba(90,160,255,${0.3 * alpha})`
    ctx.lineWidth = 1
    ctx.stroke()
    ctx.restore()

    /* 玻璃体：受光面 → 体色 → 背光面的折射渐变 */
    const g = ctx.createLinearGradient(-s.size, -s.size, s.size, s.size)
    if (s.accent) {
      g.addColorStop(0, `hsla(${accentColor} / ${0.95 * alpha})`)
      g.addColorStop(0.55, `hsla(${accentColor} / ${0.75 * alpha})`)
      g.addColorStop(1, `hsla(${accentColor} / ${0.5 * alpha})`)
    } else {
      g.addColorStop(0, `rgba(255,255,255,${0.95 * alpha})`)
      g.addColorStop(0.5, `hsla(${veilColor} / ${0.92 * alpha})`)
      g.addColorStop(1, `hsla(${dark ? "160 10% 22%" : "150 8% 62%"} / ${0.85 * alpha})`)
    }
    path()
    ctx.fillStyle = g
    ctx.fill()

    /* 反光刃边 */
    path()
    ctx.strokeStyle = `rgba(255,255,255,${0.8 * alpha})`
    ctx.lineWidth = 1.2
    ctx.stroke()

    /* 双棱面高光：质心射向最远/次远顶点的两线亮 */
    for (const [ax, ay, k] of [
      [s.apex[0], s.apex[1], 0.55],
      [s.apex2[0], s.apex2[1], 0.3],
    ] as const) {
      const sg = ctx.createLinearGradient(0, 0, ax, ay)
      sg.addColorStop(0, "rgba(255,255,255,0)")
      sg.addColorStop(1, `rgba(255,255,255,${k * alpha})`)
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.lineTo(ax * 0.72, ay * 0.72)
      ctx.strokeStyle = sg
      ctx.lineWidth = 1.3
      ctx.stroke()
    }

    ctx.restore()
  }

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
      /* 四周暗角（月心留光） */
      const holeR = lerp(Math.max(W, H) * 0.9, mR * 1.9, spotP)
      const sg = ctx.createRadialGradient(mx, my, Math.max(holeR * 0.5, 1), mx, my, Math.max(holeR, 1))
      sg.addColorStop(0, "rgba(4,6,10,0)")
      sg.addColorStop(0.55, `rgba(4,6,10,${0.34 * spotP})`)
      sg.addColorStop(1, `rgba(4,6,10,${0.78 * spotP})`)
      ctx.fillStyle = sg
      ctx.fillRect(0, 0, W, H)

      /* 月缘亮弧增亮（逐渐明亮的圆环光晕，锚定月面） */
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
    /* veil（DOM 层）轻压入夜 */
    if (veilEl) {
      veilEl.style.opacity = (0.3 * spotP * (1 - easeInOutCubic(clamp01((t - 1.15) / 0.3)))).toFixed(3)
    }

    /* 第二幕·凝霜：霜幕自四缘向月心合拢 + 寒光斜扫 */
    const frostP = easeInOutCubic(clamp01((t - 1.15) / 0.55))
    if (frostP > 0) {
      const holeR = lerp(maxD, 0, frostP)
      const fg = ctx.createRadialGradient(mx, my, Math.max(holeR - 70, 0), mx, my, Math.max(holeR, 1))
      fg.addColorStop(0, `hsla(${veilColor} / 0)`)
      fg.addColorStop(1, `hsla(${veilColor} / 1)`)
      ctx.fillStyle = fg
      ctx.fillRect(0, 0, W, H)

      const sheenP = clamp01((t - 1.35) / 0.35)
      if (sheenP > 0) {
        const sheenX = lerp(-W * 0.3, W * 1.3, sheenP)
        const sheen = ctx.createLinearGradient(sheenX - W * 0.12, 0, sheenX + W * 0.12, H)
        sheen.addColorStop(0, "rgba(255,255,255,0)")
        sheen.addColorStop(0.5, `rgba(255,255,255,${0.12 * sheenP * (1 - frostP * 0.5)})`)
        sheen.addColorStop(1, "rgba(255,255,255,0)")
        ctx.fillStyle = sheen
        ctx.fillRect(0, 0, W, H)
      }
    }

    /* 冰纹闪现（碎裂前兆，自月心放射） */
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

    /* 第三幕·碎裂：霜幕炸成形态多样的大块玻璃，自月心向外依距离先后崩解 */
    if (t >= SHATTER_START) {
      const frostLeft = 1 - easeInOutCubic(clamp01((t - SHATTER_START) / 0.62))
      if (frostLeft > 0.001) {
        ctx.fillStyle = `hsla(${veilColor} / ${frostLeft})`
        ctx.fillRect(0, 0, W, H)
      }
      for (const s of shards) {
        const p = clamp01((t - SHATTER_START - s.delay) / 1.15)
        if (p <= 0 || p >= 1) continue
        const fly = easeInQuad(p)
        const wobble = Math.sin(p * 9 + s.size) * (1 - p) * 6 // 初速期的抖动
        const gx = s.x + s.dirX * fly * (s.dist + base * 0.5) + wobble
        const gy = s.y + s.dirY * fly * (s.dist + base * 0.5) + 190 * p * p
        drawShard(s, gx, gy, s.spin * p + wobble * 0.04, 1 - easeInQuad(p) * 0.92)
      }
    }

    /* 第四幕·水滴：碎裂尾声中提前坠入（重叠节奏），拖四枚残影 */
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

    /* 冲击闪光 */
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

    /* 第五幕·引力涟漪：波前透镜带 + 四环干涉双影（参考月面引力波） */
    const maxR = Math.hypot(W, H) / 2 + 40
    /* 波前透镜带：一圈有厚度的高亮波前（像空间被压弯后推出去） */
    const lensP = clamp01((t - IMPACT_AT) / 1.5)
    if (lensP > 0 && lensP < 1) {
      const lr = maxR * easeOutCubic(lensP)
      const lg = ctx.createRadialGradient(cx, cy, Math.max(lr - 26, 0), cx, cy, lr)
      lg.addColorStop(0, `hsla(${ringColor} / 0)`)
      lg.addColorStop(0.65, `hsla(${ringColor} / ${0.1 * (1 - lensP)})`)
      lg.addColorStop(0.86, `hsla(${ringColor} / ${0.22 * (1 - lensP)})`)
      lg.addColorStop(1, `hsla(${ringColor} / 0)`)
      ctx.fillStyle = lg
      ctx.beginPath()
      ctx.arc(cx, cy, lr, 0, Math.PI * 2)
      ctx.fill()
    }
    for (let k = 0; k < 4; k++) {
      const p = clamp01((t - IMPACT_AT - k * 0.15) / 1.15)
      if (p <= 0 || p >= 1) continue
      const rr = maxR * easeOutCubic(p)
      ctx.beginPath()
      ctx.arc(cx, cy, rr, 0, Math.PI * 2)
      ctx.strokeStyle = `hsla(${ringColor} / ${(1 - p) * (k === 0 ? 0.45 : 0.28)})`
      ctx.lineWidth = lerp(3.5, 0.75, p)
      ctx.stroke()
      /* 折射副环（引力波双影） */
      ctx.beginPath()
      ctx.arc(cx, cy, Math.max(rr - 7, 0), 0, Math.PI * 2)
      ctx.strokeStyle = `hsla(${accentColor} / ${(1 - p) * 0.18})`
      ctx.lineWidth = 1
      ctx.stroke()
    }

    if (!swapped && t >= SWAP_AT) {
      swapped = true
      /* 霜幕已合拢，换肤（探索树隐藏 → hero 场景一并退场） */
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
