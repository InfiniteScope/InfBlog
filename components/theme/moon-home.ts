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

/** 亮弧锚定的月缘角度（canvas 极坐标，上左方；对应 CSS conic from 300deg） */
export const RIM_ANGLE = -2.2

/** canvas 版月亮：与 CSS .v2-moon 视觉一致——
 *  近黑盘体（微球面渐变）+ 上左缘亮弧（加宽、白光为主、冕光晕） */
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
  ctx.strokeStyle = `rgba(230,240,248,${0.3 * alpha})`
  ctx.lineWidth = R * 0.11
  ctx.shadowColor = "rgba(255,255,255,0.55)"
  ctx.shadowBlur = R * 0.2 * alpha
  ctx.beginPath()
  ctx.arc(cx, cy, R - R * 0.05, rimAngle - 0.75, rimAngle + 0.75)
  ctx.stroke()
  ctx.restore()

  /* 锐利主弧（加宽加白） */
  ctx.save()
  ctx.lineCap = "round"
  ctx.strokeStyle = `rgba(255,255,255,${0.98 * alpha})`
  ctx.lineWidth = Math.max(2, R * 0.022)
  ctx.shadowColor = "rgba(255,255,255,0.9)"
  ctx.shadowBlur = R * 0.08 * alpha
  ctx.beginPath()
  ctx.arc(cx, cy, R - R * 0.02, rimAngle - 0.55, rimAngle + 0.55)
  ctx.stroke()
  ctx.restore()
}
