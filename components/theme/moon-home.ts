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

/** 亮弧锚定的月缘角度（canvas 极坐标，上左方） */
export const RIM_ANGLE = -2.3

/** canvas 版月亮：与 CSS .v2-moon 视觉一致——
 *  近黑盘体（微球面渐变）+ 上左缘亮弧（锐弧 + 冕光晕）+ 极淡 accent 冕辉 */
export function drawMoon(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  R: number,
  alpha: number,
  rimAngle: number = RIM_ANGLE
) {
  if (alpha <= 0.001) return

  /* accent 冕辉（大范围的色晕，日食氛围） */
  const corona = ctx.createRadialGradient(cx, cy, R * 0.5, cx, cy, R * 2.4)
  corona.addColorStop(0, `rgba(64,200,224,${0.05 * alpha})`)
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

  /* 亮弧冕光（宽而淡，模糊辉光） */
  ctx.save()
  ctx.lineCap = "round"
  ctx.strokeStyle = `rgba(220,235,245,${0.22 * alpha})`
  ctx.lineWidth = R * 0.09
  ctx.shadowColor = "rgba(255,255,255,0.6)"
  ctx.shadowBlur = R * 0.18 * alpha
  ctx.beginPath()
  ctx.arc(cx, cy, R - R * 0.045, rimAngle - 0.62, rimAngle + 0.62)
  ctx.stroke()
  ctx.restore()

  /* 亮弧主弧（锐利） */
  ctx.save()
  ctx.lineCap = "round"
  ctx.strokeStyle = `rgba(255,255,255,${0.95 * alpha})`
  ctx.lineWidth = Math.max(1.5, R * 0.018)
  ctx.shadowColor = "rgba(255,255,255,0.9)"
  ctx.shadowBlur = R * 0.06 * alpha
  ctx.beginPath()
  ctx.arc(cx, cy, R - R * 0.02, rimAngle - 0.42, rimAngle + 0.42)
  ctx.stroke()
  ctx.restore()
}
