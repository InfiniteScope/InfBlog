"use client"

import { useEffect, useState } from "react"

import { SpaceNoEdenActFlash } from "./SpaceNoEdenActFlash"
import { SpaceNoEdenCurtain } from "./SpaceNoEdenCurtain"
import { SpaceNoEdenStageCanvas } from "./SpaceNoEdenStageCanvas"
import { useSpaceNoEdenStage } from "./stage-context"

export function SpaceNoEdenBackdrop() {
  const { active, scrollProgress, chapter } = useSpaceNoEdenStage()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted || !active) return null

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
            boxShadow: `0 0 10px rgba(${chapter.glowRgb}, 0.75)`,
          }}
        />
      </div>

      {/* 全屏 6 幕动态宇宙舞台（100vw × 100vh） */}
      <SpaceNoEdenStageCanvas />

      {/* 幕间切换遥测闪条 */}
      <SpaceNoEdenActFlash />

      {/* 全屏开篇 WebGL 序幕覆盖层 */}
      <SpaceNoEdenCurtain />
    </>
  )
}
