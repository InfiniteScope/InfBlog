"use client"

import { useEffect, useRef } from "react"
import { useTheme } from "next-themes"

import { UI_CLASSIC_CLASS } from "@/components/theme/ui-theme"
import { SPACE_NO_EDEN_CHAPTERS } from "./chapters"
import { useSpaceNoEdenStage } from "./stage-context"

function rand(seed: number) {
  let s = seed
  return () => {
    s = (s * 16807 + 19487171) % 2147483647
    return s / 2147483647
  }
}

interface StarDot {
  nx: number
  ny: number
  depth: number
  r: number
  alpha: number
  phase: number
}

interface StringOsc {
  amp: number
  vel: number
  phase: number
  hitU: number
}

type LineStyleKind = "band" | "fine" | "telemetry" | "double"

interface MoonLineSpec {
  yNorm: number
  kind: LineStyleKind
  weight: number
  phaseTerm: number
}

interface ThemePalette {
  isDark: boolean
  isClassic: boolean
  primaryRgb: string
  accentRgb: string
  moonRgb: string
  moonSubtleRgb: string
}

function readThemePalette(isDark: boolean): ThemePalette {
  const isClassic =
    typeof document !== "undefined" &&
    document.documentElement.classList.contains(UI_CLASSIC_CLASS)

  if (!isDark) {
    return {
      isDark: false,
      isClassic,
      primaryRgb: "30, 62, 50",
      accentRgb: "24, 130, 122",
      moonRgb: "30, 58, 48",
      moonSubtleRgb: "64, 100, 88",
    }
  }
  if (isClassic) {
    return {
      isDark: true,
      isClassic: true,
      primaryRgb: "184, 214, 196",
      accentRgb: "56, 178, 172",
      moonRgb: "212, 232, 220",
      moonSubtleRgb: "120, 162, 146",
    }
  }
  return {
    isDark: true,
    isClassic: false,
    primaryRgb: "210, 228, 248",
    accentRgb: "34, 211, 238",
    moonRgb: "226, 240, 255",
    moonSubtleRgb: "130, 184, 218",
  }
}

// 17 条形态多样的球面纬线/遥测弦：粗亮带 + 细经纬线 + 脉冲虚线 + 双平行微弦
const MOON_LINE_SPECS: MoonLineSpec[] = [
  { yNorm: -0.84, kind: "telemetry", weight: 1.1, phaseTerm: 0.2 },
  { yNorm: -0.73, kind: "fine", weight: 1.2, phaseTerm: 0.45 },
  { yNorm: -0.62, kind: "band", weight: 3.8, phaseTerm: 0.35 },
  { yNorm: -0.51, kind: "double", weight: 0.9, phaseTerm: 0.5 },
  { yNorm: -0.4, kind: "band", weight: 4.8, phaseTerm: 0.28 },
  { yNorm: -0.29, kind: "telemetry", weight: 1.3, phaseTerm: 0.65 },
  { yNorm: -0.18, kind: "band", weight: 4.2, phaseTerm: 0.32 },
  { yNorm: -0.07, kind: "fine", weight: 1.4, phaseTerm: 0.7 },
  { yNorm: 0.04, kind: "double", weight: 1.0, phaseTerm: 0.55 },
  { yNorm: 0.15, kind: "band", weight: 5.0, phaseTerm: 0.25 },
  { yNorm: 0.26, kind: "telemetry", weight: 1.2, phaseTerm: 0.6 },
  { yNorm: 0.37, kind: "band", weight: 3.6, phaseTerm: 0.3 },
  { yNorm: 0.48, kind: "fine", weight: 1.3, phaseTerm: 0.55 },
  { yNorm: 0.59, kind: "double", weight: 0.9, phaseTerm: 0.48 },
  { yNorm: 0.7, kind: "band", weight: 2.8, phaseTerm: 0.22 },
  { yNorm: 0.8, kind: "telemetry", weight: 1.1, phaseTerm: 0.4 },
  { yNorm: 0.89, kind: "fine", weight: 1.0, phaseTerm: 0.3 },
]

/**
 * 全屏持续演出的核心画布（fixed inset-0 z-0 pointer-events-none）：
 * 1. 严格跟随网站当前深浅色与经典/探索主题配色，自然透出原有背景；
 * 2. 左侧边缘背景：大尺度高精度天文「视差轨道模型」+ 无方框无概要的 SILO_MATRIX / 章节标签；
 * 3. 右上角背景：更大尺寸、更高透明度的「镂空三棱镜球面线条月球」——
 *    由粗亮带、细纬线、遥测脉冲虚线与双微弦构成球面曲面，中央纯负空间镂空出三棱镜轮廓
 *    （无边框线、无入射/色散光线），保留鼠标引力牵引与克制细腻的弦波微颤。
 */
export function SpaceNoEdenStageCanvas() {
  const {
    active,
    scrollProgress,
    chapterIndex,
    bgmPlaying,
    analyserRef,
  } = useSpaceNoEdenStage()
  const { forcedTheme, resolvedTheme } = useTheme()
  const isDark = (forcedTheme ?? resolvedTheme) === "dark"

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stateRef = useRef({
    scrollProgress,
    chapterIndex,
    bgmPlaying,
    isDark,
  })

  useEffect(() => {
    stateRef.current = {
      scrollProgress,
      chapterIndex,
      bgmPlaying,
      isDark,
    }
  }, [scrollProgress, chapterIndex, bgmPlaying, isDark])

  useEffect(() => {
    if (!active) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // 专用于月球负空间镂空（destination-out）的离屏缓冲，不伤及主画布背景星野
    const moonBuffer = document.createElement("canvas")
    const mctx = moonBuffer.getContext("2d")
    if (!mctx) return

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const rng = rand(20261118)
    const stars: StarDot[] = Array.from({ length: 120 }, () => ({
      nx: rng(),
      ny: rng(),
      depth: 0.3 + rng() * 0.85,
      r: 0.6 + Math.pow(rng(), 2.5) * 1.6,
      alpha: 0.16 + rng() * 0.45,
      phase: rng() * Math.PI * 2,
    }))

    const lineOsc: StringOsc[] = MOON_LINE_SPECS.map((_, i) => ({
      amp: 0,
      vel: 0,
      phase: i * 0.75,
      hitU: 0.5,
    }))

    let W = window.innerWidth
    let H = window.innerHeight
    let dpr = Math.min(window.devicePixelRatio || 1, 2)
    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      W = window.innerWidth
      H = window.innerHeight
      canvas.width = Math.round(W * dpr)
      canvas.height = Math.round(H * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    window.addEventListener("resize", resize)

    let layoutRect = {
      mainLeft: 0,
      articleLeft: W * 0.25,
      articleRight: W * 0.75,
    }
    const measureLayout = () => {
      const mainEl = document.querySelector("main")
      const articleEl = document.querySelector("article")
      if (mainEl && articleEl) {
        const mr = mainEl.getBoundingClientRect()
        const ar = articleEl.getBoundingClientRect()
        layoutRect = {
          mainLeft: mr.left,
          articleLeft: ar.left,
          articleRight: ar.right,
        }
      }
    }
    measureLayout()
    const ro =
      typeof ResizeObserver !== "undefined" ? new ResizeObserver(measureLayout) : null
    const mainEl = document.querySelector("main")
    const articleEl = document.querySelector("article")
    if (mainEl) ro?.observe(mainEl)
    if (articleEl) ro?.observe(articleEl)

    let mouseX = W * 0.5
    let mouseY = H * 0.5
    let hasPointer = false
    let prevMouseX = -9999
    let prevMouseY = -9999
    let moonGravX = 0
    let moonGravY = 0
    let moonCenter = { x: W * 0.85, y: H * 0.22, r: 158 }
    const MOON_TILT = -0.28 // 约 -16° 轻斜角

    const onPointerMove = (e: PointerEvent) => {
      prevMouseX = !hasPointer ? e.clientX : mouseX
      prevMouseY = !hasPointer ? e.clientY : mouseY
      mouseX = e.clientX
      mouseY = e.clientY
      hasPointer = true

      if (reduced) return

      const dx = mouseX - moonCenter.x
      const dy = mouseY - moonCenter.y
      const pdx = mouseX - prevMouseX
      const pdy = mouseY - prevMouseY
      const speed = Math.min(28, Math.hypot(pdx, pdy))
      if (speed < 0.5) return

      const R = moonCenter.r
      const cosT = Math.cos(-MOON_TILT)
      const sinT = Math.sin(-MOON_TILT)
      const lx = dx * cosT - dy * sinT
      const ly = dx * sinT + dy * cosT
      const pvyLocal = pdx * sinT + pdy * cosT

      if (Math.hypot(lx, ly) <= R * 1.12) {
        const lineSpacing = (R * 1.78) / MOON_LINE_SPECS.length
        for (let i = 0; i < MOON_LINE_SPECS.length; i++) {
          const lineY = MOON_LINE_SPECS[i].yNorm * R
          const distY = Math.abs(ly - lineY)
          if (distY < lineSpacing * 1.15) {
            const falloff = 1 - distY / (lineSpacing * 1.15)
            const dir =
              Math.abs(pvyLocal) > 0.3 ? Math.sign(pvyLocal) : i % 2 === 0 ? 1 : -1
            // 克制细腻的微幅高张力波动（不再夸张晃动）
            const impulse = (18 + speed * 1.45) * falloff * dir
            lineOsc[i].vel = Math.max(-68, Math.min(68, lineOsc[i].vel + impulse))
            lineOsc[i].hitU = Math.max(0.15, Math.min(0.85, (lx + R) / (2 * R)))
          }
        }
      }
    }
    window.addEventListener("pointermove", onPointerMove, { passive: true })

    let smoothScroll = stateRef.current.scrollProgress
    const bins = new Uint8Array(64)
    let t0: number | null = null
    let prevNow: number | null = null
    let raf = 0

    const drawFrame = (now: number) => {
      if (t0 === null) t0 = now
      const dt =
        prevNow === null
          ? 0.016
          : Math.min(0.05, Math.max(0.001, (now - prevNow) / 1000))
      prevNow = now
      const t = Math.max(0, (now - t0) / 1000)

      const st = stateRef.current
      const pal = readThemePalette(st.isDark)
      smoothScroll += (st.scrollProgress - smoothScroll) * 0.08

      let audioEnergy = 0
      const analyser = analyserRef.current
      if (analyser && st.bgmPlaying) {
        analyser.getByteFrequencyData(bins)
        let sum = 0
        for (let i = 0; i < 16; i++) sum += bins[i]
        audioEnergy = sum / (16 * 255)
      } else if (st.bgmPlaying) {
        audioEnergy = 0.04 + Math.sin(t * 2.1) * 0.02
      }

      // 高刚度紧绷微颤弹簧（STIFFNESS=920, DAMPING=22 -> 锐利微震、极快收敛）
      const STIFFNESS = 920
      const DAMPING = 22
      for (let i = 0; i < lineOsc.length; i++) {
        const s = lineOsc[i]
        const accel = -STIFFNESS * s.amp - DAMPING * s.vel
        s.vel += accel * dt
        s.amp += s.vel * dt
        s.phase += dt * (44 + i * 1.8)
      }

      ctx.clearRect(0, 0, W, H)

      // 1. 克制星点纹理
      for (const s of stars) {
        const sx = s.nx * W
        const sy = (s.ny * H - smoothScroll * 90 * s.depth + H * 3) % H
        const twinkle = 0.65 + 0.35 * Math.sin(t * (1.1 + s.depth) + s.phase)
        const a = s.alpha * twinkle * (pal.isDark ? 0.7 : 0.34)
        ctx.fillStyle = `rgba(${pal.primaryRgb}, ${a})`
        ctx.beginPath()
        ctx.arc(sx, sy, s.r, 0, Math.PI * 2)
        ctx.fill()
      }

      // 2. 左侧边缘背景：大尺度高精度「视差轨道模型」（无方框、无概要）
      const leftMargin = Math.max(0, layoutRect.articleLeft - layoutRect.mainLeft)
      const chapter =
        SPACE_NO_EDEN_CHAPTERS[st.chapterIndex] ?? SPACE_NO_EDEN_CHAPTERS[0]
      if (leftMargin >= 110 || W >= 1024) {
        const hasWideLeft = leftMargin >= 170
        const pxCx = hasWideLeft
          ? layoutRect.mainLeft + leftMargin * 0.48
          : layoutRect.mainLeft + 74
        const pxCy = H * 0.52
        const modelR = hasWideLeft
          ? Math.min(leftMargin * 0.43, Math.min(H * 0.28, 175))
          : 92
        const modelAlpha = hasWideLeft ? 0.74 : 0.24

        ctx.save()
        ctx.strokeStyle = `rgba(${pal.primaryRgb}, ${0.22 * modelAlpha})`
        ctx.lineWidth = 0.9
        ctx.beginPath()
        ctx.arc(pxCx, pxCy, modelR, 0, Math.PI * 2)
        ctx.stroke()

        for (let deg = 0; deg < 360; deg += 5) {
          const rad = (deg * Math.PI) / 180
          const isMajor = deg % 30 === 0
          const rIn = modelR - (isMajor ? 9 : 4)
          ctx.beginPath()
          ctx.moveTo(pxCx + Math.cos(rad) * rIn, pxCy + Math.sin(rad) * rIn)
          ctx.lineTo(
            pxCx + Math.cos(rad) * modelR,
            pxCy + Math.sin(rad) * modelR
          )
          ctx.strokeStyle = `rgba(${pal.primaryRgb}, ${(isMajor ? 0.55 : 0.22) * modelAlpha})`
          ctx.lineWidth = isMajor ? 1.1 : 0.7
          ctx.stroke()
        }

        ctx.strokeStyle = `rgba(${pal.primaryRgb}, ${0.18 * modelAlpha})`
        ctx.lineWidth = 0.75
        ctx.setLineDash([3, 5])
        ctx.beginPath()
        ctx.arc(pxCx, pxCy, modelR * 0.62, 0, Math.PI * 2)
        ctx.stroke()
        ctx.setLineDash([])

        ctx.beginPath()
        ctx.moveTo(pxCx - modelR * 1.12, pxCy)
        ctx.lineTo(pxCx + modelR * 1.12, pxCy)
        ctx.moveTo(pxCx, pxCy - modelR * 1.48)
        ctx.lineTo(pxCx, pxCy + modelR * 1.12)
        ctx.strokeStyle = `rgba(${pal.primaryRgb}, ${0.16 * modelAlpha})`
        ctx.stroke()

        const orbitTilt = -0.26
        const rx = modelR * 0.92
        const ry = modelR * 0.42
        ctx.save()
        ctx.translate(pxCx, pxCy)
        ctx.rotate(orbitTilt)
        ctx.beginPath()
        ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(${pal.accentRgb}, ${0.65 * modelAlpha})`
        ctx.lineWidth = 1.25
        ctx.stroke()

        ctx.beginPath()
        ctx.ellipse(rx * 0.14, 0, rx * 0.76, ry * 0.74, 0, 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(${pal.primaryRgb}, ${0.28 * modelAlpha})`
        ctx.lineWidth = 0.85
        ctx.setLineDash([4, 4])
        ctx.stroke()
        ctx.setLineDash([])
        ctx.restore()

        const theta =
          smoothScroll * Math.PI * 1.25 + (reduced ? 0.35 : t * 0.08)
        const cosO = Math.cos(orbitTilt)
        const sinO = Math.sin(orbitTilt)
        const localP1 = { x: Math.cos(theta) * rx, y: Math.sin(theta) * ry }
        const localP2 = { x: -localP1.x, y: -localP1.y }
        const p1 = {
          x: pxCx + localP1.x * cosO - localP1.y * sinO,
          y: pxCy + localP1.x * sinO + localP1.y * cosO,
        }
        const p2 = {
          x: pxCx + localP2.x * cosO - localP2.y * sinO,
          y: pxCy + localP2.x * sinO + localP2.y * cosO,
        }
        const starTarget = { x: pxCx, y: pxCy - modelR * 1.38 }

        ctx.beginPath()
        ctx.moveTo(p1.x, p1.y)
        ctx.lineTo(p2.x, p2.y)
        ctx.strokeStyle = `rgba(${pal.primaryRgb}, ${0.42 * modelAlpha})`
        ctx.lineWidth = 0.95
        ctx.setLineDash([3, 4])
        ctx.stroke()
        ctx.setLineDash([])

        ctx.beginPath()
        ctx.moveTo(p1.x, p1.y)
        ctx.lineTo(starTarget.x, starTarget.y)
        ctx.lineTo(p2.x, p2.y)
        ctx.strokeStyle = `rgba(${pal.accentRgb}, ${0.72 * modelAlpha})`
        ctx.lineWidth = 1.15
        ctx.stroke()

        const a1 = Math.atan2(p1.y - starTarget.y, p1.x - starTarget.x)
        const a2 = Math.atan2(p2.y - starTarget.y, p2.x - starTarget.x)
        const aMin = Math.min(a1, a2)
        const aMax = Math.max(a1, a2)
        if (aMax - aMin < Math.PI) {
          ctx.beginPath()
          ctx.arc(starTarget.x, starTarget.y, 26, aMin, aMax)
          ctx.strokeStyle = `rgba(${pal.accentRgb}, ${0.8 * modelAlpha})`
          ctx.lineWidth = 1.1
          ctx.stroke()
        }

        for (const pt of [p1, p2]) {
          ctx.beginPath()
          ctx.arc(pt.x, pt.y, 4.2, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(${pal.accentRgb}, ${0.95 * modelAlpha})`
          ctx.fill()
          ctx.beginPath()
          ctx.arc(pt.x, pt.y, 8, 0, Math.PI * 2)
          ctx.strokeStyle = `rgba(${pal.accentRgb}, ${0.42 * modelAlpha})`
          ctx.lineWidth = 0.9
          ctx.stroke()
        }

        ctx.strokeStyle = `rgba(${pal.accentRgb}, ${0.95 * modelAlpha})`
        ctx.lineWidth = 1.2
        ctx.beginPath()
        ctx.moveTo(starTarget.x - 8, starTarget.y)
        ctx.lineTo(starTarget.x + 8, starTarget.y)
        ctx.moveTo(starTarget.x, starTarget.y - 8)
        ctx.lineTo(starTarget.x, starTarget.y + 8)
        ctx.stroke()

        if (hasWideLeft) {
          const parallaxArcsec = ((smoothScroll - 0.5) * 1.54).toFixed(3)
          ctx.save()
          ctx.textAlign = "center"
          ctx.font = '600 11px ui-monospace, SFMono-Regular, Menlo, monospace'
          ctx.fillStyle = `rgba(${pal.accentRgb}, ${0.9 * modelAlpha})`
          ctx.fillText(
            `${chapter.code} // ${chapter.tag}`,
            pxCx,
            pxCy + modelR + 24
          )

          ctx.font = '400 10px ui-monospace, SFMono-Regular, Menlo, monospace'
          ctx.fillStyle = `rgba(${pal.primaryRgb}, ${0.65 * modelAlpha})`
          ctx.fillText(
            `Δθ ${parallaxArcsec}″ · ${chapter.distance}`,
            pxCx,
            pxCy + modelR + 40
          )
          ctx.restore()
        }
        ctx.restore()
      }

      // 3. 右上角悬挂的「更大尺寸、更高透明度、中央纯镂空三棱镜」球面线条月球
      const rightMargin = Math.max(0, W - layoutRect.articleRight)
      const hasWideRight = rightMargin >= 165
      const moonR = hasWideRight
        ? Math.min(rightMargin * 0.44, Math.min(H * 0.21, 168))
        : Math.min(W, H) * 0.16
      const baseMoonCx = hasWideRight
        ? Math.max(
            layoutRect.articleRight + rightMargin * 0.5,
            W - Math.max(175, rightMargin * 0.48)
          )
        : W * 0.84
      const baseMoonCy = Math.max(moonR + 74, Math.min(230, H * 0.24))

      if (hasPointer && !reduced) {
        const dxG = mouseX - baseMoonCx
        const dyG = mouseY - baseMoonCy
        const distG = Math.hypot(dxG, dyG)
        const nearBoost =
          distG < moonR * 2.4 ? 1 + (1 - distG / (moonR * 2.4)) * 0.55 : 1
        const targetGx = (mouseX / Math.max(1, W) - 0.5) * 40 * nearBoost
        const targetGy = (mouseY / Math.max(1, H) - 0.5) * 30 * nearBoost
        moonGravX += (targetGx - moonGravX) * 0.055
        moonGravY += (targetGy - moonGravY) * 0.055
      }

      const moonCx = baseMoonCx + moonGravX
      const moonCy = baseMoonCy + moonGravY
      moonCenter = { x: moonCx, y: moonCy, r: moonR }

      // 更高透明度：宽屏 0.44（通透不压目录），窄屏 0.22
      const moonAlpha = hasWideRight ? 0.44 : 0.22

      // 准备离屏月球缓冲（尺寸覆盖 moonR * 2 + 留白）
      const pad = 24
      const bufLogical = Math.ceil((moonR + pad) * 2)
      const bufPx = Math.round(bufLogical * dpr)
      if (moonBuffer.width !== bufPx || moonBuffer.height !== bufPx) {
        moonBuffer.width = bufPx
        moonBuffer.height = bufPx
      }
      mctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      mctx.clearRect(0, 0, bufLogical, bufLogical)

      const bc = bufLogical * 0.5
      mctx.save()
      mctx.translate(bc, bc)

      // A. 外缘极简经纬弧线与方位刻度（增加宇宙测绘感，打破单调圆盘）
      mctx.beginPath()
      mctx.arc(0, 0, moonR, 0, Math.PI * 2)
      mctx.strokeStyle = `rgba(${pal.moonSubtleRgb}, 0.28)`
      mctx.lineWidth = 0.9
      mctx.stroke()

      mctx.beginPath()
      mctx.arc(0, 0, moonR * 1.08, -0.75, 0.75)
      mctx.strokeStyle = `rgba(${pal.accentRgb}, 0.38)`
      mctx.lineWidth = 0.85
      mctx.setLineDash([3, 6])
      mctx.stroke()
      mctx.setLineDash([])

      // B. 在倾斜坐标内绘制形态多样的球面纬线弦（裁剪在月盘内）
      mctx.save()
      mctx.rotate(MOON_TILT)
      mctx.beginPath()
      mctx.arc(0, 0, moonR, 0, Math.PI * 2)
      mctx.clip()

      for (let i = 0; i < MOON_LINE_SPECS.length; i++) {
        const spec = MOON_LINE_SPECS[i]
        const y0 = spec.yNorm * moonR
        const halfChord = Math.sqrt(Math.max(0, moonR * moonR - y0 * y0))
        if (halfChord < 6) continue

        // 球面纬线弧度：靠近两极微弓，赤道平直，营造立体球面视错觉
        const latSag = spec.yNorm * moonR * 0.11

        // 优雅新月明暗分界点（随滚动略微变化月相）
        const crescentShift = (smoothScroll - 0.5) * 0.18
        const litRatio = Math.max(
          0.16,
          Math.min(0.88, 0.52 + spec.phaseTerm * 0.28 - crescentShift)
        )
        const xLeft = -halfChord
        const xRight = halfChord

        const s = lineOsc[i]
        const audioMicro =
          st.bgmPlaying && !reduced
            ? Math.sin(t * 3.8 + i * 0.7) * audioEnergy * 1.1
            : 0

        const sampleCurveY = (u: number, offsetY = 0) => {
          const endPin = Math.sin(u * Math.PI)
          const bow = latSag * (1 - Math.pow(u * 2 - 1, 2))
          const focus = Math.exp(-Math.abs(u - s.hitU) * 2.8)
          const oscWave =
            Math.sin(u * Math.PI * 2) * 0.3 +
            Math.sin(u * Math.PI * 4 + s.phase) * 0.48 * focus +
            Math.cos(u * Math.PI * 6 - s.phase * 1.3) * 0.22 * focus
          const aWave = Math.sin(u * Math.PI * 2 + t * 4.5 + i) * audioMicro
          return y0 + offsetY + bow + endPin * (s.amp * oscWave + aWave)
        }

        const STEPS = 36
        const excite = Math.min(0.35, (Math.abs(s.amp) + Math.abs(s.vel) * 0.01) * 0.04)
        const activeColor =
          excite > 0.1
            ? `rgba(${pal.accentRgb}, 0.95)`
            : `rgba(${pal.moonRgb}, 0.9)`

        if (spec.kind === "band") {
          // 亮面粗润圆角弧线 + 暗面纤细延伸线（两段节奏分明）
          mctx.beginPath()
          for (let k = 0; k <= STEPS; k++) {
            const u = (k / STEPS) * litRatio
            const x = xLeft + u * (xRight - xLeft)
            const y = sampleCurveY(u)
            if (k === 0) mctx.moveTo(x, y)
            else mctx.lineTo(x, y)
          }
          mctx.lineCap = "round"
          mctx.lineJoin = "round"
          mctx.lineWidth = spec.weight
          mctx.strokeStyle = activeColor
          mctx.stroke()

          // 暗面轻盈细延长线（从明暗界线略留小缺口后再续）
          const resumeU = Math.min(0.98, litRatio + 0.05)
          if (resumeU < 0.95) {
            mctx.beginPath()
            for (let k = 0; k <= 16; k++) {
              const u = resumeU + (k / 16) * (1 - resumeU)
              const x = xLeft + u * (xRight - xLeft)
              const y = sampleCurveY(u)
              if (k === 0) mctx.moveTo(x, y)
              else mctx.lineTo(x, y)
            }
            mctx.lineWidth = 0.85
            mctx.strokeStyle = `rgba(${pal.moonSubtleRgb}, 0.42)`
            mctx.stroke()
          }
        } else if (spec.kind === "telemetry") {
          // 遥测编码脉冲虚线
          mctx.save()
          mctx.setLineDash([12, 5, 2.5, 5])
          mctx.beginPath()
          for (let k = 0; k <= STEPS; k++) {
            const u = k / STEPS
            const x = xLeft + u * (xRight - xLeft)
            const y = sampleCurveY(u)
            if (k === 0) mctx.moveTo(x, y)
            else mctx.lineTo(x, y)
          }
          mctx.lineCap = "round"
          mctx.lineWidth = spec.weight
          mctx.strokeStyle = `rgba(${pal.accentRgb}, ${0.65 + excite * 0.3})`
          mctx.stroke()
          mctx.restore()
        } else if (spec.kind === "double") {
          // 双平行细弦（谐振共鸣线）
          for (const dy of [-1.7, 1.7]) {
            mctx.beginPath()
            for (let k = 0; k <= STEPS; k++) {
              const u = k / STEPS
              const x = xLeft + u * (xRight - xLeft)
              const y = sampleCurveY(u, dy)
              if (k === 0) mctx.moveTo(x, y)
              else mctx.lineTo(x, y)
            }
            mctx.lineCap = "round"
            mctx.lineWidth = spec.weight
            mctx.strokeStyle = `rgba(${pal.moonRgb}, 0.62)`
            mctx.stroke()
          }
        } else {
          // 连续球面经纬细线
          mctx.beginPath()
          for (let k = 0; k <= STEPS; k++) {
            const u = k / STEPS
            const x = xLeft + u * (xRight - xLeft)
            const y = sampleCurveY(u)
            if (k === 0) mctx.moveTo(x, y)
            else mctx.lineTo(x, y)
          }
          mctx.lineCap = "round"
          mctx.lineWidth = spec.weight
          mctx.strokeStyle = `rgba(${pal.moonSubtleRgb}, 0.68)`
          mctx.stroke()
        }
      }
      mctx.restore() // 结束倾斜+圆形裁剪

      // C. 核心：纯负空间「镂空三棱镜」（不画任何三角形边线、不画任何光线，纯粹以线条断开自然呈现棱镜！）
      mctx.save()
      mctx.globalCompositeOperation = "destination-out"
      const triR = moonR * 0.42
      const triOffsetX = moonR * 0.04
      const triOffsetY = moonR * 0.02
      mctx.beginPath()
      mctx.moveTo(triOffsetX, triOffsetY - triR * 1.08)
      mctx.lineTo(triOffsetX + triR * 0.96, triOffsetY + triR * 0.68)
      mctx.lineTo(triOffsetX - triR * 0.96, triOffsetY + triR * 0.68)
      mctx.closePath()
      mctx.fillStyle = "#000"
      mctx.fill()
      mctx.restore()

      mctx.restore() // 结束离屏缓冲绘制

      // 将镂空后的月球以较高透明度合成到主画布右上角
      ctx.save()
      ctx.globalAlpha = moonAlpha
      ctx.drawImage(
        moonBuffer,
        moonCx - bc,
        moonCy - bc,
        bufLogical,
        bufLogical
      )
      ctx.restore()

      if (!reduced) {
        raf = requestAnimationFrame(drawFrame)
      }
    }

    const onVisibility = () => {
      if (document.hidden) {
        if (raf) cancelAnimationFrame(raf)
        raf = 0
      } else if (!reduced && !raf) {
        prevNow = null
        raf = requestAnimationFrame(drawFrame)
      }
    }
    document.addEventListener("visibilitychange", onVisibility)

    raf = requestAnimationFrame(drawFrame)
    return () => {
      if (raf) cancelAnimationFrame(raf)
      ro?.disconnect()
      window.removeEventListener("resize", resize)
      window.removeEventListener("pointermove", onPointerMove)
      document.removeEventListener("visibilitychange", onVisibility)
    }
  }, [active, analyserRef])

  if (!active) return null

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 h-full w-full"
    />
  )
}
