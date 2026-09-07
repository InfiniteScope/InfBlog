/** 月亮在屏幕上的"家"（视口像素坐标）：以 hero 的 WebGL 场景画布
 *  （#hero-moon-canvas）为基准——月亮在场景 uv (0.44, 0.5)、R=0.13（高度比），
 *  与 moon-scene.ts 的常量严格一致。转场引擎用它定位冰纹放射原点等。 */
export function getMoonHome() {
  const W = window.innerWidth
  const H = window.innerHeight
  const el = document.getElementById("hero-moon-canvas")
  const r = el?.getBoundingClientRect()
  if (r && r.width > 0 && r.height > 0) {
    return {
      cx: r.left + r.width * 0.44,
      cy: r.top + r.height * 0.5,
      R: r.height * 0.13,
    }
  }
  const base = Math.min(W, H)
  return { cx: W * 0.5, cy: H * 0.5, R: base * 0.13 }
}

/** 转场引擎拿到的"夜幕层"句柄（经典转场在霜幕后用作入夜铺垫） */
export interface MoonHandle {
  /** 旧 DOM 月亮已移除（月亮现为 hero WebGL 场景），恒为 null */
  rise: null
  /** 夜幕层（转场引擎逐帧驱动透明度） */
  veil: HTMLElement | null
}
