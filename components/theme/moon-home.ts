/** 月亮在屏幕上的"家"：探索主题 hero 的月亮与转场引擎共用同一公式，
 *  保证转场结束时月亮精确停留在主界面月亮所在位置。
 *  几何：内容区 = 视口 - 侧栏(280px, lg+) - 主区 padding；hero 顶 = 56(navbar)+24(main pt)。 */
export function getMoonHome() {
  const W = window.innerWidth
  const H = window.innerHeight
  const sideW = W >= 1024 ? 280 : 0
  const padX = W >= 1024 ? 32 : W >= 768 ? 24 : 16
  const contentL = sideW + padX
  const contentW = W - sideW - padX * 2
  const R = Math.min(W, H) * 0.18
  return {
    cx: contentL + contentW * 0.58,
    cy: 80 + (H - 80) * 0.42,
    R,
  }
}

/** 环形山（相对月心的归一化坐标与半径比例） */
const CRATERS: [number, number, number][] = [
  [-0.28, -0.18, 0.1],
  [0.06, 0.22, 0.075],
  [-0.33, 0.28, 0.06],
  [0.14, -0.27, 0.05],
  [0.3, 0.05, 0.04],
]

/** canvas 版月亮：与 CSS .v2-moon 视觉一致（受光面 + 环形山 + 晨昏线 + 光晕） */
export function drawMoon(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  R: number,
  alpha: number
) {
  if (alpha <= 0.001) return

  /* 光晕 */
  const glow = ctx.createRadialGradient(cx, cy, R * 0.6, cx, cy, R * 2.2)
  glow.addColorStop(0, `rgba(210,225,235,${0.1 * alpha})`)
  glow.addColorStop(1, "rgba(210,225,235,0)")
  ctx.fillStyle = glow
  ctx.beginPath()
  ctx.arc(cx, cy, R * 2.2, 0, Math.PI * 2)
  ctx.fill()

  /* 月盘 */
  const disc = ctx.createRadialGradient(
    cx - R * 0.3,
    cy - R * 0.35,
    R * 0.1,
    cx,
    cy,
    R
  )
  disc.addColorStop(0, `rgba(246,247,244,${0.98 * alpha})`)
  disc.addColorStop(0.65, `rgba(196,203,208,${0.9 * alpha})`)
  disc.addColorStop(1, `rgba(150,160,168,${0.75 * alpha})`)
  ctx.fillStyle = disc
  ctx.beginPath()
  ctx.arc(cx, cy, R, 0, Math.PI * 2)
  ctx.fill()

  ctx.save()
  ctx.beginPath()
  ctx.arc(cx, cy, R, 0, Math.PI * 2)
  ctx.clip()

  /* 环形山 */
  for (const [ox, oy, or_] of CRATERS) {
    const cr = or_ * R * 2
    const crater = ctx.createRadialGradient(
      cx + ox * R,
      cy + oy * R,
      0,
      cx + ox * R,
      cy + oy * R,
      cr
    )
    crater.addColorStop(0, `rgba(90,100,110,${0.16 * alpha})`)
    crater.addColorStop(1, "rgba(90,100,110,0)")
    ctx.fillStyle = crater
    ctx.beginPath()
    ctx.arc(cx + ox * R, cy + oy * R, cr, 0, Math.PI * 2)
    ctx.fill()
  }

  /* 晨昏线（暗面） */
  const term = ctx.createLinearGradient(
    cx - R,
    cy - R * 0.2,
    cx + R,
    cy + R * 0.2
  )
  term.addColorStop(0, "rgba(4,6,10,0)")
  term.addColorStop(0.46, "rgba(4,6,10,0)")
  term.addColorStop(0.62, `rgba(4,6,10,${0.72 * alpha})`)
  term.addColorStop(1, `rgba(4,6,10,${0.85 * alpha})`)
  ctx.fillStyle = term
  ctx.fillRect(cx - R, cy - R, R * 2, R * 2)
  ctx.restore()
}
