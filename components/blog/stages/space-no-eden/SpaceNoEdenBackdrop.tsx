"use client"

import { useEffect, useState } from "react"
import { useTheme } from "next-themes"

import { SPACE_NO_EDEN_CHAPTERS } from "./chapters"
import { useSpaceNoEdenStage } from "./stage-context"

export function SpaceNoEdenBackdrop() {
  const { active, scrollProgress, chapter, immersiveDark } = useSpaceNoEdenStage()
  const { forcedTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [pointerOffset, setPointerOffset] = useState({ x: 0, y: 0 })
  const [reducedMotion, setReducedMotion] = useState(false)

  useEffect(() => {
    setMounted(true)
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    const canHover = window.matchMedia("(hover: hover) and (pointer: fine)")
    setReducedMotion(mq.matches)

    const onMotionChange = () => setReducedMotion(mq.matches)
    mq.addEventListener("change", onMotionChange)

    let raf = 0
    const onPointerMove = (e: PointerEvent) => {
      if (mq.matches || !canHover.matches) return
      if (raf) return
      raf = requestAnimationFrame(() => {
        raf = 0
        const nx = (e.clientX / window.innerWidth - 0.5) * 2
        const ny = (e.clientY / window.innerHeight - 0.5) * 2
        setPointerOffset({ x: nx, y: ny })
      })
    }

    window.addEventListener("pointermove", onPointerMove, { passive: true })
    return () => {
      mq.removeEventListener("change", onMotionChange)
      window.removeEventListener("pointermove", onPointerMove)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])

  if (!mounted || !active) return null

  const isDarkStage = (forcedTheme ?? resolvedTheme) === "dark" || immersiveDark

  // 视差基线位移：随阅读进度从左基线走向右基线，叠加大地指针微弱视差
  const orbitalShift = (scrollProgress - 0.5) * 34
  const ptrX = reducedMotion ? 0 : pointerOffset.x * 10
  const ptrY = reducedMotion ? 0 : pointerOffset.y * 6

  // 月球暗面遮罩进度：从偏心照亮逐步走向 100% 处的日食与"通体皆暗"
  const shadowSweep = 48 - scrollProgress * 46 // +48 → +2（日食中心重合）
  const eclipseIntensity = Math.max(0, (scrollProgress - 0.68) / 0.32)

  return (
    <>
      {/* 顶部极细遥测阅读进度线 */}
      <div
        aria-hidden
        className="pointer-events-none fixed top-0 left-0 right-0 z-50 h-[2px] bg-transparent"
      >
        <div
          className="h-full transition-[width] duration-150 ease-out"
          style={{
            width: `${Math.round(scrollProgress * 1000) / 10}%`,
            background: `linear-gradient(90deg, rgba(${chapter.glowRgb}, 0.35), rgba(${chapter.glowRgb}, 0.95))`,
            boxShadow: `0 0 8px rgba(${chapter.glowRgb}, 0.65)`,
          }}
        />
      </div>

      {/* 深空局部暗场底衬（仅在经典浅色开启局部沉浸模式时铺底，绝不污染全局主题） */}
      {immersiveDark && (
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 z-0 transition-opacity duration-500"
          style={{
            background:
              "radial-gradient(ellipse 90% 70% at 50% 10%, #070b14 0%, #04060c 60%, #020308 100%)",
          }}
        />
      )}

      {/* 主环境氛围层：章节星云微光 + 潮汐锁定月球 + 开普勒椭圆 + 视差准星 */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0 overflow-hidden select-none"
      >
        {/* 1. 章节色调星云辉光 */}
        <div
          className="absolute -top-40 right-[-10%] h-[36rem] w-[36rem] rounded-full blur-[120px] transition-colors duration-700"
          style={{
            background: `radial-gradient(circle, rgba(${chapter.glowRgb}, ${
              isDarkStage ? 0.16 : 0.11
            }) 0%, transparent 72%)`,
            transform: `translate3d(${ptrX * -0.6}px, ${ptrY * -0.6}px, 0)`,
          }}
        />
        <div
          className="absolute bottom-[-18rem] left-[-12%] h-[34rem] w-[34rem] rounded-full blur-[130px] transition-colors duration-700"
          style={{
            background: `radial-gradient(circle, rgba(${chapter.glowRgb}, ${
              isDarkStage ? 0.1 : 0.06
            }) 0%, transparent 74%)`,
            transform: `translate3d(${ptrX * 0.5}px, ${ptrY * 0.5}px, 0)`,
          }}
        />

        {/* 2. 潮汐锁定月球与终章日食环（右上角远景） */}
        <svg
          viewBox="0 0 260 260"
          className="absolute right-[4%] top-20 h-56 w-56 opacity-45 md:h-72 md:w-72"
          style={{
            transform: `translate3d(${ptrX * -0.8}px, ${ptrY * -0.8}px, 0)`,
          }}
        >
          <defs>
            <radialGradient id="sne-moon-glow" cx="50%" cy="50%" r="50%">
              <stop offset="55%" stopColor={`rgba(${chapter.glowRgb}, 0.14)`} />
              <stop offset="100%" stopColor="rgba(0,0,0,0)" />
            </radialGradient>
            <mask id="sne-lunar-phase">
              <rect width="260" height="260" fill="black" />
              <circle cx="130" cy="130" r="68" fill="white" />
              <circle
                cx={130 - shadowSweep}
                cy={130 - shadowSweep * 0.18}
                r="67"
                fill="black"
              />
            </mask>
          </defs>

          {/* 日食外冕光环：仅在后半段逐步显现 */}
          <circle
            cx="130"
            cy="130"
            r="96"
            fill="url(#sne-moon-glow)"
            opacity={0.25 + eclipseIntensity * 0.65}
          />
          <circle
            cx="130"
            cy="130"
            r="70"
            fill="none"
            stroke={`rgba(${chapter.glowRgb}, ${0.18 + eclipseIntensity * 0.52})`}
            strokeWidth={0.9 + eclipseIntensity * 1.1}
          />

          {/* 开普勒偏心椭圆轨道 */}
          <ellipse
            cx="130"
            cy="130"
            rx="112"
            ry="54"
            fill="none"
            stroke="currentColor"
            strokeWidth="0.6"
            strokeDasharray="3 5"
            className="text-muted-foreground/25"
            transform="rotate(-18 130 130)"
          />

          {/* 潮汐锁定月面轮廓 + 暗面遮罩 */}
          <circle
            cx="130"
            cy="130"
            r="68"
            fill="currentColor"
            className="text-foreground/[0.04]"
          />
          <circle
            cx="130"
            cy="130"
            r="68"
            fill={`rgba(${chapter.glowRgb}, 0.18)`}
            mask="url(#sne-lunar-phase)"
          />
        </svg>

        {/* 3. 双基线「视差」观测准星：左右微幅反向位移 */}
        <div
          className="hidden lg:block absolute left-8 top-[42%] opacity-30 transition-opacity duration-500"
          style={{
            transform: `translate3d(${orbitalShift + ptrX}px, ${ptrY * 0.4}px, 0)`,
          }}
        >
          <svg width="72" height="72" viewBox="0 0 72 72" fill="none">
            <circle
              cx="36"
              cy="36"
              r="24"
              stroke={`rgba(${chapter.glowRgb}, 0.45)`}
              strokeWidth="0.75"
              strokeDasharray="2 4"
            />
            <path
              d="M36 4V18M36 54V68M4 36H18M54 36H68"
              stroke={`rgba(${chapter.glowRgb}, 0.65)`}
              strokeWidth="0.85"
            />
          </svg>
        </div>

        <div
          className="hidden lg:block absolute right-10 bottom-[18%] opacity-30 transition-opacity duration-500"
          style={{
            transform: `translate3d(${-orbitalShift - ptrX}px, ${-ptrY * 0.4}px, 0)`,
          }}
        >
          <svg width="72" height="72" viewBox="0 0 72 72" fill="none">
            <circle
              cx="36"
              cy="36"
              r="20"
              stroke={`rgba(${chapter.glowRgb}, 0.45)`}
              strokeWidth="0.75"
            />
            <path
              d="M36 8V22M36 50V64M8 36H22M50 36H64"
              stroke={`rgba(${chapter.glowRgb}, 0.65)`}
              strokeWidth="0.85"
            />
          </svg>
        </div>

        {/* 4. 右侧极微章节刻度标记（仅超宽屏装饰） */}
        <div className="hidden 2xl:flex fixed right-3 top-1/2 -translate-y-1/2 flex-col gap-2 opacity-40">
          {SPACE_NO_EDEN_CHAPTERS.map((item) => {
            const current = item.index === chapter.index
            return (
              <span
                key={item.code}
                className="block h-[1px] transition-all duration-300"
                style={{
                  width: current ? "14px" : "6px",
                  backgroundColor: current
                    ? `rgba(${chapter.glowRgb}, 0.9)`
                    : "rgba(148, 163, 184, 0.35)",
                }}
              />
            )
          })}
        </div>
      </div>
    </>
  )
}
