"use client"

import { X } from "lucide-react"
import { AnimatePresence, motion } from "motion/react"

import { useMusic } from "@/components/music/music-provider"
import { MusicPlayerCardAnimated } from "@/components/music/music-player-card-animated"
import { Button } from "@/components/ui/button"

export function MusicPlayerOverlay() {
  const { currentTrack, overlayOpen, setOverlayOpen } = useMusic()

  return (
    <AnimatePresence>
      {overlayOpen && currentTrack && (
        <motion.div
          key="music-overlay"
          initial={{ opacity: 0, y: -12, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -12, scale: 0.96 }}
          transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
          className="fixed left-4 right-4 top-16 z-50 sm:left-auto sm:right-4 sm:w-[360px]"
        >
          <div className="mb-2 flex justify-end">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-full border-border/60 bg-background/80 shadow-sm backdrop-blur"
              onClick={() => setOverlayOpen(false)}
              aria-label="收起音乐播放器"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <MusicPlayerCardAnimated />
        </motion.div>
      )}
    </AnimatePresence>
  )
}
