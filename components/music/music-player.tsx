"use client"

import { useEffect, useRef, useState } from "react"
import {
  ChevronDown,
  ChevronUp,
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
import { Slider } from "@/components/ui/slider"
import { cn } from "@/lib/utils"

interface Track {
  id: string
  title: string
  artist: string
  album?: string
  duration: string
  durationSeconds: number
  src: string
  cover?: string
}

function formatTime(seconds: number) {
  if (Number.isNaN(seconds)) return "0:00"
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0")
  return `${m}:${s}`
}

export function MusicPlayer() {
  const [tracks, setTracks] = useState<Track[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(0.8)
  const [muted, setMuted] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const currentTrack = tracks[currentIndex]

  useEffect(() => {
    fetch("/api/music/playlist")
      .then((res) => res.json())
      .then((data) => {
        setTracks(data.tracks || [])
        setLoaded(true)
      })
      .catch(() => {
        setLoaded(true)
        setError("加载播放列表失败")
      })
  }, [])

  // IntersectionObserver to auto-collapse when scrolled out
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        setCollapsed(!entry.isIntersecting)
      },
      { threshold: 0.1, rootMargin: "-80px 0px 0px 0px" }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !currentTrack) return

    const onTimeUpdate = () => setCurrentTime(audio.currentTime)
    const onLoadedMetadata = () => setDuration(audio.duration)
    const onEnded = () => handleNext()
    const onPlay = () => setIsPlaying(true)
    const onPause = () => setIsPlaying(false)

    audio.addEventListener("timeupdate", onTimeUpdate)
    audio.addEventListener("loadedmetadata", onLoadedMetadata)
    audio.addEventListener("ended", onEnded)
    audio.addEventListener("play", onPlay)
    audio.addEventListener("pause", onPause)

    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate)
      audio.removeEventListener("loadedmetadata", onLoadedMetadata)
      audio.removeEventListener("ended", onEnded)
      audio.removeEventListener("play", onPlay)
      audio.removeEventListener("pause", onPause)
    }
  }, [currentTrack])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !currentTrack) return
    audio.src = currentTrack.src
    audio.load()
    setCurrentTime(0)
    setDuration(0)
    if (isPlaying) {
      audio.play().catch(() => setIsPlaying(false))
    }
  }, [currentTrack])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    audio.volume = muted ? 0 : volume
  }, [volume, muted])

  const togglePlay = () => {
    const audio = audioRef.current
    if (!audio) return
    if (isPlaying) {
      audio.pause()
    } else {
      audio.play().catch(() => {})
    }
  }

  const handlePrev = () => {
    if (tracks.length === 0) return
    setCurrentIndex((i) => (i - 1 + tracks.length) % tracks.length)
  }

  const handleNext = () => {
    if (tracks.length === 0) return
    setCurrentIndex((i) => (i + 1) % tracks.length)
  }

  const seek = (values: number[]) => {
    const audio = audioRef.current
    if (!audio) return
    audio.currentTime = values[0]
    setCurrentTime(values[0])
  }

  if (!loaded) {
    return (
      <div className="rounded-xl border border-border bg-card/50 p-4 text-sm text-muted-foreground">
        音乐播放器初始化中...
      </div>
    )
  }

  if (tracks.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card/30 p-4 text-sm text-muted-foreground">
        暂无音乐文件。请将 .mp3 / .flac / .wav 等音频文件放入 public/music/ 文件夹。
      </div>
    )
  }

  return (
    <>
      <audio ref={audioRef} preload="metadata" />

      <div
        ref={containerRef}
        className={cn(
          "relative overflow-hidden rounded-2xl border border-border bg-card/80 backdrop-blur-xl transition-all duration-500",
          collapsed ? "opacity-0 translate-y-4 pointer-events-none" : "opacity-100 translate-y-0"
        )}
      >
        <div className="flex items-center gap-4 p-4">
          {/* Cover */}
          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full shadow-md">
            {currentTrack.cover ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={currentTrack.cover}
                alt={currentTrack.title}
                className={cn(
                  "h-full w-full object-cover",
                  isPlaying ? "animate-spin-slow" : ""
                )}
                style={{ animationPlayState: isPlaying ? "running" : "paused" }}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-muted">
                <Music className="h-8 w-8 text-muted-foreground" />
              </div>
            )}
            <div className="absolute inset-0 rounded-full ring-1 ring-inset ring-black/10 dark:ring-white/10" />
          </div>

          {/* Info & Progress */}
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <div className="min-w-0">
              <p className="truncate font-display text-base tracking-tight">
                {currentTrack.title}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {currentTrack.artist}
                {currentTrack.album ? ` · ${currentTrack.album}` : ""}
              </p>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
              <span>{formatTime(currentTime)}</span>
              <Slider
                value={[currentTime]}
                max={duration || currentTrack.durationSeconds}
                step={1}
                onValueChange={seek}
                className="flex-1"
              />
              <span>{currentTrack.duration}</span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={handlePrev}>
              <SkipBack className="h-4 w-4" />
            </Button>
            <Button
              variant="default"
              size="icon"
              className="h-10 w-10 rounded-full"
              onClick={togglePlay}
            >
              {isPlaying ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
            </Button>
            <Button variant="ghost" size="icon" onClick={handleNext}>
              <SkipForward className="h-4 w-4" />
            </Button>
          </div>

          {/* Volume */}
          <div className="hidden w-24 items-center gap-2 sm:flex">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setMuted((m) => !m)}
            >
              {muted || volume === 0 ? (
                <VolumeX className="h-4 w-4" />
              ) : volume < 0.5 ? (
                <Volume1 className="h-4 w-4" />
              ) : (
                <Volume2 className="h-4 w-4" />
              )}
            </Button>
            <Slider
              value={[muted ? 0 : volume]}
              max={1}
              step={0.01}
              onValueChange={(v) => {
                setVolume(v[0])
                if (v[0] > 0) setMuted(false)
              }}
            />
          </div>
        </div>
      </div>

      {/* Collapsed mini bar */}
      <div
        className={cn(
          "fixed right-4 top-20 z-30 flex items-center gap-3 rounded-full border border-border bg-card/90 px-3 py-2 shadow-lg backdrop-blur-xl transition-all duration-500",
          collapsed
            ? "opacity-100 translate-y-0 pointer-events-auto"
            : "opacity-0 -translate-y-4 pointer-events-none"
        )}
      >
        <div className="relative h-9 w-9 overflow-hidden rounded-full">
          {currentTrack.cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={currentTrack.cover}
              alt={currentTrack.title}
              className={cn(
                "h-full w-full object-cover",
                isPlaying ? "animate-spin-slow" : ""
              )}
              style={{ animationPlayState: isPlaying ? "running" : "paused" }}
            />
          ) : (
            <Music className="h-5 w-5 text-muted-foreground" />
          )}
        </div>
        <div className="hidden max-w-[120px] sm:block">
          <p className="truncate text-xs font-medium">{currentTrack.title}</p>
          <p className="truncate text-[10px] text-muted-foreground">
            {currentTrack.artist}
          </p>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={togglePlay}>
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCollapsed(false)}>
          <ChevronDown className="h-4 w-4" />
        </Button>
      </div>
    </>
  )
}
