"use client"

import { useEffect, useState } from "react"
import { Pause, Play, RotateCcw } from "lucide-react"

import { useSidebarCollapse } from "@/components/layout/sidebar-collapse-provider"
import { useMusic } from "@/components/music/music-provider"
import { cn } from "@/lib/utils"
import { useSpaceNoEdenStage } from "./stage-context"

/**
 * 左下角紧凑型 Everglow 伴音控制胶囊：
 * 仅保留「暂停/播放」与「切回原音乐」按钮，避开左侧边栏与弹幕输入区。
 */
export function SpaceNoEdenBgmPill() {
  const {
    active,
    bgmTrack,
    bgmPlaying,
    autoplayBlocked,
    yieldedToMain,
    toggleBgmPlay,
    restoreMainPlaylist,
    resumeArticleBgm,
  } = useSpaceNoEdenStage()
  const { collapsed } = useSidebarCollapse()
  const { currentTrack } = useMusic()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted || !active || !bgmTrack) return null

  const needsWake = autoplayBlocked && !bgmPlaying && !yieldedToMain
  const canSwitchMain = Boolean(currentTrack)

  return (
    <div
      className={cn(
        "fixed bottom-5 left-4 z-40 flex items-center gap-1.5 rounded-full border border-border/70 bg-background/85 px-2.5 py-1 text-xs shadow-md backdrop-blur-md transition-[left] duration-300",
        collapsed ? "lg:left-[96px]" : "lg:left-[296px]"
      )}
    >
      <span
        aria-hidden
        className={cn(
          "h-1.5 w-1.5 shrink-0 rounded-full",
          bgmPlaying
            ? "animate-pulse bg-accent"
            : needsWake
              ? "animate-ping bg-accent"
              : "bg-muted-foreground/50"
        )}
      />

      <span className="max-w-[116px] truncate font-mono text-[11px] font-medium text-foreground">
        {needsWake ? "点击播放 Everglow" : bgmTrack.title}
      </span>

      <button
        type="button"
        onClick={yieldedToMain ? resumeArticleBgm : toggleBgmPlay}
        className="inline-flex h-6 w-6 items-center justify-center rounded-full text-foreground/80 transition-colors hover:bg-accent/15 hover:text-accent"
        aria-label={bgmPlaying ? "暂停 Everglow" : "播放 Everglow"}
        title={bgmPlaying ? "暂停 Everglow" : "播放 Everglow"}
      >
        {bgmPlaying ? (
          <Pause className="h-3 w-3" />
        ) : (
          <Play className="h-3 w-3 pl-0.5" />
        )}
      </button>

      {canSwitchMain && !yieldedToMain && (
        <button
          type="button"
          onClick={restoreMainPlaylist}
          className="inline-flex items-center gap-1 rounded-full border border-border/60 px-2 py-0.5 text-[10px] text-muted-foreground transition-colors hover:border-accent/50 hover:text-foreground"
          title={`切回原音乐：${currentTrack?.title ?? ""}`}
        >
          <RotateCcw className="h-2.5 w-2.5" />
          切回原音乐
        </button>
      )}

      {yieldedToMain && (
        <button
          type="button"
          onClick={resumeArticleBgm}
          className="inline-flex items-center gap-1 rounded-full border border-accent/40 px-2 py-0.5 text-[10px] text-accent transition-colors hover:bg-accent/10"
          title="切回文章伴音 Everglow"
        >
          切回 Everglow
        </button>
      )}
    </div>
  )
}
