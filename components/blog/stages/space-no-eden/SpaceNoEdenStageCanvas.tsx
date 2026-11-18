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

interface MoonString {
  amp: number
  vel: number
  phase: number
  hitX: number
}

interface ThemePalette {
  isDark: boolean
  isClassic: boolean
  primaryRgb: string
  accentRgb: string
  moonRgb: string
  moonMutedRgb: string
  prismFill: string
  spectrum: string[]
}

function readThemePalette(isDark: boolean): ThemePalette {
  const isClassic =
    typeof document !== "undefined" &&
    document.documentElement.classList.contains(UI_CLASSIC_CLASS)

  if (!isDark) {
    // 经典浅色（Moss & Sand）：深苔墨绿 + 青碧点缀 + 矿物光谱
    return {
      isDark: false,
      isClassic,
      primaryRgb: "30, 62, 50",
      accentRgb: "24, 130, 122",
      moonRgb: "28, 56, 46",
      moonMutedRgb: "64, 102, 90",
      prismFill: "rgba(250, 248, 242, 0.84)",
      spectrum: [
        "190, 68, 68",
        "194, 120, 24",
        "45, 134, 89",
        "20, 136, 134",
        "52, 102, 168",
        "124, 82, 165",
      ],
    }
  }
  if (isClassic) {
    // 经典深色（Forest Night）：鼠尾草银绿 + 青色
    return {
      isDark: true,
      isClassic: true,
      primaryRgb: "184, 214, 196",
      accentRgb: "56, 178, 172",
      moonRgb: "218, 236, 224",
      moonMutedRgb: "110, 152, 136",
      prismFill: "rgba(15, 22, 19, 0.82)",
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
  // 探索深色（Terminal Blueprint）：星银白 + 科技青 + 棱镜光谱
  return {
    isDark: true,
    isClassic: false,
    primaryRgb: "210, 228, 248",
    accentRgb: "34, 211, 238",
    moonRgb: "238, 246, 255",
    moonMutedRgb: "120, 178, 210",
    prismFill: "rgba(10, 12, 18, 0.82)",
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
 * 3. 右上角背景：内嵌三棱镜色散光束的斜纹「线条月球」，保留鼠标引力牵引，
 *    鼠标划过时月球弦带与色散射线产生紧绷硬朗的驻波震颤。
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

    // 线条月球 11 条弦带物理状态
    const BAND_COUNT = 11
    const strings: MoonString[] = Array.from({ length: BAND_COUNT }, (_, i) => ({
      amp: 0,
      vel: 0,
      phase: i * 0.7,
      hitX: 0,
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

    // 实时测量文章与侧栏边界
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

    // 鼠标位置、引力牵引（保留 moon-scene.ts 同款平滑跟随）与弦带拨动
    let mouseX = W * 0.5
    let mouseY = H * 0.5
    let hasPointer = false
    let prevMouseX = -9999
    let prevMouseY = -9999
    let moonGravX = 0
    let moonGravY = 0
    let moonCenter = { x: W * 0.85, y: H * 0.23, r: 128 }
    const MOON_TILT = -0.35

    const onPointerMove = (e: PointerEvent) => {
      prevMouseX = !hasPointer ? e.clientX : mouseX
      prevMouseY = !hasPointer ? e.clientY : mouseY
      mouseX = e.clientX
      mouseY = e.clientY
      hasPointer = true

      if (reduced) return

      // 将指针坐标变换到月球的倾斜局部坐标系，检测是否划过弦带
      const dx = mouseX - moonCenter.x
      const dy = mouseY - moonCenter.y
      const cosT = Math.cos(-MOON_TILT)
      const sinT = Math.sin(-MOON_TILT)
      const lx = dx * cosT - dy * sinT
      const ly = dx * sinT + dy * cosT

      const pdx = mouseX - prevMouseX
      const pdy = mouseY - prevMouseY
      const pvyLocal = pdx * sinT + pdy * cosT
      const speed = Math.min(36, Math.hypot(pdx, pdy))

      const R = moonCenter.r
      if (Math.hypot(lx, ly) <= R * 1.2 && speed > 0.5) {
        const span = R * 1.66
        const pitch = span / (BAND_COUNT - 1)
        for (let i = 0; i < BAND_COUNT; i++) {
          const bandY = -span * 0.5 + i * pitch
          const distY = Math.abs(ly - bandY)
          if (distY < pitch * 0.95) {
            const falloff = 1 - distY / (pitch * 0.95)
            const dir =
              Math.abs(pvyLocal) > 0.4 ? Math.sign(pvyLocal) : i % 2 === 0 ? 1 : -1
            // 更紧绷硬朗的脉冲：初速收敛、快衰减
            const impulse = (52 + speed * 5.2) * falloff * dir
            strings[i].vel = Math.max(-195, Math.min(195, strings[i].vel + impulse))
            strings[i].hitX = Math.max(-R, Math.min(R, lx))
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

      // 读取音频低频能量
      let audioEnergy = 0
      const analyser = analyserRef.current
      if (analyser && st.bgmPlaying) {
        analyser.getByteFrequencyData(bins)
        let sum = 0
        for (let i = 0; i < 16; i++) sum += bins[i]
        audioEnergy = sum / (16 * 255)
      } else if (st.bgmPlaying) {
        audioEnergy = 0.06 + Math.sin(t * 2.1) * 0.03
      }

      // 高张力紧绷弦物理（STIFFNESS=720, DAMPING=15，避免 Q 弹软塌，偏钢丝/高频电波质感）
      const STIFFNESS = 720
      const DAMPING = 15
      for (let i = 0; i < BAND_COUNT; i++) {
        const s = strings[i]
        const accel = -STIFFNESS * s.amp - DAMPING * s.vel
        s.vel += accel * dt
        s.amp += s.vel * dt
        s.phase += dt * (46 + i * 2.4)
      }

      ctx.clearRect(0, 0, W, H)

      // 1. 克制星点纹理
      for (const s of stars) {
        const sx = s.nx * W
        const sy = (s.ny * H - smoothScroll * 90 * s.depth + H * 3) % H
        const twinkle = 0.65 + 0.35 * Math.sin(t * (1.1 + s.depth) + s.phase)
        const a = s.alpha * twinkle * (pal.isDark ? 0.72 : 0.35)
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

      // 3. 右上角悬挂的「条纹三棱镜月球」+ 鼠标引力牵引
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

      // 引力牵引（保留 moon-scene.ts 同款平滑跟随，靠近月球时引力略增强）
      if (hasPointer && !reduced) {
        const dxG = mouseX - baseMoonCx
        const dyG = mouseY - baseMoonCy
        const distG = Math.hypot(dxG, dyG)
        const nearBoost = distG < moonR * 2.5 ? 1 + (1 - distG / (moonR * 2.5)) * 0.65 : 1
        const targetGx = ((mouseX / Math.max(1, W)) - 0.5) * 44 * nearBoost
        const targetGy = ((mouseY / Math.max(1, H)) - 0.5) * 34 * nearBoost
        moonGravX += (targetGx - moonGravX) * 0.055
        moonGravY += (targetGy - moonGravY) * 0.055
      }

      const moonCx = baseMoonCx + moonGravX
      const moonCy = baseMoonCy + moonGravY
      moonCenter = { x: moonCx, y: moonCy, r: moonR }

      const moonAlpha = hasWideRight ? 0.82 : 0.34
      const span = moonR * 1.66
      const pitch = span / (BAND_COUNT - 1)
      const bandThickness = Math.max(3.5, pitch * 0.52)

      ctx.save()
      ctx.translate(moonCx, moonCy)
      ctx.rotate(MOON_TILT)

      // 裁剪到圆形月盘内
      ctx.save()
      ctx.beginPath()
      ctx.arc(0, 0, moonR * 1.02, 0, Math.PI * 2)
      ctx.clip()

      // 平均受击能量（同步给三棱镜内光线微震）
      let avgStringEnergy = 0
      for (let i = 0; i < BAND_COUNT; i++) {
        avgStringEnergy += Math.abs(strings[i].amp)
      }
      avgStringEnergy /= BAND_COUNT

      for (let i = 0; i < BAND_COUNT; i++) {
        const y0 = -span * 0.5 + i * pitch
        if (Math.abs(y0) >= moonR * 0.96) continue

        const halfChord = Math.sqrt(Math.max(0, moonR * moonR - y0 * y0))
        const stepBias = ((i % 3) - 1) * 0.12
        const scrollPhaseShift = (smoothScroll - 0.5) * 0.14
        const terminator =
          halfChord *
          Math.max(
            -0.55,
            Math.min(
              0.62,
              0.18 - (y0 / moonR) * 0.35 + stepBias - scrollPhaseShift
            )
          )

        const s = strings[i]
        const energy = Math.abs(s.amp) + Math.abs(s.vel) * 0.015
        const audioRipple =
          st.bgmPlaying && !reduced
            ? Math.sin(t * 4.5 + i * 0.9) * audioEnergy * 2.6
            : 0

        const sampleY = (x: number) => {
          // 硬朗高频驻波：两端锚定、局部锐利高频振荡
          const u = (x + halfChord) / Math.max(1, halfChord * 2)
          const endPin = Math.sin(u * Math.PI)
          const distFromHit = Math.abs(x - s.hitX) / Math.max(1, moonR)
          const localFocus = Math.exp(-distFromHit * 2.4)
          const wave =
            Math.sin(u * Math.PI * 2) * 0.35 +
            Math.sin(u * Math.PI * 4 + s.phase) * 0.45 * localFocus +
            Math.cos(u * Math.PI * 7 - s.phase * 1.4) * 0.2 * localFocus
          const audioWave =
            Math.sin(u * Math.PI * 3 + t * 5 + i) * audioRipple
          return y0 + endPin * (s.amp * wave + audioWave)
        }

        const STEPS = 44
        // A. 暗面细电波弦
        ctx.beginPath()
        for (let k = 0; k <= STEPS; k++) {
          const x = -halfChord + (k / STEPS) * (halfChord * 2)
          const y = sampleY(x)
          if (k === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        }
        const exciteBoost = Math.min(0.45, energy * 0.04)
        ctx.strokeStyle =
          exciteBoost > 0.12
            ? `rgba(${pal.accentRgb}, ${(0.36 + exciteBoost) * moonAlpha})`
            : `rgba(${pal.moonMutedRgb}, ${(0.32 + exciteBoost * 0.4) * moonAlpha})`
        ctx.lineWidth = 1.4
        ctx.stroke()

        // B. 亮面斜纹阶梯带
        if (terminator > -halfChord + 6) {
          const litEnd = Math.min(halfChord, terminator)
          const litSteps = Math.max(
            12,
            Math.round(((litEnd + halfChord) / (halfChord * 2)) * STEPS)
          )
          const halfH = bandThickness * 0.5

          ctx.beginPath()
          for (let k = 0; k <= litSteps; k++) {
            const x = -halfChord + (k / litSteps) * (litEnd + halfChord)
            const y = sampleY(x) - halfH
            if (k === 0) ctx.moveTo(x, y)
            else ctx.lineTo(x, y)
          }
          for (let k = litSteps; k >= 0; k--) {
            const x = -halfChord + (k / litSteps) * (litEnd + halfChord)
            const y = sampleY(x) + halfH
            ctx.lineTo(x, y)
          }
          ctx.closePath()
          ctx.fillStyle =
            exciteBoost > 0.16
              ? `rgba(${pal.accentRgb}, ${0.86 * moonAlpha})`
              : `rgba(${pal.moonRgb}, ${0.84 * moonAlpha})`
          ctx.fill()
        }
      }
      ctx.restore() // 结束月盘圆形裁剪

      // 4. 月球核心「三棱镜」+ 入射白光 + 6 线色散光谱（跟随月球旋转与引力牵引）
      // 取消月球旋转偏移，让三棱镜摆正保持几何对称美感（只随引力微移）
      ctx.rotate(-MOON_TILT)

      const triR = moonR * 0.42
      const triTop = { x: 0, y: -triR * 1.05 }
      const triLeft = { x: -triR * 0.94, y: triR * 0.72 }
      const triRight = { x: triR * 0.94, y: triR * 0.72 }

      // 入射单束光线（从左上方穿过月亮边沿射向棱镜左腰）
      const entryPt = {
        x: (triTop.x + triLeft.x) * 0.48,
        y: (triTop.y + triLeft.y) * 0.48,
      }
      const beamStart = { x: -moonR * 1.06, y: entryPt.y + moonR * 0.2 }
      ctx.beginPath()
      ctx.moveTo(beamStart.x, beamStart.y)
      ctx.lineTo(entryPt.x, entryPt.y)
      ctx.strokeStyle = `rgba(${pal.moonRgb}, ${0.82 * moonAlpha})`
      ctx.lineWidth = 1.8
      ctx.stroke()

      // 棱镜右腰出射 6 条清晰色散光谱线（随弦能量微震）
      const exitBaseX = (triTop.x + triRight.x) * 0.5
      const exitBaseY = (triTop.y + triRight.y) * 0.5
      const specCount = pal.spectrum.length
      for (let idx = 0; idx < specCount; idx++) {
        const frac = (idx - (specCount - 1) / 2) / ((specCount - 1) / 2)
        const sy0 = exitBaseY + frac * (triR * 0.22)
        const sx0 = exitBaseX + frac * (triR * 0.12)
        const ex1 = moonR * 1.38
        const ey1 = sy0 + moonR * (0.14 + frac * 0.24)
        const rayAmp = Math.min(3.5, avgStringEnergy * 0.45 + audioEnergy * 2)

        ctx.beginPath()
        for (let step = 0; step <= 18; step++) {
          const u = step / 18
          const px = sx0 + (ex1 - sx0) * u
          const py =
            sy0 +
            (ey1 - sy0) * u +
            Math.sin(u * Math.PI * 3 + t * 8 + idx) * rayAmp * Math.sin(u * Math.PI)
          if (step === 0) ctx.moveTo(px, py)
          else ctx.lineTo(px, py)
        }
        ctx.strokeStyle = `rgba(${pal.spectrum[idx]}, ${(pal.isDark ? 0.85 : 0.72) * moonAlpha})`
        ctx.lineWidth = 1.65
        ctx.stroke()
      }

      // 棱镜半透明玻璃本体（干净切开背后条纹）
      ctx.beginPath()
      ctx.moveTo(triTop.x, triTop.y)
      ctx.lineTo(triRight.x, triRight.y)
      ctx.lineTo(triLeft.x, triLeft.y)
      ctx.closePath()
      ctx.fillStyle = pal.prismFill
      ctx.fill()

      // 棱镜内部折射光带（从左腰渐变分散到右腰）
      const innerGrad = ctx.createLinearGradient(
        entryPt.x,
        entryPt.y,
        exitBaseX,
        exitBaseY + triR * 0.16
      )
      innerGrad.addColorStop(0, `rgba(${pal.moonRgb}, ${0.32 * moonAlpha})`)
      innerGrad.addColorStop(1, `rgba(${pal.accentRgb}, ${0.14 * moonAlpha})`)
      ctx.beginPath()
      ctx.moveTo(entryPt.x, entryPt.y)
      ctx.lineTo(exitBaseX - triR * 0.08, exitBaseY - triR * 0.14)
      ctx.lineTo(exitBaseX + triR * 0.14, exitBaseY + triR * 0.24)
      ctx.closePath()
      ctx.fillStyle = innerGrad
      ctx.fill()

      // 棱镜双层锐利轮廓线
      ctx.beginPath()
      ctx.moveTo(triTop.x, triTop.y)
      ctx.lineTo(triRight.x, triRight.y)
      ctx.lineTo(triLeft.x, triLeft.y)
      ctx.closePath()
      ctx.strokeStyle = `rgba(${pal.moonRgb}, ${0.92 * moonAlpha})`
      ctx.lineWidth = 1.6
      ctx.stroke()

      const innerScale = 0.82
      ctx.beginPath()
      ctx.moveTo(triTop.x * innerScale, triTop.y * innerScale + triR * 0.06)
      ctx.lineTo(triRight.x * innerScale, triRight.y * innerScale + triR * 0.03)
      ctx.lineTo(triLeft.x * innerScale, triLeft.y * innerScale + triR * 0.03)
      ctx.closePath()
      ctx.strokeStyle = `rgba(${pal.accentRgb}, ${0.42 * moonAlpha})`
      ctx.lineWidth = 0.8
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
