"use client"

import type { ReactNode } from "react"

import { cn } from "@/lib/utils"
import { useSpaceNoEdenStage } from "./stage-context"

interface SpaceNoEdenArticleFrameProps {
  children: ReactNode
}

/**
 * 专属半透明黑曜石磨砂阅读舱：
 * 衬托后方全屏 100vw × 100vh 宇宙舞台的同时，确保长文阅读对比度锐利清晰。
 */
export function SpaceNoEdenArticleFrame({
  children,
}: SpaceNoEdenArticleFrameProps) {
  const { active, chapter } = useSpaceNoEdenStage()

  if (!active) {
    return <>{children}</>
  }

  return (
    <div
      className={cn(
        "relative flex flex-col gap-8 rounded-2xl border bg-background/88 p-5 shadow-2xl backdrop-blur-md transition-colors duration-500 sm:p-8 md:p-10 dark:bg-[#050812]/76"
      )}
      style={{
        borderColor: `rgba(${chapter.glowRgb}, 0.28)`,
        boxShadow: `0 0 80px rgba(${chapter.glowRgb}, 0.09), 0 24px 64px rgba(0, 0, 0, 0.45)`,
      }}
    >
      {/* 航天档案四角准星角标 */}
      <span
        aria-hidden
        className="pointer-events-none absolute top-2.5 left-2.5 h-3.5 w-3.5 border-t border-l"
        style={{ borderColor: `rgba(${chapter.glowRgb}, 0.7)` }}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute top-2.5 right-2.5 h-3.5 w-3.5 border-t border-r"
        style={{ borderColor: `rgba(${chapter.glowRgb}, 0.7)` }}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute bottom-2.5 left-2.5 h-3.5 w-3.5 border-b border-l"
        style={{ borderColor: `rgba(${chapter.glowRgb}, 0.7)` }}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute bottom-2.5 right-2.5 h-3.5 w-3.5 border-b border-r"
        style={{ borderColor: `rgba(${chapter.glowRgb}, 0.7)` }}
      />
      {children}
    </div>
  )
}
