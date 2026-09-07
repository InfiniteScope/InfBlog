import { createMoonScene } from "@/components/theme/moon-scene"
import { siteConfig } from "@/lib/config"

interface EngineCallbacks {
  onSwap: () => void
  onDone: () => void
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))
const easeOutCubic = (p: number) => 1 - Math.pow(1 - p, 3)

/** 时间轴（秒）：黑幕淡入 + 月升 → 满幕换肤 → 对齐 hero 几何 → 淡出显出新界面 */
const SWAP_AT = 1.55
const FADE_OUT_AT = 2.1
const DURATION = 3.05

/**
 * 「月升」：全屏 WebGL 月之暗面场景覆盖层（z-100，盖住导航/侧栏/全部界面）
 * ——月亮自屏幕下缘升入夜空（uMoon 逐帧驱动，与首页 hero 同一场景模块）。
 * 满幕瞬间完成换肤（含强制深色），随后按 hero 场景的几何重排月亮、
 * 整层淡出——与首页 hero 的画面无缝衔接。
 */
export function playExploreTransition(
  canvas: HTMLCanvasElement,
  cb: EngineCallbacks
): () => void {
  const scene = createMoonScene(canvas, {
    text: siteConfig.name,
    parallax: false,
  })
  if (!scene) {
    cb.onSwap()
    cb.onDone()
    return () => undefined
  }
  scene.resize()

  const W = window.innerWidth
  const H = window.innerHeight

  /* 月亮"家"与起点：先按视口估计，换肤后按 hero 实际几何精调 */
  let homeX = 0.44
  let homeY = 0.5
  let homeR = (Math.min(W, H * 0.92) * 0.13) / H
  const riseFrom = homeY + (H * 0.55 + homeR * H) / H

  let raf = 0
  let swapped = false
  let finished = false
  const t0 = performance.now()

  const dispose = () => {
    cancelAnimationFrame(raf)
    canvas.style.opacity = ""
    scene.dispose()
  }

  const alignToHero = () => {
    const hero = document.getElementById("hero-moon-canvas")
    const r = hero?.getBoundingClientRect()
    if (!r || !r.width || !r.height) return
    homeX = (r.left + r.width * 0.44) / W
    homeY = (r.top + r.height * 0.5) / H
    homeR = (r.height * 0.13) / H
    scene.setMoon(homeX, homeY, homeR)
  }

  const frame = (now: number) => {
    const t = (now - t0) / 1000

    /* 月升：从屏幕下缘升入家中位置 */
    const rise = easeOutCubic(clamp01((t - 0.1) / 1.3))
    scene.setMoon(
      homeX,
      riseFrom + (homeY - riseFrom) * rise,
      homeR
    )

    /* 覆盖层淡入（0→0.6s）与淡出（2.1→3.0s） */
    const fadeIn = easeOutCubic(clamp01(t / 0.6))
    const fadeOut = easeOutCubic(clamp01((t - FADE_OUT_AT) / 0.85))
    canvas.style.opacity = (fadeIn * (1 - fadeOut)).toFixed(3)

    if (!swapped && t >= SWAP_AT) {
      swapped = true
      cb.onSwap()
      /* 满幕下按 hero 实际几何重排月亮，淡出后无缝衔接 */
      alignToHero()
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
