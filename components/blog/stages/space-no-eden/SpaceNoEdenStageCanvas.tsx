"use client"

import { useEffect, useRef } from "react"

import { SPACE_NO_EDEN_CHAPTERS } from "./chapters"
import { useSpaceNoEdenStage } from "./stage-context"

function rand(seed: number) {
  let s = seed
  return () => {
    s = (s * 16807 + 19487171) % 2147483647
    return s / 2147483647
  }
}

interface StarNode {
  nx: number
  ny: number
  depth: number
  r: number
  alpha: number
  phase: number
  tint: string
}

/**
 * 全屏 6 幕持续宇宙舞台（fixed inset-0 z-0 pointer-events-none）：
 * 占满 100vw × 100vh，随滚动进度、章节切换、鼠标视差以及 Everglow 实时音频频谱联动。
 */
export function SpaceNoEdenStageCanvas() {
  const {
    active,
    scrollProgress,
    chapterIndex,
    isDarkStage,
    bgmPlaying,
    analyserRef,
    antennaBurstSeq,
  } = useSpaceNoEdenStage()

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stateRef = useRef({
    scrollProgress,
    chapterIndex,
    isDarkStage,
    bgmPlaying,
  })
  const burstTimeRef = useRef<number | null>(null)
  const lastBurstSeqRef = useRef(0)

  useEffect(() => {
    stateRef.current = {
      scrollProgress,
      chapterIndex,
      isDarkStage,
      bgmPlaying,
    }
  }, [scrollProgress, chapterIndex, isDarkStage, bgmPlaying])

  useEffect(() => {
    if (antennaBurstSeq > lastBurstSeqRef.current) {
      lastBurstSeqRef.current = antennaBurstSeq
      burstTimeRef.current = performance.now()
    }
  }, [antennaBurstSeq])

  useEffect(() => {
    if (!active) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const canHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches

    const rng = rand(20471118)
    const stars: StarNode[] = Array.from({ length: 220 }, () => {
      const p = rng()
      const tint =
        p < 0.62
          ? "240, 246, 255"
          : p < 0.85
            ? "165, 243, 252"
            : "196, 181, 253"
      return {
        nx: rng(),
        ny: rng(),
        depth: 0.25 + rng() * 0.95,
        r: 0.5 + Math.pow(rng(), 2.6) * 2.1,
        alpha: 0.22 + rng() * 0.72,
        phase: rng() * Math.PI * 2,
        tint,
      }
    })

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

    let ptrX = 0
    let ptrY = 0
    let smoothPtrX = 0
    let smoothPtrY = 0
    const onPointer = (e: PointerEvent) => {
      if (reduced || !canHover) return
      ptrX = (e.clientX / Math.max(1, W) - 0.5) * 2
      ptrY = (e.clientY / Math.max(1, H) - 0.5) * 2
    }
    window.addEventListener("pointermove", onPointer, { passive: true })

    // 平滑章节权重（让 6 幕视觉流畅过渡）
    const actWeights = [1, 0, 0, 0, 0, 0]
    let smoothScroll = stateRef.current.scrollProgress
    const bins = new Uint8Array(64)
    let t0: number | null = null
    let raf = 0

    const drawFrame = (now: number) => {
      if (t0 === null) t0 = now
      const t = Math.max(0, (now - t0) / 1000)
      const st = stateRef.current
      const dark = st.isDarkStage

      smoothScroll += (st.scrollProgress - smoothScroll) * 0.08
      smoothPtrX += (ptrX - smoothPtrX) * 0.06
      smoothPtrY += (ptrY - smoothPtrY) * 0.06

      for (let i = 0; i < 6; i++) {
        const target = i === st.chapterIndex ? 1 : 0
        actWeights[i] += (target - actWeights[i]) * 0.06
      }

      // 读取音频频谱（若可用）或温和呼吸包络
      let bass = 0.08
      let treble = 0.08
      const analyser = analyserRef.current
      let hasLiveAudio = false
      if (analyser && st.bgmPlaying) {
        analyser.getByteFrequencyData(bins)
        let bSum = 0
        let tSum = 0
        for (let i = 0; i < 8; i++) bSum += bins[i]
        for (let i = 16; i < 40; i++) tSum += bins[i]
        const bNorm = bSum / (8 * 255)
        const tNorm = tSum / (24 * 255)
        if (bNorm > 0.005 || tNorm > 0.005) {
          hasLiveAudio = true
          bass = Math.min(1, bNorm * 1.35)
          treble = Math.min(1, tNorm * 1.4)
        }
      }
      if (!hasLiveAudio && st.bgmPlaying) {
        bass = 0.18 + Math.sin(t * 2.2) * 0.08
        treble = 0.16 + Math.cos(t * 3.1) * 0.07
      }

      const chapter =
        SPACE_NO_EDEN_CHAPTERS[st.chapterIndex] ?? SPACE_NO_EDEN_CHAPTERS[0]
      const glow = chapter.glowRgb

      // 0. 深空全屏底色
      ctx.clearRect(0, 0, W, H)
      if (dark) {
        const bg = ctx.createRadialGradient(
          W * 0.65,
          H * 0.25,
          0,
          W * 0.5,
          H * 0.5,
          Math.hypot(W, H) * 0.78
        )
        bg.addColorStop(0, "#091020")
        bg.addColorStop(0.48, "#040711")
        bg.addColorStop(1, "#010206")
        ctx.fillStyle = bg
        ctx.fillRect(0, 0, W, H)
      }

      // 章节全屏星云大光晕
      const nebGrad = ctx.createRadialGradient(
        W * (0.76 - smoothPtrX * 0.03),
        H * (0.26 - smoothPtrY * 0.03),
        0,
        W * 0.76,
        H * 0.26,
        Math.max(W, H) * 0.65
      )
      nebGrad.addColorStop(
        0,
        `rgba(${glow}, ${(dark ? 0.22 : 0.1) + bass * 0.1})`
      )
      nebGrad.addColorStop(0.5, `rgba(${glow}, ${dark ? 0.07 : 0.03})`)
      nebGrad.addColorStop(1, "rgba(0,0,0,0)")
      ctx.fillStyle = nebGrad
      ctx.fillRect(0, 0, W, H)

      // 1. 全屏多景深视差星野
      for (const s of stars) {
        const sx =
          ((s.nx * W - smoothPtrX * 26 * s.depth + W * 2) % W)
        const sy =
          ((s.ny * H - smoothScroll * 140 * s.depth - smoothPtrY * 18 * s.depth + H * 4) %
            H)
        const twinkle =
          0.62 + 0.38 * Math.sin(t * (1.2 + s.depth) + s.phase) + treble * 0.25
        const a = Math.min(1, s.alpha * twinkle * (dark ? 1 : 0.45))
        ctx.fillStyle = dark ? `rgba(${s.tint}, ${a})` : `rgba(15, 23, 42, ${a * 0.45})`
        ctx.beginPath()
        ctx.arc(sx, sy, s.r, 0, Math.PI * 2)
        ctx.fill()
      }

      // 2. 巨型潮汐锁定月球 + 开普勒椭圆轨道 + 终章日食外冕（占满天幕右上视野）
      const moonCx = W * 0.78 - smoothPtrX * 18
      const moonCy = H * (0.28 - smoothScroll * 0.06) - smoothPtrY * 14
      const moonR = Math.min(W, H) * 0.22
      const eclipse = Math.min(1, Math.max(0, (smoothScroll - 0.15) / 0.8))

      ctx.save()
      // 开普勒大椭圆轨道横跨天幕
      ctx.save()
      ctx.translate(moonCx, moonCy)
      ctx.rotate(-0.28)
      ctx.beginPath()
      ctx.ellipse(0, 0, moonR * 2.45, moonR * 0.88, 0, 0, Math.PI * 2)
      ctx.strokeStyle = `rgba(${glow}, ${dark ? 0.24 : 0.16})`
      ctx.lineWidth = 1
      ctx.setLineDash([5, 8])
      ctx.stroke()
      ctx.setLineDash([])
      ctx.restore()

      // 日食外冕（随阅读推进与音频能量增强）
      const coronaR = moonR * (1.35 + eclipse * 0.45 + bass * 0.32)
      const coronaGrad = ctx.createRadialGradient(
        moonCx,
        moonCy,
        moonR * 0.85,
        moonCx,
        moonCy,
        coronaR
      )
      coronaGrad.addColorStop(
        0,
        `rgba(${glow}, ${0.22 + eclipse * 0.38 + bass * 0.2})`
      )
      coronaGrad.addColorStop(0.55, `rgba(${glow}, ${0.08 + eclipse * 0.14})`)
      coronaGrad.addColorStop(1, "rgba(0,0,0,0)")
      ctx.fillStyle = coronaGrad
      ctx.beginPath()
      ctx.arc(moonCx, moonCy, coronaR, 0, Math.PI * 2)
      ctx.fill()

      // 月球本体 + 吞没暗影
      ctx.save()
      ctx.beginPath()
      ctx.arc(moonCx, moonCy, moonR, 0, Math.PI * 2)
      ctx.clip()

      ctx.fillStyle = dark ? "#04060d" : "rgba(15, 23, 42, 0.08)"
      ctx.fillRect(moonCx - moonR, moonCy - moonR, moonR * 2, moonR * 2)

      // 最初的新月银辉（被日食暗影扫去）
      const silverAlpha = (1 - eclipse * 0.9) * (dark ? 0.26 : 0.14)
      const litGrad = ctx.createRadialGradient(
        moonCx + moonR * 0.45,
        moonCy - moonR * 0.35,
        moonR * 0.1,
        moonCx,
        moonCy,
        moonR * 1.1
      )
      litGrad.addColorStop(0, `rgba(226, 242, 255, ${silverAlpha})`)
      litGrad.addColorStop(1, "rgba(0,0,0,0)")
      ctx.fillStyle = litGrad
      ctx.fillRect(moonCx - moonR, moonCy - moonR, moonR * 2, moonR * 2)
      ctx.restore()

      // 耀眼日食环边
      ctx.beginPath()
      ctx.arc(moonCx, moonCy, moonR, 0, Math.PI * 2)
      ctx.strokeStyle = `rgba(${glow}, ${0.35 + eclipse * 0.55 + bass * 0.2})`
      ctx.lineWidth = 1.4 + eclipse * 1.4
      ctx.stroke()
      ctx.restore()

      // 3. 六幕全屏专属演出层（按权重平滑交叉淡入淡出）
      // Act 0: 1967 迷幻合成器极光示波带
      if (actWeights[0] > 0.02) {
        const w0 = actWeights[0] * (dark ? 0.55 : 0.3)
        for (let r = 0; r < 3; r++) {
          ctx.beginPath()
          const baseY = H * (0.58 + r * 0.09)
          for (let x = 0; x <= W; x += 12) {
            const nx = x / W
            const y =
              baseY +
              Math.sin(nx * 6.5 + t * (1.1 + r * 0.35) + r) *
                (28 + bass * 55) +
              Math.cos(nx * 14 - t * 1.8) * (12 + treble * 25)
            if (x === 0) ctx.moveTo(x, y)
            else ctx.lineTo(x, y)
          }
          ctx.strokeStyle =
            r === 0
              ? `rgba(129, 140, 248, ${w0})`
              : r === 1
                ? `rgba(34, 211, 238, ${w0 * 0.85})`
                : `rgba(192, 132, 252, ${w0 * 0.7})`
          ctx.lineWidth = 1.6
          ctx.stroke()
        }
      }

      // Act 1: 2047 蛇夫座全屏雷达扫描弧与遥测矢量
      if (actWeights[1] > 0.02) {
        const w1 = actWeights[1] * (dark ? 0.48 : 0.25)
        const rx = W * 0.2
        const ry = H * 0.36
        const maxRad = Math.max(W, H) * 0.85
        for (let k = 1; k <= 4; k++) {
          ctx.beginPath()
          ctx.arc(rx, ry, (maxRad / 4) * k, -0.5, 1.4)
          ctx.strokeStyle = `rgba(6, 182, 212, ${w1 * 0.5})`
          ctx.lineWidth = 1
          ctx.stroke()
        }
        const scanAng = (t * 0.75) % (Math.PI * 2)
        ctx.beginPath()
        ctx.moveTo(rx, ry)
        ctx.lineTo(
          rx + Math.cos(scanAng) * maxRad,
          ry + Math.sin(scanAng) * maxRad
        )
        ctx.strokeStyle = `rgba(165, 243, 252, ${w1 * 0.85})`
        ctx.lineWidth = 1.4
        ctx.stroke()
      }

      // Act 2: 望远镜下正在塌陷的透视网格 + 筒仓同心环
      if (actWeights[2] > 0.02) {
        const w2 = actWeights[2] * (dark ? 0.45 : 0.25)
        const horizonY = H * 0.62
        const vanishX = W * 0.5 + smoothPtrX * 28
        ctx.save()
        ctx.strokeStyle = `rgba(56, 189, 248, ${w2 * 0.55})`
        ctx.lineWidth = 1
        // 纵向辐射透视线
        for (let i = -8; i <= 8; i++) {
          ctx.beginPath()
          ctx.moveTo(vanishX + i * 24, horizonY)
          ctx.lineTo(vanishX + i * (W * 0.13), H + 20)
          ctx.stroke()
        }
        // 横向渐密地平线（越靠近当下越微震）
        for (let j = 1; j <= 7; j++) {
          const p = Math.pow(j / 7, 1.8)
          const jitter = Math.sin(t * 4 + j * 1.7) * (1.8 + bass * 4)
          const y = horizonY + (H - horizonY) * p + jitter
          ctx.beginPath()
          ctx.moveTo(0, y)
          ctx.lineTo(W, y)
          ctx.stroke()
        }
        ctx.restore()
      }

      // Act 3: 理想纲领——偏移断裂的双轨道基准环
      if (actWeights[3] > 0.02) {
        const w3 = actWeights[3] * (dark ? 0.5 : 0.26)
        const drift = 18 + Math.sin(t * 0.9) * 10 + smoothScroll * 22
        for (const offset of [-drift, drift]) {
          ctx.beginPath()
          ctx.arc(W * 0.5 + offset, H * 0.52, Math.min(W, H) * 0.38, 0, Math.PI * 2)
          ctx.strokeStyle = `rgba(14, 165, 233, ${w3 * 0.6})`
          ctx.setLineDash([10, 10])
          ctx.lineWidth = 1.2
          ctx.stroke()
          ctx.setLineDash([])
        }
      }

      // Act 4: 2001 黑石碑轮廓 + Voyager 跨屏双曲线轨迹
      if (actWeights[4] > 0.02) {
        const w4 = actWeights[4] * (dark ? 0.65 : 0.3)
        // 黑石碑（1:4:9 比例巨物轮廓，位于左中远景）
        const mh = H * 0.56
        const mw = mh * 0.25
        const mx = W * 0.14 - smoothPtrX * 14
        const my = H * 0.5 - mh * 0.5
        ctx.save()
        ctx.fillStyle = `rgba(2, 4, 10, ${0.75 * actWeights[4]})`
        ctx.fillRect(mx, my, mw, mh)
        ctx.strokeStyle = `rgba(147, 197, 253, ${w4 * 0.7})`
        ctx.lineWidth = 1.2
        ctx.strokeRect(mx, my, mw, mh)

        // Voyager 跨屏双曲线抛射轨迹
        ctx.beginPath()
        ctx.moveTo(0, H * 0.88)
        ctx.quadraticCurveTo(W * 0.42, H * 0.18, W, H * 0.06)
        ctx.strokeStyle = `rgba(96, 165, 250, ${w4 * 0.55})`
        ctx.lineWidth = 1.2
        ctx.stroke()

        // 沿轨道飞向深空的遥测光点
        const vp = (t * 0.22) % 1
        const vx = (1 - vp) * (1 - vp) * 0 + 2 * (1 - vp) * vp * (W * 0.42) + vp * vp * W
        const vy =
          (1 - vp) * (1 - vp) * (H * 0.88) +
          2 * (1 - vp) * vp * (H * 0.18) +
          vp * vp * (H * 0.06)
        ctx.beginPath()
        ctx.arc(vx, vy, 3.2, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(191, 219, 254, ${w4})`
        ctx.fill()
        ctx.restore()
      }

      // Act 5: 暗面与视差——全屏双基线激光三角测距准星
      if (actWeights[5] > 0.02) {
        const w5 = actWeights[5] * (dark ? 0.72 : 0.35)
        const targetX = W * 0.5 + smoothPtrX * 40
        const targetY = H * 0.14 + smoothPtrY * 20
        const baseL = { x: W * 0.07 - smoothPtrX * 16, y: H * 0.78 }
        const baseR = { x: W * 0.93 - smoothPtrX * 16, y: H * 0.78 }

        ctx.save()
        ctx.strokeStyle = `rgba(34, 211, 238, ${w5 * 0.6})`
        ctx.lineWidth = 1.1
        ctx.beginPath()
        ctx.moveTo(baseL.x, baseL.y)
        ctx.lineTo(targetX, targetY)
        ctx.lineTo(baseR.x, baseR.y)
        ctx.stroke()

        // 基线连线
        ctx.setLineDash([4, 6])
        ctx.strokeStyle = `rgba(165, 243, 252, ${w5 * 0.35})`
        ctx.beginPath()
        ctx.moveTo(baseL.x, baseL.y)
        ctx.lineTo(baseR.x, baseR.y)
        ctx.stroke()
        ctx.setLineDash([])

        // 远星与双基线观测点
        for (const pt of [baseL, baseR, { x: targetX, y: targetY }]) {
          ctx.beginPath()
          ctx.arc(pt.x, pt.y, 4.5 + bass * 3, 0, Math.PI * 2)
          ctx.strokeStyle = `rgba(34, 211, 238, ${w5})`
          ctx.lineWidth = 1.2
          ctx.stroke()
        }
        ctx.restore()
      }

      // 4. 底部全宽实时音频响应频谱地平线（64 根遥测细针）
      if (st.bgmPlaying || bass > 0.1) {
        const barCount = 64
        const step = W / barCount
        const baseAlpha = dark ? 0.36 : 0.2
        ctx.fillStyle = `rgba(${glow}, ${baseAlpha})`
        for (let i = 0; i < barCount; i++) {
          const mirrorIdx = Math.abs(i - barCount / 2)
          const raw = hasLiveAudio
            ? bins[Math.min(48, Math.floor(mirrorIdx))] / 255
            : Math.max(
                0.08,
                0.24 +
                  0.22 * Math.sin(t * 3.4 + i * 0.32) +
                  0.14 * Math.cos(t * 2.1 - i * 0.2)
              )
          const barH = 4 + raw * 52
          ctx.fillRect(i * step + step * 0.3, H - barH, Math.max(1.5, step * 0.35), barH)
        }
      }

      // 5. 文末天线发射时的全屏电磁脉冲冲击波 + 冲天光柱
      if (burstTimeRef.current !== null) {
        const bt = Math.max(0, (now - burstTimeRef.current) / 1000)
        if (bt > 2.2) {
          burstTimeRef.current = null
        } else {
          const bp = bt / 2.2
          const alpha = (1 - bp) * 0.85
          const maxR = Math.hypot(W, H) * 0.95
          for (let ring = 0; ring < 3; ring++) {
            const rp = Math.max(0, bp - ring * 0.12)
            if (rp <= 0) continue
            ctx.beginPath()
            ctx.arc(W * 0.5, H * 0.78, rp * maxR, 0, Math.PI * 2)
            ctx.strokeStyle = `rgba(34, 211, 238, ${alpha * (1 - rp)})`
            ctx.lineWidth = 2.2 - ring * 0.5
            ctx.stroke()
          }
          // 冲天遥测光柱
          const beamGrad = ctx.createLinearGradient(0, H, 0, 0)
          beamGrad.addColorStop(0, `rgba(34, 211, 238, ${alpha * 0.5})`)
          beamGrad.addColorStop(1, "rgba(34, 211, 238, 0)")
          ctx.fillStyle = beamGrad
          ctx.fillRect(W * 0.5 - 2, 0, 4, H)
        }
      }

      if (!reduced) {
        raf = requestAnimationFrame(drawFrame)
      }
    }

    const onVisibility = () => {
      if (document.hidden) {
        if (raf) cancelAnimationFrame(raf)
        raf = 0
      } else if (!reduced && !raf) {
        raf = requestAnimationFrame(drawFrame)
      }
    }
    document.addEventListener("visibilitychange", onVisibility)

    raf = requestAnimationFrame(drawFrame)
    return () => {
      if (raf) cancelAnimationFrame(raf)
      window.removeEventListener("resize", resize)
      window.removeEventListener("pointermove", onPointer)
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
