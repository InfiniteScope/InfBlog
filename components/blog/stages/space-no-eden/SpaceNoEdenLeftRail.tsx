"use client"

import { useEffect, useState } from "react"
import { Pause, Play, Radio, RotateCcw, Volume2, VolumeX } from "lucide-react"

import { cn } from "@/lib/utils"
import { formatAudioTime } from "./chapters"
import { useSpaceNoEdenStage } from "./stage-context"

/**
 * 宽屏左侧栏（xl:col-start-1）遥测仪表：
 * 与右侧 `// ON_THIS_PAGE` 目录形成对称档案感，随滚动更新历史坐标、视差轨道图与 Everglow 状态。
 */
export function SpaceNoEdenLeftRail() {
  const {
    active,
    scrollProgress,
    chapter,
    bgmTrack,
    bgmPlaying,
    bgmCurrentTime,
    bgmDuration,
    bgmMuted,
    autoplayBlocked,
    yieldedToMain,
    suspendedMainTrackTitle,
    wasMainPlaying,
    toggleBgmPlay,
    seekBgm,
    toggleBgmMute,
    restoreMainPlaylist,
    resumeArticleBgm,
  } = useSpaceNoEdenStage()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted || !active) return null

  const duration = bgmDuration || bgmTrack?.durationSeconds || 0
  const progressPct =
    duration > 0 ? Math.min(100, Math.max(0, (bgmCurrentTime / duration) * 100)) : 0

  // 开普勒轨道上的视差双极位置
  const theta = scrollProgress * Math.PI
  const probe1X = 76 + Math.cos(theta) * 52
  const probe1Y = 46 + Math.sin(theta) * 20
  const probe2X = 76 - Math.cos(theta) * 52
  const probe2Y = 46 - Math.sin(theta) * 20

  return (
    <div className="w-44 space-y-4 text-xs">
      <div>
        <p className="font-mono text-xs tracking-widest text-accent">
          // TELEMETRY_LOG
        </p>
        <p className="mt-1 font-mono text-[10px] text-muted-foreground">
          {chapter.code} · {chapter.distance}
        </p>
      </div>

      {/* 开普勒椭圆 + 视差基线微缩图 */}
      <div
        className="rounded-lg border bg-card/45 p-3 backdrop-blur-sm"
        style={{ borderColor: `rgba(${chapter.glowRgb}, 0.25)` }}
      >
        <svg viewBox="0 0 152 92" className="w-full overflow-visible">
          <ellipse
            cx="76"
            cy="46"
            rx="54"
            ry="22"
            fill="none"
            stroke="currentColor"
            strokeWidth="0.75"
            strokeDasharray="2.5 3.5"
            className="text-muted-foreground/35"
          />
          {/* 目标远星（顶部）与地球轨道两点视差连线 */}
          <line
            x1={probe1X}
            y1={probe1Y}
            x2="76"
            y2="8"
            stroke={`rgba(${chapter.glowRgb}, 0.45)`}
            strokeWidth="0.7"
          />
          <line
            x1={probe2X}
            y1={probe2Y}
            x2="76"
            y2="8"
            stroke={`rgba(${chapter.glowRgb}, 0.25)`}
            strokeWidth="0.7"
            strokeDasharray="2 2"
          />
          {/* 中心天体 */}
          <circle cx="76" cy="46" r="4" fill="currentColor" className="text-muted-foreground/40" />
          {/* 远星 */}
          <circle cx="76" cy="8" r="2.2" fill={`rgb(${chapter.glowRgb})`} />
          {/* 轨道观测极点 */}
          <circle cx={probe1X} cy={probe1Y} r="3" fill={`rgb(${chapter.glowRgb})`} />
          <circle
            cx={probe2X}
            cy={probe2Y}
            r="2.5"
            fill="none"
            stroke={`rgb(${chapter.glowRgb})`}
            strokeWidth="1"
          />
        </svg>

        <div className="mt-2 space-y-1">
          <p
            className="font-mono text-[10px] font-semibold tracking-wider"
            style={{ color: `rgb(${chapter.glowRgb})` }}
          >
            {chapter.era}
          </p>
          <p className="font-mono text-[10px] text-muted-foreground">
            {chapter.tag}
          </p>
          <p className="pt-1 text-[11px] leading-relaxed text-muted-foreground">
            {chapter.note}
          </p>
        </div>
      </div>

      {/* 左侧栏同步音频迷你模块 */}
      {bgmTrack && (
        <div
          className="rounded-lg border bg-card/45 p-3 backdrop-blur-sm"
          style={{ borderColor: "hsl(var(--border) / 0.65)" }}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 font-mono text-[10px] text-muted-foreground">
              <Radio
                className={cn("h-3 w-3", bgmPlaying && "animate-pulse")}
                style={{ color: bgmPlaying ? `rgb(${chapter.glowRgb})` : undefined }}
              />
              SIGNAL_BGM
            </span>
            <button
              type="button"
              onClick={toggleBgmMute}
              className="text-muted-foreground transition-colors hover:text-foreground"
              aria-label={bgmMuted ? "取消静音" : "静音"}
            >
              {bgmMuted ? (
                <VolumeX className="h-3.5 w-3.5" />
              ) : (
                <Volume2 className="h-3.5 w-3.5" />
              )}
            </button>
          </div>

          <p className="mt-1.5 truncate text-xs font-medium text-foreground">
            {bgmTrack.title}
          </p>
          <p className="truncate text-[10px] text-muted-foreground">
            {bgmTrack.artist}
          </p>

          <div className="mt-2.5 flex items-center gap-2">
            <button
              type="button"
              onClick={yieldedToMain ? resumeArticleBgm : toggleBgmPlay}
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-colors"
              style={{
                borderColor: `rgba(${chapter.glowRgb}, 0.5)`,
                color: `rgb(${chapter.glowRgb})`,
              }}
              aria-label={bgmPlaying ? "暂停伴音" : "播放伴音"}
            >
              {bgmPlaying ? (
                <Pause className="h-3 w-3" />
              ) : (
                <Play className="h-3 w-3 pl-0.5" />
              )}
            </button>
            <input
              type="range"
              min={0}
              max={duration || 100}
              step={0.5}
              value={Math.min(bgmCurrentTime, duration || 100)}
              onChange={(e) => seekBgm(Number(e.target.value))}
              aria-label="左侧伴音进度"
              className="h-1 w-full cursor-pointer accent-cyan-400"
              style={{
                background: `linear-gradient(to right, rgba(${chapter.glowRgb}, 0.85) ${progressPct}%, rgba(148, 163, 184, 0.25) ${progressPct}%)`,
              }}
            />
          </div>

          <div className="mt-1 flex items-center justify-between font-mono text-[10px] text-muted-foreground">
            <span>{formatAudioTime(bgmCurrentTime)}</span>
            <span>{formatAudioTime(duration)}</span>
          </div>

          {autoplayBlocked && !bgmPlaying && !yieldedToMain && (
            <button
              type="button"
              onClick={toggleBgmPlay}
              className="mt-2 w-full rounded border py-1 font-mono text-[10px] transition-colors"
              style={{
                borderColor: `rgba(${chapter.glowRgb}, 0.6)`,
                backgroundColor: `rgba(${chapter.glowRgb}, 0.12)`,
                color: `rgb(${chapter.glowRgb})`,
              }}
            >
              点击唤醒 Everglow
            </button>
          )}

          {suspendedMainTrackTitle && !yieldedToMain && (
            <button
              type="button"
              onClick={restoreMainPlaylist}
              className="mt-2 flex w-full items-center justify-center gap-1 rounded border border-border/60 py-1 text-[10px] text-muted-foreground transition-colors hover:text-foreground"
              title={
                wasMainPlaying
                  ? "离开文章后将自动恢复原曲目，也可以点击立即恢复"
                  : "恢复原歌单"
              }
            >
              <RotateCcw className="h-2.5 w-2.5" />
              <span className="truncate">恢复：{suspendedMainTrackTitle}</span>
            </button>
          )}

          {yieldedToMain && (
            <button
              type="button"
              onClick={resumeArticleBgm}
              className="mt-2 flex w-full items-center justify-center gap-1 rounded border py-1 text-[10px] transition-colors"
              style={{
                borderColor: `rgba(${chapter.glowRgb}, 0.45)`,
                color: `rgb(${chapter.glowRgb})`,
              }}
            >
              <Radio className="h-2.5 w-2.5" />
              切回 Everglow
            </button>
          )}
        </div>
      )}
    </div>
  )
}
