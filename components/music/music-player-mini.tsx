"use client"

import { AnimatePresence, motion } from "motion/react"
import { Music, Pause, Play, SkipForward } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useMusic } from "@/components/music/music-provider"
import { cn } from "@/lib/utils"

export function MusicPlayerMini() {
  const {
    currentTrack,
    isPlaying,
    collapsed,
    overlayOpen,
    setOverlayOpen,
    togglePlay,
    next,
  } = useMusic()

  const track =
    currentTrack && collapsed && !overlayOpen ? currentTrack : null

  return (
    <AnimatePresence>
      {track && (
        <motion.div
          key="mini-player"
          initial={{ opacity: 0, scale: 0.9, x: 12 }}
          animate={{ opacity: 1, scale: 1, x: 0 }}
          exit={{ opacity: 0, scale: 0.9, x: 12 }}
          transition={{ duration: 0.2, ease: [0.32, 0.72, 0, 1] }}
          className="flex cursor-pointer items-center gap-2 rounded-full border border-border/60 bg-background/80 px-2 py-1 shadow-sm backdrop-blur-md"
          onClick={() => setOverlayOpen(true)}
          title="展开音乐播放器"
        >
          <div className="relative h-7 w-7 overflow-hidden rounded-full">
            {track.cover ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={track.cover}
                alt={track.title}
                className={cn("h-full w-full object-cover", "animate-spin-slow")}
                style={{ animationPlayState: isPlaying ? "running" : "paused" }}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-muted">
                <Music className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
            )}
          </div>
          <div className="hidden max-w-[100px] sm:block">
            <p className="truncate text-xs font-medium">{track.title}</p>
            <p className="truncate text-[10px] text-muted-foreground">{track.artist}</p>
          </div>
          <div className="flex items-center" onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={togglePlay}>
              {isPlaying ? (
                <Pause className="h-3.5 w-3.5" />
              ) : (
                <Play className="h-3.5 w-3.5 pl-0.5" />
              )}
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={next}>
              <SkipForward className="h-3.5 w-3.5" />
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
