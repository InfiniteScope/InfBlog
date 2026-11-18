"use client"

import { useEffect, useRef, useState } from "react"
import { AnimatePresence, motion } from "motion/react"

import { useSpaceNoEdenStage } from "./stage-context"

/**
 * 章节跨越瞬间触发的非阻断式「幕间遥测闪条」：
 * 横跨视口的激光扫描线 + 幕间编号标题，约 1.4 秒后自动收隐，不遮挡阅读交互。
 */
export function SpaceNoEdenActFlash() {
  const { active, chapter, curtainOpen } = useSpaceNoEdenStage()
  const [visible, setVisible] = useState(false)
  const prevIndexRef = useRef<number | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!active || curtainOpen) return
    if (prevIndexRef.current === null) {
      prevIndexRef.current = chapter.index
      return
    }
    if (prevIndexRef.current === chapter.index) return
    prevIndexRef.current = chapter.index

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

    setVisible(true)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      setVisible(false)
    }, 1450)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [active, chapter.index, curtainOpen])

  if (!active) return null

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key={chapter.code}
          aria-hidden
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          className="pointer-events-none fixed inset-x-0 top-16 z-40 flex flex-col items-center px-4"
        >
          <div
            className="flex items-center gap-3 rounded-full border bg-[#040711]/85 px-4 py-1.5 font-mono text-[11px] tracking-wider shadow-lg backdrop-blur-md"
            style={{
              borderColor: `rgba(${chapter.glowRgb}, 0.55)`,
              boxShadow: `0 0 28px rgba(${chapter.glowRgb}, 0.25)`,
            }}
          >
            <span style={{ color: `rgb(${chapter.glowRgb})` }}>
              {chapter.code}
            </span>
            <span className="text-slate-200">{chapter.title}</span>
            <span className="hidden text-slate-400 sm:inline">
              · {chapter.era}
            </span>
          </div>
          <motion.div
            initial={{ scaleX: 0, opacity: 0.9 }}
            animate={{ scaleX: 1, opacity: 0 }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            className="mt-1.5 h-[1px] w-full max-w-4xl origin-center"
            style={{
              background: `linear-gradient(90deg, transparent, rgb(${chapter.glowRgb}), transparent)`,
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  )
}
