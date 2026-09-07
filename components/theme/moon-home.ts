/** 月亮在屏幕上的"家"：探索主题 hero 的月亮（#hero-moon）与转场引擎共用
 *  同一公式。转场不再另画月亮——直接驱动这个 DOM 元素，月升/碎裂都是
 *  同一个月亮本体的动画。纯视口坐标系（58vw / 80+42%·(H-80)），
 *  与侧栏开合、内容流均解耦。 */
export function getMoonHome() {
  const W = window.innerWidth
  const H = window.innerHeight
  const R = Math.min(W, H) * 0.27 // 54vmin（moonshot 月亮 ≈ 0.54×屏高）
  return {
    cx: W * 0.58,
    cy: 80 + (H - 80) * 0.42,
    R,
  }
}

/** 转场引擎拿到的"月亮句柄"——就是首页那只月亮（#hero-moon 的升层），
 *  不再另画 canvas 副本：月升/碎裂均为月亮本体的 DOM 动画。
 *  veil = 月亮下方的夜幕层（z-15 < 月 z-20 < 特效 canvas z-100）。 */
export interface MoonHandle {
  /** .v2-moon-rise（#hero-moon-rise）：承载升/落/脉动动画的 wrapper */
  rise: HTMLElement | null
  /** 夜幕层（转场引擎逐帧驱动透明度） */
  veil: HTMLElement | null
}
