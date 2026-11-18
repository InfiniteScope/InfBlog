"use client"

import { useEffect, useRef } from "react"
import { Radio, SkipForward } from "lucide-react"

import { createNoEdenShaderScene } from "./no-eden-shader"
import { useSpaceNoEdenStage } from "./stage-context"

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))
const easeOutCubic = (p: number) => 1 - Math.pow(1 - p, 3)
const easeInOutCubic = (p: number) =>
  p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2

const DURATION = 3.25
const FADE_OUT_AT = 2.25

/**
 * 全屏开篇剧场序幕（fixed inset-0 z-[95]，覆盖导航与侧栏）：
 * - 底层：WebGL 全屏日食月 + FBM 星尘 + 棱镜色散 + 折射文字
 * - 顶层：2D Canvas 全屏蛇夫座雷达脉冲、视差双基线准星扫屏、示波波形与遥测字幕
 */
export function SpaceNoEdenCurtain() {
  const {
    active,
    curtainOpen,
    dismissCurtain,
    bgmTrack,
    bgmPlaying,
    autoplayBlocked,
    toggleBgmPlay,
    analyserRef,
  } = useSpaceNoEdenStage()

  const rootRef = useRef<HTMLDivElement>(null)
  const glCanvasRef = useRef<HTMLCanvasElement>(null)
  const hudCanvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!active || !curtainOpen) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      dismissCurtain()
      return
    }

    const glCanvas = glCanvasRef.current
    const hudCanvas = hudCanvasRef.current
    const root = rootRef.current
    if (!glCanvas || !hudCanvas || !root) return

    const scene = createNoEdenShaderScene(glCanvas)
    const ctx = hudCanvas.getContext("2d")
    const bins = new Uint8Array(64)

    let W = window.innerWidth
    let H = window.innerHeight
    const resizeHud = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      W = window.innerWidth
      H = window.innerHeight
      hudCanvas.width = Math.round(W * dpr)
      hudCanvas.height = Math.round(H * dpr)
      ctx?.setTransform(dpr, 0, 0, dpr, 0, 0)
      scene?.resize()
    }
    resizeHud()
    window.addEventListener("resize", resizeHud)

    let t0: number | null = null
    let raf = 0
    let finished = false

    const frame = (now: number) => {
      if (t0 === null) t0 = now
      const t = Math.max(0, (now - t0) / 1000)
      const p = clamp01(t / DURATION)

      // 音频能量驱动日食冕与波形
      let energy = 0.18 + Math.sin(t * 3.1) * 0.06
      const analyser = analyserRef.current
      if (analyser) {
        analyser.getByteFrequencyData(bins)
        let sum = 0
        for (let i = 0; i < 24; i++) sum += bins[i]
        const measured = sum / (24 * 255)
        if (measured > 0.01) energy = Math.min(1, measured * 1.45)
      }

      // 1. 更新全屏 WebGL 场景参数
      const rise = easeOutCubic(clamp01(t / 1.15))
      const moonY = 0.14 + (0.52 - 0.14) * rise
      const moonR = Math.min(0.18, (0.24 * W) / Math.max(1, H))
      const eclipse = easeInOutCubic(clamp01((t - 0.35) / 1.55))
      scene?.setState({
        moonX: 0.5,
        moonY,
        moonR,
        eclipse,
        energy,
      })

      // 2. 整体幕布淡入 / 淡出
      const fadeIn = easeOutCubic(clamp01(t / 0.35))
      const fadeOut = easeOutCubic(
        clamp01((t - FADE_OUT_AT) / (DURATION - FADE_OUT_AT))
      )
      root.style.opacity = (fadeIn * (1 - fadeOut)).toFixed(3)

      // 3. 2D Canvas 全屏雷达脉冲、视差双准星、遥测坐标
      if (ctx) {
        ctx.clearRect(0, 0, W, H)
        const cx = W * 0.5
        const cy = H * (1 - moonY)
        const rPx = moonR * H

        // 蛇夫座扩散雷达圆环（自月心向整块屏幕扩散）
        for (let k = 0; k < 3; k++) {
          const waveP = (((t * 0.62 + k * 0.33) % 1) + 1) % 1
          const rad = Math.max(1, rPx * 0.8 + waveP * Math.hypot(W, H) * 0.55)
          const alpha = (1 - waveP) * 0.24 * (1 - fadeOut)
          ctx.beginPath()
          ctx.arc(cx, cy, rad, 0, Math.PI * 2)
          ctx.strokeStyle = `rgba(34, 211, 238, ${alpha})`
          ctx.lineWidth = 1
          ctx.stroke()
        }

        // 左右视差激光基线从屏幕边缘向中央扫拢并交错
        const sweep = easeInOutCubic(clamp01((t - 0.55) / 1.4))
        const leftX = W * 0.06 + sweep * (cx - W * 0.06 - rPx * 1.35)
        const rightX = W * 0.94 - sweep * (W * 0.94 - cx - rPx * 1.35)

        ctx.save()
        ctx.strokeStyle = `rgba(56, 189, 248, ${0.42 * (1 - fadeOut)})`
        ctx.lineWidth = 1
        ctx.setLineDash([4, 6])
        ctx.beginPath()
        ctx.moveTo(leftX, 0)
        ctx.lineTo(leftX, H)
        ctx.moveTo(rightX, 0)
        ctx.lineTo(rightX, H)
        ctx.stroke()
        ctx.setLineDash([])

        // 对准线斜边（三角视差测距示意）
        ctx.strokeStyle = `rgba(165, 243, 252, ${0.28 * sweep * (1 - fadeOut)})`
        ctx.beginPath()
        ctx.moveTo(leftX, H * 0.85)
        ctx.lineTo(cx, cy)
        ctx.lineTo(rightX, H * 0.85)
        ctx.stroke()

        // 视差基线端点准星
        for (const px of [leftX, rightX]) {
          ctx.beginPath()
          ctx.arc(px, H * 0.85, 6, 0, Math.PI * 2)
          ctx.strokeStyle = `rgba(34, 211, 238, ${0.75 * (1 - fadeOut)})`
          ctx.stroke()
        }
        ctx.restore()

        // 底部全宽示波波形线
        ctx.beginPath()
        const waveY = H * 0.85
        for (let x = 0; x <= W; x += 8) {
          const norm = x / W
          const env = Math.sin(norm * Math.PI)
          const idx = Math.floor(norm * 40) % 40
          const binVal = analyser ? bins[idx] / 255 : 0
          const amp = (10 + energy * 34 + binVal * 26) * env
          const y =
            waveY +
            Math.sin(norm * 24 + t * 5.2) * amp * 0.55 +
            Math.cos(norm * 11 - t * 3.1) * amp * 0.45
          if (x === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        }
        ctx.strokeStyle = `rgba(34, 211, 238, ${0.45 * (1 - fadeOut)})`
        ctx.lineWidth = 1.4
        ctx.stroke()

        // 中央档案序幕文字
        const textAlpha =
          easeOutCubic(clamp01((t - 0.35) / 0.5)) * (1 - fadeOut)
        ctx.save()
        ctx.textAlign = "center"
        ctx.fillStyle = `rgba(165, 243, 252, ${0.82 * textAlpha})`
        ctx.font = '600 11px ui-monospace, SFMono-Regular, Menlo, monospace'
        ctx.fillText(
          `OPHIUCHUS_RX // 2047   ·   ECLIPSE ${Math.round(eclipse * 100)}%   ·   ACTIVATE STAGE`,
          cx,
          cy + rPx + 42
        )

        ctx.fillStyle = `rgba(248, 250, 252, ${0.95 * textAlpha})`
        ctx.font = '700 32px "Segoe UI", "Microsoft YaHei", sans-serif'
        ctx.fillText("太空非伊甸", cx, cy + rPx + 82)

        ctx.fillStyle = `rgba(148, 163, 184, ${0.85 * textAlpha})`
        ctx.font = '400 13px "Segoe UI", "Microsoft YaHei", sans-serif'
        const subText =
          p < 0.55
            ? "月球其实并没有所谓的“暗面”——"
            : "从物理本质上讲，它通体皆暗。"
        ctx.fillText(subText, cx, cy + rPx + 110)
        ctx.restore()
      }

      if (t >= DURATION) {
        if (!finished) {
          finished = true
          dismissCurtain()
        }
        return
      }
      raf = requestAnimationFrame(frame)
    }

    raf = requestAnimationFrame(frame)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener("resize", resizeHud)
      scene?.dispose()
    }
  }, [active, curtainOpen, dismissCurtain, analyserRef])

  if (!active || !curtainOpen) return null

  const handleCurtainClick = () => {
    if (bgmTrack && !bgmPlaying && autoplayBlocked) {
      toggleBgmPlay()
    }
  }

  return (
    <div
      ref={rootRef}
      onClick={handleCurtainClick}
      className="fixed inset-0 z-[95] select-none bg-[#02040a]"
      style={{ opacity: 0 }}
    >
      <canvas
        ref={glCanvasRef}
        aria-hidden
        className="absolute inset-0 h-full w-full"
      />
      <canvas
        ref={hudCanvasRef}
        aria-hidden
        className="pointer-events-none absolute inset-0 h-full w-full"
      />

      {/* 顶部控制条：跳过序幕 / 唤醒伴音 */}
      <div className="absolute right-5 top-5 z-10 flex items-center gap-2.5">
        {bgmTrack && autoplayBlocked && !bgmPlaying && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              toggleBgmPlay()
            }}
            className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-mono text-xs backdrop-blur-md transition-colors"
            style={{
              borderColor: "rgba(34, 211, 238, 0.7)",
              backgroundColor: "rgba(6, 182, 212, 0.18)",
              color: "#a5f3fc",
            }}
          >
            <Radio className="h-3.5 w-3.5 animate-pulse" />
            接通 Everglow 信号
          </button>
        )}

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            if (bgmTrack && !bgmPlaying && autoplayBlocked) {
              toggleBgmPlay()
            }
            dismissCurtain()
          }}
          className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-mono text-xs backdrop-blur-md transition-colors hover:bg-white/10"
          style={{
            borderColor: "rgba(148, 163, 184, 0.45)",
            backgroundColor: "rgba(15, 23, 42, 0.55)",
            color: "#e2e8f0",
          }}
        >
          跳过序幕
          <SkipForward className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}
