"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { useSession } from "next-auth/react"

import { claimCollectible, notifyCollectible } from "@/lib/collectibles-client"

export type MusicCategory = "soothing" | "intense" | "white-noise"

export type PlayMode = "list-loop" | "single-loop" | "no-loop"

export interface Track {
  id: string
  title: string
  artist: string
  album?: string
  category: MusicCategory
  duration: string
  durationSeconds: number
  src: string
  cover?: string
}

export interface ArticleBgmOverride {
  ownerId: string
  title: string
  artist?: string
  suspendedTrackTitle?: string
  wasMainPlaying: boolean
}

export const ARTICLE_BGM_YIELD_EVENT = "infblog:article-bgm-yield"

interface MusicContextValue {
  tracks: Track[]
  currentIndex: number
  currentTrack: Track | null
  /** true once the playlist metadata has loaded (success or failure). */
  loaded: boolean
  isPlaying: boolean
  currentTime: number
  duration: number
  volume: number
  muted: boolean
  collapsed: boolean
  setCollapsed: (value: boolean) => void
  /** Full player overlay opened manually from the navbar mini player. */
  overlayOpen: boolean
  setOverlayOpen: (value: boolean) => void
  /** Active music category (soothing / intense / white-noise). */
  category: MusicCategory
  setCategory: (value: MusicCategory) => void
  /** Playback mode: list-loop / single-loop / no-loop. */
  playMode: PlayMode
  cyclePlayMode: () => void
  togglePlay: () => void
  playTrack: (index: number) => void
  next: () => void
  prev: () => void
  seek: (time: number) => void
  setVolume: (value: number) => void
  toggleMute: () => void
  /** 非空表示当前由某篇特殊文章的伴音接管，原曲目与进度被挂起保留 */
  articleOverride: ArticleBgmOverride | null
  /** 挂起当前音乐播放器（保留曲目与播放进度），进入专属伴音模式 */
  suspendForOverride: (
    ownerId: string,
    meta: { title: string; artist?: string }
  ) => void
  /** 退出专属伴音模式；若进入前主播放器正在播放且未被用户接管，则无缝恢复原进度 */
  releaseOverride: (ownerId: string, options?: { immediate?: boolean }) => void
}

const MusicContext = createContext<MusicContextValue | null>(null)

export function useMusic() {
  const ctx = useContext(MusicContext)
  if (!ctx) throw new Error("useMusic must be used within MusicProvider")
  return ctx
}

function formatTime(seconds: number) {
  if (Number.isNaN(seconds)) return "0:00"
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0")
  return `${m}:${s}`
}

const PLAY_MODE_ORDER: PlayMode[] = ["list-loop", "single-loop", "no-loop"]

export function MusicProvider({ children }: { children: ReactNode }) {
  const { status } = useSession()
  const [rawTracks, setRawTracks] = useState<Track[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolumeState] = useState(0.8)
  const [muted, setMuted] = useState(false)
  const [collapsed, setCollapsed] = useState(true)
  const [overlayOpen, setOverlayOpen] = useState(false)
  const [category, setCategory] = useState<MusicCategory>("soothing")
  const [playMode, setPlayMode] = useState<PlayMode>("list-loop")
  const [loaded, setLoaded] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)
  const playModeRef = useRef<PlayMode>("list-loop")
  const [articleOverride, setArticleOverride] = useState<ArticleBgmOverride | null>(null)
  const articleOverrideRef = useRef<ArticleBgmOverride | null>(null)
  const suspendedSnapshotRef = useRef<{ wasPlaying: boolean; ownerId: string } | null>(null)
  const releaseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const fadeRafRef = useRef<number>(0)
  const isPlayingRef = useRef(false)
  const volumeRef = useRef(0.8)
  const mutedRef = useRef(false)
  const currentTrackRef = useRef<Track | null>(null)

  // Keep the ref in sync so the audio effect only depends on the track
  // itself; switching play mode never touches playback progress.
  useEffect(() => {
    playModeRef.current = playMode
  }, [playMode])

  useEffect(() => {
    isPlayingRef.current = isPlaying
  }, [isPlaying])

  useEffect(() => {
    volumeRef.current = volume
    mutedRef.current = muted
  }, [volume, muted])

  useEffect(() => {
    articleOverrideRef.current = articleOverride
  }, [articleOverride])

  const tracks = rawTracks.filter((t) => t.category === category)
  const currentTrack = tracks[currentIndex] || null

  useEffect(() => {
    currentTrackRef.current = currentTrack
  }, [currentTrack])

  const cancelFade = useCallback(() => {
    if (fadeRafRef.current) {
      cancelAnimationFrame(fadeRafRef.current)
      fadeRafRef.current = 0
    }
  }, [])

  const fadeAudio = useCallback(
    (
      audio: HTMLAudioElement,
      from: number,
      to: number,
      durationMs: number,
      onDone?: () => void
    ) => {
      cancelFade()
      if (durationMs <= 0) {
        audio.volume = Math.max(0, Math.min(1, to))
        onDone?.()
        return
      }
      const start = performance.now()
      const tick = (now: number) => {
        const progress = Math.min(1, (now - start) / durationMs)
        audio.volume = Math.max(0, Math.min(1, from + (to - from) * progress))
        if (progress < 1) {
          fadeRafRef.current = requestAnimationFrame(tick)
        } else {
          fadeRafRef.current = 0
          onDone?.()
        }
      }
      fadeRafRef.current = requestAnimationFrame(tick)
    },
    [cancelFade]
  )

  useEffect(() => () => {
    cancelFade()
    if (releaseTimerRef.current) clearTimeout(releaseTimerRef.current)
  }, [cancelFade])

  useEffect(() => {
    fetch("/api/music/playlist")
      .then((res) => res.json())
      .then((data) => {
        setRawTracks(data.tracks || [])
        setLoaded(true)
      })
      .catch(() => setLoaded(true))
  }, [])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !currentTrack) return

    const onLoadedMetadata = () => setDuration(audio.duration)
    const onEnded = () => {
      // Decide the next action only when the current track has finished.
      const mode = playModeRef.current
      if (mode === "single-loop") {
        audio.currentTime = 0
        audio.play().catch(() => setIsPlaying(false))
      } else if (mode === "no-loop") {
        // Stop after the current track finishes.
        audio.currentTime = 0
        setIsPlaying(false)
      } else {
        next()
      }
    }
    const onPlay = () => setIsPlaying(true)
    const onPause = () => setIsPlaying(false)

    // Throttle current time updates to avoid re-rendering on every audio frame.
    const interval = setInterval(() => {
      setCurrentTime(audio.currentTime)
    }, 150)

    audio.addEventListener("loadedmetadata", onLoadedMetadata)
    audio.addEventListener("ended", onEnded)
    audio.addEventListener("play", onPlay)
    audio.addEventListener("pause", onPause)

    audio.src = currentTrack.src
    audio.load()
    setCurrentTime(0)
    setDuration(0)
    if (isPlaying) {
      audio.play().catch(() => setIsPlaying(false))
    }

    return () => {
      clearInterval(interval)
      audio.removeEventListener("loadedmetadata", onLoadedMetadata)
      audio.removeEventListener("ended", onEnded)
      audio.removeEventListener("play", onPlay)
      audio.removeEventListener("pause", onPause)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTrack])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    cancelFade()
    audio.volume = muted ? 0 : volume
  }, [volume, muted, cancelFade])

  const yieldArticleOverride = useCallback(() => {
    if (!articleOverrideRef.current && !suspendedSnapshotRef.current) return
    if (releaseTimerRef.current) {
      clearTimeout(releaseTimerRef.current)
      releaseTimerRef.current = null
    }
    cancelFade()
    suspendedSnapshotRef.current = null
    setArticleOverride(null)
    const audio = audioRef.current
    if (audio) {
      audio.volume = mutedRef.current ? 0 : volumeRef.current
    }
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(ARTICLE_BGM_YIELD_EVENT))
    }
  }, [cancelFade])

  const suspendForOverride = useCallback(
    (ownerId: string, meta: { title: string; artist?: string }) => {
      if (releaseTimerRef.current) {
        clearTimeout(releaseTimerRef.current)
        releaseTimerRef.current = null
      }

      const audio = audioRef.current
      if (!suspendedSnapshotRef.current) {
        const wasMainPlaying =
          Boolean(audio && !audio.paused) || isPlayingRef.current
        suspendedSnapshotRef.current = { wasPlaying: wasMainPlaying, ownerId }
        setArticleOverride({
          ownerId,
          title: meta.title,
          artist: meta.artist,
          suspendedTrackTitle: currentTrackRef.current?.title,
          wasMainPlaying,
        })

        if (audio && !audio.paused) {
          const startVol = audio.volume
          fadeAudio(audio, startVol, 0, 240, () => {
            audio.pause()
            audio.volume = mutedRef.current ? 0 : volumeRef.current
          })
        }
      } else if (suspendedSnapshotRef.current.ownerId === ownerId) {
        const wasMainPlaying = suspendedSnapshotRef.current.wasPlaying
        setArticleOverride({
          ownerId,
          title: meta.title,
          artist: meta.artist,
          suspendedTrackTitle: currentTrackRef.current?.title,
          wasMainPlaying,
        })
      }
    },
    [fadeAudio]
  )

  const releaseOverride = useCallback(
    (ownerId: string, options?: { immediate?: boolean }) => {
      const performRelease = () => {
        releaseTimerRef.current = null
        const snap = suspendedSnapshotRef.current
        if (!snap || snap.ownerId !== ownerId) return
        suspendedSnapshotRef.current = null
        setArticleOverride(null)

        const audio = audioRef.current
        if (snap.wasPlaying && audio && currentTrackRef.current) {
          const targetVol = mutedRef.current ? 0 : volumeRef.current
          audio.volume = 0
          audio
            .play()
            .then(() => {
              fadeAudio(audio, 0, targetVol, 420)
            })
            .catch(() => {
              audio.volume = targetVol
            })
        }
      }

      if (releaseTimerRef.current) {
        clearTimeout(releaseTimerRef.current)
        releaseTimerRef.current = null
      }

      if (options?.immediate) {
        performRelease()
      } else {
        releaseTimerRef.current = setTimeout(performRelease, 60)
      }
    },
    [fadeAudio]
  )

  const togglePlay = () => {
    const audio = audioRef.current
    if (!audio || !currentTrack) return
    if (isPlaying) {
      audio.pause()
    } else {
      yieldArticleOverride()
      audio.play().catch(() => {})
    }
  }

  const playTrack = (index: number) => {
    if (index < 0 || index >= tracks.length) return
    yieldArticleOverride()
    setCurrentIndex(index)
    setIsPlaying(true)
  }

  const next = () => {
    if (tracks.length === 0) return
    yieldArticleOverride()
    setCurrentIndex((i) => (i + 1) % tracks.length)
    setIsPlaying(true)
  }

  const prev = () => {
    if (tracks.length === 0) return
    yieldArticleOverride()
    setCurrentIndex((i) => (i - 1 + tracks.length) % tracks.length)
    setIsPlaying(true)
  }

  const changeCategory = (value: MusicCategory) => {
    yieldArticleOverride()
    setCategory(value)
    setCurrentIndex(0)
    setIsPlaying(false)
  }

  const cyclePlayMode = () => {
    setPlayMode((mode) => {
      const idx = PLAY_MODE_ORDER.indexOf(mode)
      return PLAY_MODE_ORDER[(idx + 1) % PLAY_MODE_ORDER.length]
    })
  }

  const seek = (time: number) => {
    const audio = audioRef.current
    if (!audio) return
    audio.currentTime = time
    setCurrentTime(time)
  }

  const setVolume = (value: number) => {
    setVolumeState(value)
    if (value > 0) setMuted(false)
  }

  const toggleMute = () => setMuted((m) => !m)

  // ── "Listener..." collectible: cumulative 30min of listening ──────
  // The user must be signed in; progress is persisted in localStorage
  // so it survives navigation and reloads.
  const LISTENER_SECONDS = 30 * 60
  useEffect(() => {
    if (status !== "authenticated") return
    const KEY = "collectible:listener:seconds"
    const FLAG = "collectible:listener:claimed"
    if (localStorage.getItem(FLAG)) return

    const interval = setInterval(async () => {
      const audio = audioRef.current
      if (audio && !audio.paused && !audio.ended) {
        const elapsed = Number(localStorage.getItem(KEY) || 0)
        const total = elapsed + 30
        localStorage.setItem(KEY, String(total))
        if (total >= LISTENER_SECONDS) {
          const result = await claimCollectible("listener")
          if (result === "claimed") {
            notifyCollectible("listener")
            localStorage.setItem(FLAG, "1")
            localStorage.setItem(KEY, "0")
          } else if (result === "owned") {
            localStorage.setItem(FLAG, "1")
            localStorage.setItem(KEY, "0")
          }
        }
      }
    }, 30_000)

    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status])

  return (
    <MusicContext.Provider
      value={{
        tracks,
        currentIndex,
        currentTrack,
        loaded,
        isPlaying,
        currentTime,
        duration,
        volume,
        muted,
        collapsed,
        setCollapsed,
        overlayOpen,
        setOverlayOpen,
        category,
        setCategory: changeCategory,
        playMode,
        cyclePlayMode,
        togglePlay,
        playTrack,
        next,
        prev,
        seek,
        setVolume,
        toggleMute,
        articleOverride,
        suspendForOverride,
        releaseOverride,
      }}
    >
      <audio ref={audioRef} preload="metadata" />
      {children}
    </MusicContext.Provider>
  )
}
