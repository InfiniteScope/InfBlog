"use client"

import { useEffect, useState } from "react"
import { useTheme } from "next-themes"
import {
  Disc3,
  Eye,
  Film,
  Pause,
  Play,
  Radio,
  RotateCcw,
  Volume2,
  VolumeX,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { formatAudioTime } from "./chapters"
import { useSpaceNoEdenStage } from "./stage-context"

export function SpaceNoEdenHeader() {
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
    immersiveDark,
    toggleImmersiveDark,
    replayCurtain,
    toggleBgmPlay,
    seekBgm,
    toggleBgmMute,
    restoreMainPlaylist,
    resumeArticleBgm,
  } = useSpaceNoEdenStage()
  const { forcedTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted || !active) return null

  const isGlobalDark = (forcedTheme ?? resolvedTheme) === "dark"
  const parallaxArcsec = ((scrollProgress - 0.5) * 1.54).toFixed(3)
  const duration = bgmDuration || bgmTrack?.durationSeconds || 0
  const progressPct =
    duration > 0 ? Math.min(100, Math.max(0, (bgmCurrentTime / duration) * 100)) : 0

  return (
    <div
      className="relative overflow-hidden rounded-xl border bg-card/65 p-4 backdrop-blur-md transition-colors duration-300"
      style={{
        borderColor: `rgba(${chapter.glowRgb}, 0.28)`,
      }}
    >
      {/* 顶部微弱扫描高光线 */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[1px]"
        style={{
          background: `linear-gradient(90deg, transparent, rgba(${chapter.glowRgb}, 0.65), transparent)`,
        }}
      />

      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono tracking-wider text-muted-foreground">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-medium"
            style={{
              borderColor: `rgba(${chapter.glowRgb}, 0.35)`,
              color: `rgb(${chapter.glowRgb})`,
              backgroundColor: `rgba(${chapter.glowRgb}, 0.08)`,
            }}
          >
            <Radio
              className={cn("h-3 w-3", bgmPlaying && "animate-pulse")}
            />
            OPHIUCHUS_RX // 2047
          </span>
          <span>
            {chapter.code} · {chapter.era}
          </span>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <span className="hidden sm:inline">Δθ {parallaxArcsec}″</span>
          <span>{Math.round(scrollProgress * 100)}%</span>
          <button
            type="button"
            onClick={replayCurtain}
            className="inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] transition-colors hover:text-foreground"
            style={{
              borderColor: `rgba(${chapter.glowRgb}, 0.42)`,
              color: `rgb(${chapter.glowRgb})`,
            }}
            title="重新播放开篇全屏 WebGL 序幕"
          >
            <Film className="h-3 w-3" />
            重播序幕
          </button>
          {!isGlobalDark && (
            <button
              type="button"
              onClick={toggleImmersiveDark}
              className="inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] transition-colors hover:text-foreground"
              style={{
                borderColor: immersiveDark
                  ? `rgba(${chapter.glowRgb}, 0.55)`
                  : "hsl(var(--border))",
                backgroundColor: immersiveDark
                  ? `rgba(${chapter.glowRgb}, 0.14)`
                  : "transparent",
                color: immersiveDark ? `rgb(${chapter.glowRgb})` : undefined,
              }}
              title="仅在本文章内切换深空剧场或素雅底色，不影响全站主题设置"
            >
              <Eye className="h-3 w-3" />
              {immersiveDark ? "素雅底色" : "深空剧场"}
            </button>
          )}
        </div>
      </div>

      {/* Everglow 专属伴音控制条 */}
      <div
        className="mt-3 flex flex-col gap-2.5 border-t pt-3 sm:flex-row sm:items-center sm:justify-between"
        style={{ borderColor: "hsl(var(--border) / 0.5)" }}
      >
        {bgmTrack ? (
          <>
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={yieldedToMain ? resumeArticleBgm : toggleBgmPlay}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-transform active:scale-95"
                style={{
                  borderColor: `rgba(${chapter.glowRgb}, 0.45)`,
                  backgroundColor: bgmPlaying
                    ? `rgba(${chapter.glowRgb}, 0.16)`
                    : "transparent",
                  color: `rgb(${chapter.glowRgb})`,
                }}
                aria-label={bgmPlaying ? "暂停伴音" : "播放 Everglow 伴音"}
              >
                {bgmPlaying ? (
                  <Pause className="h-3.5 w-3.5" />
                ) : (
                  <Play className="h-3.5 w-3.5 pl-0.5" />
                )}
              </button>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Disc3
                    className={cn(
                      "h-3.5 w-3.5 shrink-0 text-muted-foreground",
                      bgmPlaying && "animate-spin"
                    )}
                    style={{
                      animationDuration: "6s",
                      color: bgmPlaying ? `rgb(${chapter.glowRgb})` : undefined,
                    }}
                  />
                  <span className="truncate text-xs font-medium text-foreground">
                    {bgmTrack.title}
                  </span>
                  <span className="truncate text-[11px] text-muted-foreground">
                    — {bgmTrack.artist}
                  </span>
                </div>

                <div className="mt-1 flex items-center gap-2">
                  <input
                    type="range"
                    min={0}
                    max={duration || 100}
                    step={0.5}
                    value={Math.min(bgmCurrentTime, duration || 100)}
                    onChange={(e) => seekBgm(Number(e.target.value))}
                    aria-label="伴音进度"
                    className="h-1 w-full max-w-[200px] cursor-pointer accent-cyan-400"
                    style={{
                      background: `linear-gradient(to right, rgba(${chapter.glowRgb}, 0.85) ${progressPct}%, rgba(148, 163, 184, 0.25) ${progressPct}%)`,
                    }}
                  />
                  <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                    {formatAudioTime(bgmCurrentTime)} / {formatAudioTime(duration)}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {autoplayBlocked && !bgmPlaying && !yieldedToMain && (
                <button
                  type="button"
                  onClick={toggleBgmPlay}
                  className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors"
                  style={{
                    borderColor: `rgba(${chapter.glowRgb}, 0.65)`,
                    backgroundColor: `rgba(${chapter.glowRgb}, 0.14)`,
                    color: `rgb(${chapter.glowRgb})`,
                  }}
                >
                  <Play className="h-3 w-3" />
                  接通信号 · 播放 Everglow
                </button>
              )}

              <button
                type="button"
                onClick={toggleBgmMute}
                className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border/60 text-muted-foreground transition-colors hover:text-foreground"
                aria-label={bgmMuted ? "取消静音" : "静音"}
                title={bgmMuted ? "取消静音" : "静音"}
              >
                {bgmMuted ? (
                  <VolumeX className="h-3.5 w-3.5" />
                ) : (
                  <Volume2 className="h-3.5 w-3.5" />
                )}
              </button>

              {suspendedMainTrackTitle && !yieldedToMain && (
                <button
                  type="button"
                  onClick={restoreMainPlaylist}
                  className="inline-flex items-center gap-1 rounded-md border border-border/60 px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
                  title={
                    wasMainPlaying
                      ? `已暂停原曲目「${suspendedMainTrackTitle}」并保留进度，点击立即恢复`
                      : `切回原曲目「${suspendedMainTrackTitle}」`
                  }
                >
                  <RotateCcw className="h-3 w-3" />
                  <span className="max-w-[140px] truncate">
                    恢复：{suspendedMainTrackTitle}
                  </span>
                </button>
              )}

              {yieldedToMain && (
                <button
                  type="button"
                  onClick={resumeArticleBgm}
                  className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] transition-colors"
                  style={{
                    borderColor: `rgba(${chapter.glowRgb}, 0.45)`,
                    color: `rgb(${chapter.glowRgb})`,
                  }}
                >
                  <Radio className="h-3 w-3" />
                  切回 Everglow
                </button>
              )}
            </div>
          </>
        ) : (
          <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
            <span className="font-mono text-[11px]">
              BGM_STANDBY // 未在 /public/music 中检测到 everglow 音频，已保持静默伴读
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
