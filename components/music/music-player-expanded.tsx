"use client"

import { useEffect, useRef } from "react"
import { AnimatePresence, motion } from "motion/react"

import { useMusic } from "@/components/music/music-provider"
import { MusicPlayerCard } from "@/components/music/music-player-card"

export function MusicPlayerExpanded() {
  const { collapsed, setCollapsed } = useMusic()
  const sentinelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        setCollapsed(!entry.isIntersecting)
      },
      {
        threshold: 0,
        rootMargin: "-80px 0px 0px 0px",
      }
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [setCollapsed])

  return (
    <div ref={sentinelRef} className="h-56">
      <AnimatePresence mode="wait">
        {!collapsed && (
          <motion.div
            key="full-player"
            initial={{ opacity: 0, scale: 0.96, y: -12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -12 }}
            transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
          >
            <MusicPlayerCard />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
