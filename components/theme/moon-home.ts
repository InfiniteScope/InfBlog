/** 月亮在屏幕上的"家"：探索主题 hero 的月亮与转场引擎共用同一公式，
 *  保证转场结束时月亮精确停留在主界面月亮所在位置。
 *  纯视口坐标系（58vw / 80+42%·(H-80)），与侧栏开合、内容流均解耦。 */
export function getMoonHome() {
  const W = window.innerWidth
  const H = window.innerHeight
  const R = Math.min(W, H) * 0.18
  return {
    cx: W * 0.58,
    cy: 80 + (H - 80) * 0.42,
    R,
  }
}

/** 亮弧锚定的月缘角度（canvas 极坐标，上左方；对应 CSS conic from 300°±64°） */
export const RIM_ANGLE = -2.06

/** 星尘相对月心的归一化散布（与 CSS .v2-moon-star 同位） */
const STARS: [number, number, number, boolean][] = [
  [-0.64, -0.42, 0.017, true],
  [-0.56, 0.44, 0.011, false],
  [-0.42, 0.98, 0.014, true],
  [0.08, -0.64, 0.011, false],
  [0.36, -0.58, 0.017, true],
  [0.62, -0.4, 0.011, false],
  [0.66, 0.24, 0.014, true],
  [-0.68, 0.08, 0.011, false],
]

/** canvas 版月亮：与 CSS .v2-moon 严格同构——
 *  近黑盘体（微球面渐变）+ 加宽亮弧（锐弧 + 冕光晕 + 钻石环珠点）+ 星尘 */
export function drawMoon(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  R: number,
  alpha: number,
  rimAngle: number = RIM_ANGLE
) {
  if (alpha <= 0.001) return

  /* accent 冕辉（大范围的色晕，日食氛围，压蓝增白） */
  const corona = ctx.createRadialGradient(cx, cy, R * 0.5, cx, cy, R * 2.4)
  corona.addColorStop(0, `rgba(64,200,224,${0.04 * alpha})`)
  corona.addColorStop(1, "rgba(64,200,224,0)")
  ctx.fillStyle = corona
  ctx.beginPath()
  ctx.arc(cx, cy, R * 2.4, 0, Math.PI * 2)
  ctx.fill()

  /* 暗盘（近黑球面渐变） */
  const disc = ctx.createRadialGradient(
    cx - R * 0.28,
    cy - R * 0.32,
    R * 0.1,
    cx,
    cy,
    R
  )
  disc.addColorStop(0, `rgba(24,28,34,${alpha})`)
  disc.addColorStop(0.55, `rgba(10,13,18,${alpha})`)
  disc.addColorStop(1, `rgba(5,7,10,${alpha})`)
  ctx.fillStyle = disc
  ctx.beginPath()
  ctx.arc(cx, cy, R, 0, Math.PI * 2)
  ctx.fill()

  /* 冕光晕（宽而淡的白光） */
  ctx.save()
  ctx.lineCap = "round"
  ctx.strokeStyle = `rgba(230,240,248,${0.35 * alpha})`
  ctx.lineWidth = R * 0.11
  ctx.shadowColor = "rgba(255,255,255,0.6)"
  ctx.shadowBlur = R * 0.22 * alpha
  ctx.beginPath()
  ctx.arc(cx, cy, R - R * 0.05, rimAngle - 0.75, rimAngle + 0.75)
  ctx.stroke()
  ctx.restore()

  /* 锐利主弧（加宽加白） */
  ctx.save()
  ctx.lineCap = "round"
  ctx.strokeStyle = `rgba(255,255,255,${0.98 * alpha})`
  ctx.lineWidth = Math.max(2, R * 0.022)
  ctx.shadowColor = "rgba(255,255,255,0.95)"
  ctx.shadowBlur = R * 0.09 * alpha
  ctx.beginPath()
  ctx.arc(cx, cy, R - R * 0.02, rimAngle - 0.56, rimAngle + 0.56)
  ctx.stroke()
  ctx.restore()

  /* 钻石环珠点（亮弧最热端） */
  const beadX = cx + Math.cos(rimAngle) * (R - R * 0.02)
  const beadY = cy + Math.sin(rimAngle) * (R - R * 0.02)
  ctx.save()
  ctx.fillStyle = `rgba(255,255,255,${alpha})`
  ctx.shadowColor = "rgba(255,255,255,0.95)"
  ctx.shadowBlur = R * 0.14 * alpha
  ctx.beginPath()
  ctx.arc(beadX, beadY, Math.max(2, R * 0.035), 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()

  /* 星尘 */
  ctx.save()
  for (const [ox, oy, sr, accent] of STARS) {
    ctx.fillStyle = accent
      ? `rgba(64,200,224,${0.55 * alpha})`
      : `rgba(255,255,255,${0.5 * alpha})`
    ctx.beginPath()
    ctx.arc(cx + ox * R, cy + oy * R, Math.max(1, sr * R), 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}
