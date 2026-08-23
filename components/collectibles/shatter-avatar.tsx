"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { motion, useReducedMotion } from "motion/react"

/** 由 ChillButton 5% 概率触发 */
export const SHATTER_EVENT = "chill:avatar-shatter"

const PIECE_COUNT = 10

interface Fragment {
  id: number
  clip: string
  dx: number
  dy: number
  rot: number
}

function buildFragments(): Fragment[] {
  const fragments: Fragment[] = []
  for (let i = 0; i < PIECE_COUNT; i++) {
    const angle = (i / PIECE_COUNT) * Math.PI * 2
    // jagged radial shards around the center
    const x1 = Math.cos(angle) * 0.3 + 0.5
    const y1 = Math.sin(angle) * 0.3 + 0.5
    const a2 = angle + 0.45
    const x2 = Math.cos(a2) * 0.42 + 0.5
    const y2 = Math.sin(a2) * 0.42 + 0.5
    fragments.push({
      id: i,
      clip: `polygon(50% 50%, ${(x1 * 100).toFixed(1)}% ${(y1 * 100).toFixed(1)}%, ${(x2 * 100).toFixed(1)}% ${(y2 * 100).toFixed(1)}%)`,
      dx: (Math.random() - 0.5) * 160,
      dy: (Math.random() - 0.5) * 160,
      rot: (Math.random() - 0.5) * 260,
    })
  }
  return fragments
}

interface ShatterAvatarProps {
  size: number
  src: string
  shapeClass?: string
  alt?: string
}

/**
 * 包装头像。监听 SHATTER_EVENT：头像碎成碎片四散，10s 后复原。
 */
export function ShatterAvatar({
  size,
  src,
  shapeClass = "rounded-full",
  alt = "avatar",
}: ShatterAvatarProps) {
  const prefersReducedMotion = useReducedMotion()
  const [shattered, setShattered] = useState(false)
  const [fragments, setFragments] = useState<Fragment[]>([])
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const busyRef = useRef(false)

  const shatter = useCallback(() => {
    if (prefersReducedMotion) return
    if (busyRef.current) return
    busyRef.current = true
    setFragments(buildFragments())
    setShattered(true)
    timerRef.current = setTimeout(() => {
      setShattered(false)
      busyRef.current = false
    }, 10_000)
  }, [prefersReducedMotion])

  useEffect(() => {
    window.addEventListener(SHATTER_EVENT, shatter)
    return () => {
      window.removeEventListener(SHATTER_EVENT, shatter)
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [shatter])

  return (
    <div className="relative" style={{ width: size, height: size }}>
      {/* base avatar stays, dims while shattered */}
      <div
        className={`${shapeClass} h-full w-full transition-opacity duration-300`}
        style={{
          opacity: shattered ? 0.3 : 1,
          filter: shattered ? "blur(0.5px)" : "none",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          className="h-full w-full object-cover"
          style={{ borderRadius: "inherit" }}
        />
      </div>

      {/* fragments */}
      {shattered && (
        <div className={`pointer-events-none absolute inset-0 ${shapeClass}`}>
          {fragments.map((frag) => (
            <motion.div
              key={frag.id}
              className="absolute inset-0"
              initial={{ x: 0, y: 0, rotate: 0, opacity: 1 }}
              animate={{ x: frag.dx, y: frag.dy, rotate: frag.rot, opacity: 1 }}
              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            >
              <div
                className="h-full w-full"
                style={{
                  clipPath: frag.clip,
                  backgroundImage: `url(${src})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
