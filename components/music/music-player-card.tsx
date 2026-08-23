"use client"

import { motion } from "motion/react"
import {
  Music,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Volume1,
  Volume2,
  VolumeX,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Marquee } from "@/components/ui/marquee"
import { MusicCategorySelect } from "@/components/music/music-category-select"
import { PlayModeToggle } from "@/components/music/play-mode-toggle"
import { LoadingDots } from "@/components/ui/loading-dots"
import { useMusic } from "@/components/music/music-provider"
import { ProgressBar } from "@/components/music/progress-bar"
import { cn } from "@/lib/utils"

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || Number.isNaN(seconds)) return "0:00"
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0")
  return `${m}:${s}`
}

interface MusicPlayerCardProps {
  className?: string
}

export function MusicPlayerCard({ className }: MusicPlayerCardProps) {
  const {
    currentTrack,
    loaded,
    isPlaying,
    currentTime,
    duration,
    volume,
    muted,
    togglePlay,
    next,
    prev,
    seek,
    setVolume,
    toggleMute,
  } = useMusic()

  if (!currentTrack) {
    return (
      <div
        className={cn(
          "relative flex h-56 flex-col items-center justify-center gap-3 rounded-2xl border border-border/60 bg-card/50",
          className
        )}
      >
        <LoadingDots />
        <p className="text-xs text-muted-foreground">
          {loaded ? "暂无音乐" : "曲库加载中..."}
        </p>
      </div>
    )
  }

  const maxDuration = duration || currentTrack.durationSeconds || 1

  return (
    <div
      className={cn(
        "relative flex h-56 flex-col overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-card/95 via-card/90 to-accent/5 p-1 shadow-xl shadow-accent/5 backdrop-blur-xl",
        className
      )}
    >
      <div className="flex h-full flex-col justify-center gap-3 rounded-xl bg-background/40 p-4">
        {/* Top: cover + info */}
        <div className="flex items-center gap-4">
          <div
            className={cn(
              "relative h-14 w-14 shrink-0 overflow-hidden rounded-full shadow-lg ring-1 ring-inset ring-black/10 dark:ring-white/10",
              isPlaying && "shadow-accent/30"
            )}
          >
            {currentTrack.cover ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={currentTrack.cover}
                alt={currentTrack.title}
                className="h-full w-full object-cover animate-spin-slow"
                style={{ animationPlayState: isPlaying ? "running" : "paused" }}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-muted">
                <Music className="h-6 w-6 text-muted-foreground" />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <Marquee className="text-lg font-bold tracking-tight text-foreground">
              {currentTrack.title}
            </Marquee>
            <Marquee className="text-sm text-muted-foreground">
              {currentTrack.artist}
              {currentTrack.album ? ` · ${currentTrack.album}` : ""}
            </Marquee>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={prev}>
            <SkipBack className="h-4 w-4" />
          </Button>
          <Button
            variant="default"
            size="icon"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-md shadow-accent/30 transition-transform hover:scale-105 hover:bg-accent/90"
            onClick={togglePlay}
          >
            {isPlaying ? (
              <Pause className="h-5 w-5" />
            ) : (
              <Play className="h-5 w-5 pl-0.5" />
            )}
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={next}>
            <SkipForward className="h-4 w-4" />
          </Button>
        </div>

        {/* Progress */}
        <div className="space-y-1">
          <ProgressBar value={currentTime} max={maxDuration} onChange={seek} />
          <div className="flex justify-between text-xs text-muted-foreground tabular-nums">
            <span>{formatTime(currentTime)}</span>
            <span>{currentTrack.duration}</span>
          </div>
        </div>

        {/* Category, play mode & volume */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <MusicCategorySelect />
            <PlayModeToggle />
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0"
              onClick={toggleMute}
              title={muted ? "取消静音" : "静音"}
            >
              {muted || volume === 0 ? (
                <VolumeX className="h-3.5 w-3.5" />
              ) : volume < 0.5 ? (
                <Volume1 className="h-3.5 w-3.5" />
              ) : (
                <Volume2 className="h-3.5 w-3.5" />
              )}
            </Button>
            <ProgressBar
              value={muted ? 0 : volume}
              max={1}
              onChange={(v) => setVolume(Math.min(1, Math.max(0, v)))}
              className="w-20 min-w-0 sm:w-28"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
