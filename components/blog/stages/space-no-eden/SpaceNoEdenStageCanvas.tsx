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

interface ThemePalette {
  isDark: boolean
  isClassic: boolean
  primaryRgb: string
  accentRgb: string
  moonRgb: string
  moonSubtleRgb: string
  spectrum: string[]
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
      moonRgb: "32, 62, 52",
      moonSubtleRgb: "72, 108, 96",
      spectrum: [
        "198, 72, 72",
        "204, 128, 36",
        "46, 138, 94",
        "22, 142, 138",
        "58, 110, 178",
        "130, 88, 174",
      ],
    }
  }
  if (isClassic) {
    return {
      isDark: true,
      isClassic: true,
      primaryRgb: "184, 214, 196",
      accentRgb: "56, 178, 172",
      moonRgb: "218, 236, 224",
      moonSubtleRgb: "120, 162, 146",
      spectrum: [
        "248, 113, 113",
        "251, 191, 36",
        "74, 222, 128",
        "45, 212, 191",
        "96, 165, 250",
        "167, 139, 250",
      ],
    }
  }
  return {
    isDark: true,
    isClassic: false,
    primaryRgb: "210, 228, 248",
    accentRgb: "34, 211, 238",
    moonRgb: "234, 244, 255",
    moonSubtleRgb: "130, 184, 218",
    spectrum: [
      "248, 113, 113",
      "251, 191, 36",
      "74, 222, 128",
      "34, 211, 238",
      "96, 165, 250",
      "167, 139, 250",
    ],
  }
}

/**
 * 全屏持续演出的核心画布（fixed inset-0 z-0 pointer-events-none）：
 * 1. 严格跟随网站当前深浅色与经典/探索主题配色，自然透出原有背景；
 * 2. 左侧边缘背景：大尺度高精度天文「视差轨道模型」+ 无方框无概要的 SILO_MATRIX / 章节标签；
 * 3. 右上角背景：极简几何「条纹三棱镜月球」——9 道圆角斜纹月弦环抱中央纯净三棱镜，
 *    右侧洁净色散出 6 道平行光谱弦，保留鼠标引力牵引与紧绷琴弦式划过震颤。
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

    // 9 条斜纹月弦 + 6 条色散光谱弦（各自独立阻尼谐振）
    const BAND_COUNT = 9
    const SPEC_COUNT = 6
    const bandOsc: StringOsc[] = Array.from({ length: BAND_COUNT }, (_, i) => ({
      amp: 0,
      vel: 0,
      phase: i * 0.8,
      hitU: 0.5,
    }))
    const specOsc: StringOsc[] = Array.from({ length: SPEC_COUNT }, (_, i) => ({
      amp: 0,
      vel: 0,
      phase: i * 0.9,
      hitU: 0.4,
    }))

    let W = window.innerWidth
    let H = window.innerHeight
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
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
    let moonCenter = { x: W * 0.86, y: H * 0.21, r: 118 }
    const MOON_TILT = -0.36

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
      const speed = Math.min(34, Math.hypot(pdx, pdy))
      if (speed < 0.45) return

      const R = moonCenter.r
      // 1. 拨动月球斜纹弦带（在月球旋转坐标系内判断）
      const cosT = Math.cos(-MOON_TILT)
      const sinT = Math.sin(-MOON_TILT)
      const lx = dx * cosT - dy * sinT
      const ly = dx * sinT + dy * cosT
      const pvyLocal = pdx * sinT + pdy * cosT

      if (Math.hypot(lx, ly) <= R * 1.18) {
        const span = R * 1.56
        const pitch = span / (BAND_COUNT - 1)
        for (let i = 0; i < BAND_COUNT; i++) {
          const bandY = -span * 0.5 + i * pitch
          const distY = Math.abs(ly - bandY)
          if (distY < pitch * 0.9) {
            const falloff = 1 - distY / (pitch * 0.9)
            const dir =
              Math.abs(pvyLocal) > 0.3 ? Math.sign(pvyLocal) : i % 2 === 0 ? 1 : -1
            const impulse = (46 + speed * 4.8) * falloff * dir
            bandOsc[i].vel = Math.max(-175, Math.min(175, bandOsc[i].vel + impulse))
            bandOsc[i].hitU = Math.max(0.15, Math.min(0.85, (lx + R) / (2 * R)))
          }
        }
      }

      // 2. 拨动右侧 6 条色散光谱弦（在正交坐标系内判断）
      if (dx >= 0 && dx <= R * 1.65 && Math.abs(dy) <= R * 0.65) {
        for (let i = 0; i < SPEC_COUNT; i++) {
          const frac = (i - (SPEC_COUNT - 1) / 2) / ((SPEC_COUNT - 1) / 2)
          const u = Math.max(0, Math.min(1, dx / (R * 1.45)))
          const rayY = R * (0.04 + frac * 0.08 + u * (0.05 + frac * 0.24))
          const distY = Math.abs(dy - rayY)
          if (distY < 14) {
            const falloff = 1 - distY / 14
            const dir = Math.abs(pdy) > 0.3 ? Math.sign(pdy) : i % 2 === 0 ? 1 : -1
            const impulse = (38 + speed * 4.2) * falloff * dir
            specOsc[i].vel = Math.max(-145, Math.min(145, specOsc[i].vel + impulse))
            specOsc[i].hitU = Math.max(0.12, Math.min(0.88, u))
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
        audioEnergy = 0.05 + Math.sin(t * 2.1) * 0.025
      }

      // 高张力紧绷弦物理（STIFFNESS=760, DAMPING=15.5）
      const STIFFNESS = 760
      const DAMPING = 15.5
      for (const arr of [bandOsc, specOsc]) {
        for (let i = 0; i < arr.length; i++) {
          const s = arr[i]
          const accel = -STIFFNESS * s.amp - DAMPING * s.vel
          s.vel += accel * dt
          s.amp += s.vel * dt
          s.phase += dt * (48 + i * 2.5)
        }
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

      // 3. 右上角悬挂的「极简条纹三棱镜月球」+ 引力牵引 + 紧绷琴弦震颤
      const rightMargin = Math.max(0, W - layoutRect.articleRight)
      const hasWideRight = rightMargin >= 165
      const baseMoonCx = hasWideRight
        ? Math.max(
            layoutRect.articleRight + rightMargin * 0.52,
            W - Math.max(150, rightMargin * 0.44)
          )
        : W * 0.85
      const baseMoonCy = Math.max(155, Math.min(200, H * 0.21))
      const moonR = hasWideRight
        ? Math.min(rightMargin * 0.32, Math.min(H * 0.155, 122))
        : Math.min(W, H) * 0.12

      if (hasPointer && !reduced) {
        const dxG = mouseX - baseMoonCx
        const dyG = mouseY - baseMoonCy
        const distG = Math.hypot(dxG, dyG)
        const nearBoost =
          distG < moonR * 2.5 ? 1 + (1 - distG / (moonR * 2.5)) * 0.65 : 1
        const targetGx = (mouseX / Math.max(1, W) - 0.5) * 44 * nearBoost
        const targetGy = (mouseY / Math.max(1, H) - 0.5) * 34 * nearBoost
        moonGravX += (targetGx - moonGravX) * 0.055
        moonGravY += (targetGy - moonGravY) * 0.055
      }

      const moonCx = baseMoonCx + moonGravX
      const moonCy = baseMoonCy + moonGravY
      moonCenter = { x: moonCx, y: moonCy, r: moonR }

      const moonAlpha = hasWideRight ? 0.86 : 0.34
      const span = moonR * 1.54
      const pitch = span / (BAND_COUNT - 1)
      const bandWidth = Math.max(4, pitch * 0.46)

      // 棱镜三角形几何（中心略偏右下方，居于月轮核心）
      const triR = moonR * 0.39
      const triTop = { x: 0, y: -triR * 1.04 }
      const triLeft = { x: -triR * 0.94, y: triR * 0.68 }
      const triRight = { x: triR * 0.94, y: triR * 0.68 }

      // 旋转到月球视角计算每条斜纹与棱镜外留白边界的裁切点（保证棱镜周围纯净无穿插）
      const cosInv = Math.cos(-MOON_TILT)
      const sinInv = Math.sin(-MOON_TILT)
      const toMoonLocal = (pt: { x: number; y: number }) => ({
        x: pt.x * cosInv - pt.y * sinInv,
        y: pt.x * sinInv + pt.y * cosInv,
      })

      ctx.save()
      ctx.translate(moonCx, moonCy)

      // A. 右侧细微月弧轮廓（仅在暗面勾勒一弯极简虚线月缘，与左侧条纹共同构成完整圆月）
      ctx.beginPath()
      ctx.arc(0, 0, moonR, -1.18, 1.18)
      ctx.strokeStyle = `rgba(${pal.moonSubtleRgb}, ${0.22 * moonAlpha})`
      ctx.lineWidth = 1
      ctx.setLineDash([2, 5])
      ctx.stroke()
      ctx.setLineDash([])

      // B. 月轮 9 道圆角斜纹（平顺新月弧切口 + 避让中心棱镜负空间，无任何杂乱重叠线）
      ctx.save()
      ctx.rotate(MOON_TILT)
      const prismHaloR = triR * 1.12
      const prismLocalPts = [triTop, triLeft, triRight].map(toMoonLocal)
      const prismYMin = Math.min(...prismLocalPts.map((p) => p.y)) - 8
      const prismYMax = Math.max(...prismLocalPts.map((p) => p.y)) + 8

      for (let i = 0; i < BAND_COUNT; i++) {
        const y0 = -span * 0.5 + i * pitch
        if (Math.abs(y0) >= moonR * 0.94) continue

        // 圆角端点向内缩进 bandWidth/2，让轮廓完美贴合半径 moonR 的圆形
        const chordMax = Math.sqrt(Math.max(0, moonR * moonR - y0 * y0))
        const xLeft = -chordMax + bandWidth * 0.52

        // 平滑新月内弧（以右偏心圆弧切出优雅新月负空间，告别锯齿台阶）
        const crescentOffset = moonR * 0.34
        const crescentR = moonR * 0.88
        const crescentDy = y0 + moonR * 0.08
        const crescentSpan = Math.sqrt(
          Math.max(0, crescentR * crescentR - crescentDy * crescentDy)
        )
        let xRight = crescentOffset - crescentSpan * 0.52 - (smoothScroll - 0.5) * moonR * 0.12

        // 避让中心三棱镜负空间护城河（在棱镜投影高度带内自动留出干净呼吸间隙）
        if (y0 >= prismYMin && y0 <= prismYMax) {
          const haloX =
            -Math.sqrt(Math.max(0, prismHaloR * prismHaloR - y0 * y0)) * 0.72
          xRight = Math.min(xRight, haloX)
        }

        if (xRight - xLeft < 4) continue

        const s = bandOsc[i]
        const energy = Math.abs(s.amp) + Math.abs(s.vel) * 0.015
        const audioRipple =
          st.bgmPlaying && !reduced
            ? Math.sin(t * 4.2 + i * 0.9) * audioEnergy * 2.1
            : 0

        const STEPS = 28
        ctx.beginPath()
        for (let k = 0; k <= STEPS; k++) {
          const u = k / STEPS
          const x = xLeft + u * (xRight - xLeft)
          const endPin = Math.sin(u * Math.PI)
          const focus = Math.exp(-Math.abs(u - s.hitU) * 2.6)
          const wave =
            Math.sin(u * Math.PI * 2) * 0.35 +
            Math.sin(u * Math.PI * 4 + s.phase) * 0.45 * focus +
            Math.cos(u * Math.PI * 6 - s.phase * 1.4) * 0.2 * focus
          const aWave = Math.sin(u * Math.PI * 2 + t * 5 + i) * audioRipple
          const y = y0 + endPin * (s.amp * wave + aWave)
          if (k === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        }

        const excite = Math.min(0.45, energy * 0.04)
        ctx.lineCap = "round"
        ctx.lineJoin = "round"
        ctx.lineWidth = bandWidth
        ctx.strokeStyle =
          excite > 0.14
            ? `rgba(${pal.accentRgb}, ${0.88 * moonAlpha})`
            : `rgba(${pal.moonRgb}, ${0.82 * moonAlpha})`
        ctx.stroke()
      }
      ctx.restore()

      // C. 干净的入射光束 -> 中心三棱镜 -> 右侧 6 道平行微扇光谱弦（零交叉干扰）
      const entryPt = {
        x: (triTop.x + triLeft.x) * 0.52,
        y: (triTop.y + triLeft.y) * 0.52,
      }
      // 入射光线顺着月亮斜纹同一俯仰角 (-20.5°) 穿过月弧直抵棱镜左腰
      const beamStart = {
        x: -moonR * 1.12,
        y: entryPt.y + moonR * 0.36,
      }
      ctx.beginPath()
      ctx.moveTo(beamStart.x, beamStart.y)
      ctx.lineTo(entryPt.x, entryPt.y)
      ctx.lineCap = "round"
      ctx.strokeStyle = `rgba(${pal.moonRgb}, ${0.78 * moonAlpha})`
      ctx.lineWidth = 1.6
      ctx.stroke()

      // 出射 6 条光谱色散弦（干净向右上方/右下方扇形舒展，可被鼠标直接拨动）
      const exitBaseX = (triTop.x + triRight.x) * 0.5
      const exitBaseY = (triTop.y + triRight.y) * 0.5
      for (let idx = 0; idx < SPEC_COUNT; idx++) {
        const frac = (idx - (SPEC_COUNT - 1) / 2) / ((SPEC_COUNT - 1) / 2)
        const sx0 = exitBaseX + frac * (triR * 0.13)
        const sy0 = exitBaseY + frac * (triR * 0.24)
        const ex1 = moonR * 1.42
        const ey1 = sy0 + moonR * (0.06 + frac * 0.26)
        const osc = specOsc[idx]
        const audioRay =
          st.bgmPlaying && !reduced
            ? Math.sin(t * 4.8 + idx * 0.85) * audioEnergy * 2.0
            : 0

        ctx.beginPath()
        for (let step = 0; step <= 24; step++) {
          const u = step / 24
          const px = sx0 + (ex1 - sx0) * u
          const endPin = Math.sin(u * Math.PI)
          const focus = Math.exp(-Math.abs(u - osc.hitU) * 2.4)
          const wave =
            Math.sin(u * Math.PI * 2) * 0.4 +
            Math.sin(u * Math.PI * 4 + osc.phase) * 0.6 * focus
          const py =
            sy0 +
            (ey1 - sy0) * u +
            endPin * (osc.amp * wave + Math.sin(u * Math.PI * 2 + t * 6 + idx) * audioRay)
          if (step === 0) ctx.moveTo(px, py)
          else ctx.lineTo(px, py)
        }
        ctx.lineCap = "round"
        ctx.strokeStyle = `rgba(${pal.spectrum[idx]}, ${(pal.isDark ? 0.88 : 0.78) * moonAlpha})`
        ctx.lineWidth = 1.65
        ctx.stroke()
      }

      // 棱镜内部柔和色散光锥（不糊边）
      const innerGrad = ctx.createLinearGradient(
        entryPt.x,
        entryPt.y,
        exitBaseX,
        exitBaseY + triR * 0.14
      )
      innerGrad.addColorStop(0, `rgba(${pal.moonRgb}, ${0.26 * moonAlpha})`)
      innerGrad.addColorStop(1, `rgba(${pal.accentRgb}, ${0.12 * moonAlpha})`)
      ctx.beginPath()
      ctx.moveTo(entryPt.x, entryPt.y)
      ctx.lineTo(exitBaseX - triR * 0.08, exitBaseY - triR * 0.16)
      ctx.lineTo(exitBaseX + triR * 0.14, exitBaseY + triR * 0.24)
      ctx.closePath()
      ctx.fillStyle = innerGrad
      ctx.fill()

      // 棱镜精致双轮廓（纯净几何三角）
      ctx.beginPath()
      ctx.moveTo(triTop.x, triTop.y)
      ctx.lineTo(triRight.x, triRight.y)
      ctx.lineTo(triLeft.x, triLeft.y)
      ctx.closePath()
      ctx.lineJoin = "round"
      ctx.strokeStyle = `rgba(${pal.moonRgb}, ${0.9 * moonAlpha})`
      ctx.lineWidth = 1.6
      ctx.stroke()

      const innerScale = 0.8
      ctx.beginPath()
      ctx.moveTo(triTop.x * innerScale, triTop.y * innerScale + triR * 0.06)
      ctx.lineTo(triRight.x * innerScale, triRight.y * innerScale + triR * 0.03)
      ctx.lineTo(triLeft.x * innerScale, triLeft.y * innerScale + triR * 0.03)
      ctx.closePath()
      ctx.strokeStyle = `rgba(${pal.accentRgb}, ${0.38 * moonAlpha})`
      ctx.lineWidth = 0.75
      ctx.stroke()

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
