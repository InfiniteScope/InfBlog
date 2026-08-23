"use client"

import {
  createContext,
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

  // Keep the ref in sync so the audio effect only depends on the track
  // itself; switching play mode never touches playback progress.
  useEffect(() => {
    playModeRef.current = playMode
  }, [playMode])

  const tracks = rawTracks.filter((t) => t.category === category)
  const currentTrack = tracks[currentIndex] || null

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
    audio.volume = muted ? 0 : volume
  }, [volume, muted])

  const togglePlay = () => {
    const audio = audioRef.current
    if (!audio || !currentTrack) return
    if (isPlaying) {
      audio.pause()
    } else {
      audio.play().catch(() => {})
    }
  }

  const playTrack = (index: number) => {
    if (index < 0 || index >= tracks.length) return
    setCurrentIndex(index)
    setIsPlaying(true)
  }

  const next = () => {
    if (tracks.length === 0) return
    setCurrentIndex((i) => (i + 1) % tracks.length)
    setIsPlaying(true)
  }

  const prev = () => {
    if (tracks.length === 0) return
    setCurrentIndex((i) => (i - 1 + tracks.length) % tracks.length)
    setIsPlaying(true)
  }

  const changeCategory = (value: MusicCategory) => {
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
      }}
    >
      <audio ref={audioRef} preload="metadata" />
      {children}
    </MusicContext.Provider>
  )
}
