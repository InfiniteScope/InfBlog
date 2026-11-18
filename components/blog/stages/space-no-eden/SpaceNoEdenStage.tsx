"use client"

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react"
import { usePathname } from "next/navigation"
import { useTheme } from "next-themes"

import {
  ARTICLE_BGM_YIELD_EVENT,
  useMusic,
} from "@/components/music/music-provider"
import type { StageBgmTrack } from "@/lib/music-find"
import { isExactStageRoute, SPACE_NO_EDEN_ROUTE } from "@/lib/post-stages"
import { cn } from "@/lib/utils"
import { SPACE_NO_EDEN_CHAPTERS } from "./chapters"
import { SpaceNoEdenBackdrop } from "./SpaceNoEdenBackdrop"
import { SpaceNoEdenContextProvider } from "./stage-context"

const STAGE_OWNER_ID = "post-stage:space-no-eden"

const SCOPED_DARK_VARS: CSSProperties = {
  ["--background" as string]: "222 30% 6%",
  ["--foreground" as string]: "210 25% 92%",
  ["--card" as string]: "222 26% 9%",
  ["--card-foreground" as string]: "210 25% 92%",
  ["--popover" as string]: "222 26% 10%",
  ["--popover-foreground" as string]: "210 25% 92%",
  ["--primary" as string]: "210 25% 94%",
  ["--primary-foreground" as string]: "222 30% 8%",
  ["--secondary" as string]: "220 20% 14%",
  ["--secondary-foreground" as string]: "210 20% 84%",
  ["--muted" as string]: "220 20% 14%",
  ["--muted-foreground" as string]: "215 16% 65%",
  ["--accent" as string]: "187 80% 55%",
  ["--accent-foreground" as string]: "222 30% 6%",
  ["--border" as string]: "215 20% 20%",
  ["--input" as string]: "215 20% 20%",
  ["--ring" as string]: "187 80% 55%",
  color: "hsl(210 25% 92%)",
}

interface SpaceNoEdenStageProps {
  bgmTrack: StageBgmTrack | null
  children: ReactNode
}

export function SpaceNoEdenStage({ bgmTrack, children }: SpaceNoEdenStageProps) {
  const pathname = usePathname()
  const active = isExactStageRoute(pathname, SPACE_NO_EDEN_ROUTE)

  const { forcedTheme, resolvedTheme } = useTheme()
  const {
    volume: globalVolume,
    muted: globalMuted,
    articleOverride,
    suspendForOverride,
    releaseOverride,
  } = useMusic()

  const audioRef = useRef<HTMLAudioElement>(null)
  const bgmFadeRafRef = useRef<number>(0)
  const userPausedRef = useRef(false)
  const autoplayBlockedRef = useRef(false)

  const [bgmPlaying, setBgmPlaying] = useState(false)
  const [bgmCurrentTime, setBgmCurrentTime] = useState(0)
  const [bgmDuration, setBgmDuration] = useState(bgmTrack?.durationSeconds ?? 0)
  const [bgmMuted, setBgmMuted] = useState(false)
  const [autoplayBlocked, setAutoplayBlocked] = useState(false)
  const [yieldedToMain, setYieldedToMain] = useState(false)
  const [scrollProgress, setScrollProgress] = useState(0)
  const [chapterIndex, setChapterIndex] = useState(0)
  const [immersiveDark, setImmersiveDark] = useState(false)

  const isGlobalDark = (forcedTheme ?? resolvedTheme) === "dark"
  const effectiveDark = isGlobalDark || immersiveDark

  const targetVolume = useMemo(() => {
    if (bgmMuted || globalMuted) return 0
    return Math.max(0, Math.min(1, globalVolume))
  }, [bgmMuted, globalMuted, globalVolume])

  const targetVolumeRef = useRef(targetVolume)
  useEffect(() => {
    targetVolumeRef.current = targetVolume
    const audio = audioRef.current
    if (audio && !bgmFadeRafRef.current) {
      audio.volume = targetVolume
    }
  }, [targetVolume])

  const cancelBgmFade = useCallback(() => {
    if (bgmFadeRafRef.current) {
      cancelAnimationFrame(bgmFadeRafRef.current)
      bgmFadeRafRef.current = 0
    }
  }, [])

  const fadeBgmIn = useCallback(
    (audio: HTMLAudioElement, toVol: number, durationMs = 650) => {
      cancelBgmFade()
      if (toVol <= 0 || durationMs <= 0) {
        audio.volume = toVol
        return
      }
      audio.volume = 0
      const start = performance.now()
      const step = (now: number) => {
        const p = Math.min(1, (now - start) / durationMs)
        audio.volume = toVol * p
        if (p < 1) {
          bgmFadeRafRef.current = requestAnimationFrame(step)
        } else {
          bgmFadeRafRef.current = 0
        }
      }
      bgmFadeRafRef.current = requestAnimationFrame(step)
    },
    [cancelBgmFade]
  )

  const startArticlePlayback = useCallback(
    async (withFade = true) => {
      const audio = audioRef.current
      if (!audio || !bgmTrack || !active) return
      try {
        if (withFade) {
          audio.volume = 0
        } else {
          audio.volume = targetVolumeRef.current
        }
        await audio.play()
        autoplayBlockedRef.current = false
        setAutoplayBlocked(false)
        setBgmPlaying(true)
        if (withFade) {
          fadeBgmIn(audio, targetVolumeRef.current)
        }
      } catch {
        autoplayBlockedRef.current = true
        setAutoplayBlocked(true)
        setBgmPlaying(false)
      }
    },
    [active, bgmTrack, fadeBgmIn]
  )

  // 严格按路由生命周期接管与释放站点音乐播放器
  useEffect(() => {
    if (!active || !bgmTrack) {
      releaseOverride(STAGE_OWNER_ID)
      return
    }
    if (yieldedToMain) {
      return
    }

    suspendForOverride(STAGE_OWNER_ID, {
      title: bgmTrack.title,
      artist: bgmTrack.artist,
    })

    if (!userPausedRef.current) {
      void startArticlePlayback(true)
    }

    return () => {
      cancelBgmFade()
      const audio = audioRef.current
      if (audio) {
        audio.pause()
      }
      releaseOverride(STAGE_OWNER_ID)
    }
  }, [
    active,
    bgmTrack,
    yieldedToMain,
    suspendForOverride,
    releaseOverride,
    startArticlePlayback,
    cancelBgmFade,
  ])

  // 监听主播放器主动接管事件（例如用户在顶栏点了播放）
  useEffect(() => {
    const onYield = () => {
      cancelBgmFade()
      const audio = audioRef.current
      if (audio) audio.pause()
      setBgmPlaying(false)
      setYieldedToMain(true)
    }
    window.addEventListener(ARTICLE_BGM_YIELD_EVENT, onYield)
    return () => window.removeEventListener(ARTICLE_BGM_YIELD_EVENT, onYield)
  }, [cancelBgmFade])

  // 若直接刷新进文章被浏览器自动播放策略拦截，则在首次交互时尝试唤醒（若用户未手动暂停）
  useEffect(() => {
    if (!active || !bgmTrack || !autoplayBlocked || yieldedToMain) return

    const unlock = () => {
      if (userPausedRef.current || !autoplayBlockedRef.current) return
      void startArticlePlayback(true)
    }

    window.addEventListener("pointerdown", unlock, { once: true, passive: true })
    window.addEventListener("keydown", unlock, { once: true })
    return () => {
      window.removeEventListener("pointerdown", unlock)
      window.removeEventListener("keydown", unlock)
    }
  }, [active, bgmTrack, autoplayBlocked, yieldedToMain, startArticlePlayback])

  // 监听文章专属 <audio> 进度与播放态
  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !bgmTrack) return

    const onLoadedMetadata = () => {
      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        setBgmDuration(audio.duration)
      }
    }
    const onPlay = () => setBgmPlaying(true)
    const onPause = () => setBgmPlaying(false)
    const onTimeUpdate = () => setBgmCurrentTime(audio.currentTime)

    audio.addEventListener("loadedmetadata", onLoadedMetadata)
    audio.addEventListener("play", onPlay)
    audio.addEventListener("pause", onPause)
    audio.addEventListener("timeupdate", onTimeUpdate)

    return () => {
      audio.removeEventListener("loadedmetadata", onLoadedMetadata)
      audio.removeEventListener("play", onPlay)
      audio.removeEventListener("pause", onPause)
      audio.removeEventListener("timeupdate", onTimeUpdate)
    }
  }, [bgmTrack])

  // 滚动进度 + 6 章节追踪
  useEffect(() => {
    if (!active) return

    let raf = 0
    const compute = () => {
      raf = 0
      const doc = document.documentElement
      const maxScroll = Math.max(1, doc.scrollHeight - window.innerHeight)
      const pct = Math.min(1, Math.max(0, window.scrollY / maxScroll))
      setScrollProgress(pct)

      const offset = 140
      let current = 0
      for (const ch of SPACE_NO_EDEN_CHAPTERS) {
        const el = document.getElementById(ch.headingId)
        if (el && el.getBoundingClientRect().top <= offset) {
          current = ch.index
        }
      }
      if (window.innerHeight + window.scrollY >= doc.scrollHeight - 8) {
        current = SPACE_NO_EDEN_CHAPTERS.length - 1
      }
      setChapterIndex(current)
    }

    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(compute)
    }

    compute()
    window.addEventListener("scroll", schedule, { passive: true })
    window.addEventListener("resize", schedule)
    return () => {
      window.removeEventListener("scroll", schedule)
      window.removeEventListener("resize", schedule)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [active])

  const toggleBgmPlay = useCallback(() => {
    const audio = audioRef.current
    if (!audio || !bgmTrack || !active) return
    if (bgmPlaying) {
      cancelBgmFade()
      userPausedRef.current = true
      audio.pause()
      setBgmPlaying(false)
    } else {
      userPausedRef.current = false
      if (yieldedToMain) {
        setYieldedToMain(false)
        suspendForOverride(STAGE_OWNER_ID, {
          title: bgmTrack.title,
          artist: bgmTrack.artist,
        })
      }
      void startArticlePlayback(false)
    }
  }, [
    active,
    bgmPlaying,
    bgmTrack,
    cancelBgmFade,
    startArticlePlayback,
    suspendForOverride,
    yieldedToMain,
  ])

  const seekBgm = useCallback((time: number) => {
    const audio = audioRef.current
    if (!audio) return
    audio.currentTime = time
    setBgmCurrentTime(time)
  }, [])

  const toggleBgmMute = useCallback(() => {
    setBgmMuted((prev) => !prev)
  }, [])

  const restoreMainPlaylist = useCallback(() => {
    cancelBgmFade()
    const audio = audioRef.current
    if (audio) audio.pause()
    userPausedRef.current = true
    setBgmPlaying(false)
    setYieldedToMain(true)
    releaseOverride(STAGE_OWNER_ID, { immediate: true })
  }, [cancelBgmFade, releaseOverride])

  const resumeArticleBgm = useCallback(() => {
    if (!bgmTrack || !active) return
    userPausedRef.current = false
    setYieldedToMain(false)
    suspendForOverride(STAGE_OWNER_ID, {
      title: bgmTrack.title,
      artist: bgmTrack.artist,
    })
    void startArticlePlayback(true)
  }, [active, bgmTrack, startArticlePlayback, suspendForOverride])

  const toggleImmersiveDark = useCallback(() => {
    setImmersiveDark((prev) => !prev)
  }, [])

  const chapter = SPACE_NO_EDEN_CHAPTERS[chapterIndex] ?? SPACE_NO_EDEN_CHAPTERS[0]

  const contextValue = useMemo(
    () => ({
      active,
      scrollProgress,
      chapterIndex,
      chapter,
      bgmTrack,
      bgmPlaying,
      bgmCurrentTime,
      bgmDuration,
      bgmMuted,
      autoplayBlocked,
      yieldedToMain,
      suspendedMainTrackTitle: articleOverride?.suspendedTrackTitle,
      wasMainPlaying: articleOverride?.wasMainPlaying ?? false,
      immersiveDark: effectiveDark && !isGlobalDark ? true : false,
      toggleImmersiveDark,
      toggleBgmPlay,
      seekBgm,
      toggleBgmMute,
      restoreMainPlaylist,
      resumeArticleBgm,
    }),
    [
      active,
      scrollProgress,
      chapterIndex,
      chapter,
      bgmTrack,
      bgmPlaying,
      bgmCurrentTime,
      bgmDuration,
      bgmMuted,
      autoplayBlocked,
      yieldedToMain,
      articleOverride?.suspendedTrackTitle,
      articleOverride?.wasMainPlaying,
      effectiveDark,
      isGlobalDark,
      toggleImmersiveDark,
      toggleBgmPlay,
      seekBgm,
      toggleBgmMute,
      restoreMainPlaylist,
      resumeArticleBgm,
    ]
  )

  const useScopedDarkVars = active && !isGlobalDark && immersiveDark

  return (
    <SpaceNoEdenContextProvider value={contextValue}>
      {bgmTrack && (
        <audio
          ref={audioRef}
          src={bgmTrack.src}
          loop
          preload="auto"
          className="hidden"
        />
      )}

      <div
        className={cn(
          "relative",
          useScopedDarkVars && "dark rounded-2xl"
        )}
        style={useScopedDarkVars ? SCOPED_DARK_VARS : undefined}
      >
        <SpaceNoEdenBackdrop />
        <div className="relative z-10">{children}</div>
      </div>
    </SpaceNoEdenContextProvider>
  )
}
