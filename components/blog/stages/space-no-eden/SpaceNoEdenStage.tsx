"use client"

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { usePathname } from "next/navigation"

import {
  ARTICLE_BGM_YIELD_EVENT,
  useMusic,
} from "@/components/music/music-provider"
import type { StageBgmTrack } from "@/lib/music-find"
import { isExactStageRoute, SPACE_NO_EDEN_ROUTE } from "@/lib/post-stages"
import { SPACE_NO_EDEN_CHAPTERS } from "./chapters"
import { SpaceNoEdenBackdrop } from "./SpaceNoEdenBackdrop"
import { SpaceNoEdenContextProvider } from "./stage-context"

const STAGE_OWNER_ID = "post-stage:space-no-eden"

interface SpaceNoEdenStageProps {
  bgmTrack: StageBgmTrack | null
  children: ReactNode
}

export function SpaceNoEdenStage({ bgmTrack, children }: SpaceNoEdenStageProps) {
  const pathname = usePathname()
  const active = isExactStageRoute(pathname, SPACE_NO_EDEN_ROUTE)

  const {
    volume: globalVolume,
    muted: globalMuted,
    articleOverride,
    suspendForOverride,
    releaseOverride,
  } = useMusic()

  const audioRef = useRef<HTMLAudioElement>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const sourceConnectedRef = useRef(false)
  const bgmFadeRafRef = useRef<number>(0)
  const userPausedRef = useRef(false)
  const autoplayBlockedRef = useRef(false)

  const startTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [bgmPlaying, setBgmPlaying] = useState(false)
  const [autoplayBlocked, setAutoplayBlocked] = useState(false)
  const [yieldedToMain, setYieldedToMain] = useState(false)
  const [scrollProgress, setScrollProgress] = useState(0)
  const [chapterIndex, setChapterIndex] = useState(0)

  const ensureAudioAnalyser = useCallback(async () => {
    const audio = audioRef.current
    if (!audio || typeof window === "undefined") return
    try {
      if (!audioCtxRef.current) {
        const Ctx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext?: typeof AudioContext })
            .webkitAudioContext
        if (!Ctx) return
        audioCtxRef.current = new Ctx()
      }
      const ctx = audioCtxRef.current
      if (!sourceConnectedRef.current) {
        const source = ctx.createMediaElementSource(audio)
        const analyser = ctx.createAnalyser()
        analyser.fftSize = 128
        analyser.smoothingTimeConstant = 0.82
        source.connect(analyser)
        analyser.connect(ctx.destination)
        analyserRef.current = analyser
        sourceConnectedRef.current = true
      }
      if (ctx.state === "suspended") {
        await ctx.resume()
      }
    } catch {
      // Web Audio 不可用时不影响原生 <audio> 播放
    }
  }, [])

  // 文章伴音默认音量限制为 60%（仍尊重全局静音及更低全局音量）
  const targetVolume = useMemo(() => {
    if (globalMuted) return 0
    return Math.max(0, Math.min(0.6, globalVolume))
  }, [globalMuted, globalVolume])

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
      const clampedTo = Math.max(0, Math.min(1, toVol))
      if (clampedTo <= 0 || durationMs <= 0) {
        audio.volume = clampedTo
        return
      }
      audio.volume = 0
      let start: number | null = null
      const step = (now: number) => {
        if (start === null) start = now
        const p = Math.max(0, Math.min(1, (now - start) / durationMs))
        audio.volume = Math.max(0, Math.min(1, clampedTo * p))
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
        void ensureAudioAnalyser()
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
    [active, bgmTrack, ensureAudioAnalyser, fadeBgmIn]
  )

  // 严格按路由生命周期接管与释放站点音乐播放器：进入文章先挂起原曲，延迟 2 秒再播放 Everglow
  useEffect(() => {
    if (startTimerRef.current) {
      clearTimeout(startTimerRef.current)
      startTimerRef.current = null
    }

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
      startTimerRef.current = setTimeout(() => {
        startTimerRef.current = null
        if (!userPausedRef.current) {
          void startArticlePlayback(true)
        }
      }, 2000)
    }

    return () => {
      if (startTimerRef.current) {
        clearTimeout(startTimerRef.current)
        startTimerRef.current = null
      }
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

  useEffect(() => {
    return () => {
      if (audioCtxRef.current) {
        void audioCtxRef.current.close().catch(() => {})
        audioCtxRef.current = null
      }
    }
  }, [])

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

  // 若直接刷新进文章被浏览器自动播放策略拦截，则在首次交互时唤醒（除非用户手动暂停）
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

  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !bgmTrack) return

    const onPlay = () => setBgmPlaying(true)
    const onPause = () => setBgmPlaying(false)

    audio.addEventListener("play", onPlay)
    audio.addEventListener("pause", onPause)
    return () => {
      audio.removeEventListener("play", onPlay)
      audio.removeEventListener("pause", onPause)
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
    if (startTimerRef.current) {
      clearTimeout(startTimerRef.current)
      startTimerRef.current = null
    }
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

  const restoreMainPlaylist = useCallback(() => {
    if (startTimerRef.current) {
      clearTimeout(startTimerRef.current)
      startTimerRef.current = null
    }
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

  const chapter = SPACE_NO_EDEN_CHAPTERS[chapterIndex] ?? SPACE_NO_EDEN_CHAPTERS[0]

  const contextValue = useMemo(
    () => ({
      active,
      scrollProgress,
      chapterIndex,
      chapter,
      bgmTrack,
      bgmPlaying,
      autoplayBlocked,
      yieldedToMain,
      suspendedMainTrackTitle: articleOverride?.suspendedTrackTitle,
      wasMainPlaying: articleOverride?.wasMainPlaying ?? false,
      toggleBgmPlay,
      restoreMainPlaylist,
      resumeArticleBgm,
      analyserRef,
    }),
    [
      active,
      scrollProgress,
      chapterIndex,
      chapter,
      bgmTrack,
      bgmPlaying,
      autoplayBlocked,
      yieldedToMain,
      articleOverride?.suspendedTrackTitle,
      articleOverride?.wasMainPlaying,
      toggleBgmPlay,
      restoreMainPlaylist,
      resumeArticleBgm,
    ]
  )

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

      <div className="relative">
        <SpaceNoEdenBackdrop />
        <div className="relative z-10">{children}</div>
      </div>
    </SpaceNoEdenContextProvider>
  )
}
