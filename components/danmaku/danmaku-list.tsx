"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useTheme } from "next-themes"

import type { Danmaku } from "@prisma/client"

interface DanmakuListProps {
  danmaku: Pick<Danmaku, "id" | "content" | "color" | "createdAt">[]
}

// 浅色模式下使用的深色随机色板，确保在浅底上可读
const lightPalette = [
  "#1e293b", // slate-800
  "#7f1d1d", // red-900
  "#14532d", // green-900
  "#1e3a8a", // blue-900
  "#581c87", // purple-900
  "#7c2d12", // orange-900
  "#064e3b", // emerald-900
  "#312e81", // indigo-900
  "#831843", // pink-900
  "#713f12", // yellow-900
]

function invertHex(hex: string): string {
  const sanitized = hex.replace("#", "")
  const r = (255 - parseInt(sanitized.slice(0, 2), 16))
    .toString(16)
    .padStart(2, "0")
  const g = (255 - parseInt(sanitized.slice(2, 4), 16))
    .toString(16)
    .padStart(2, "0")
  const b = (255 - parseInt(sanitized.slice(4, 6), 16))
    .toString(16)
    .padStart(2, "0")
  return `#${r}${g}${b}`
}

function shuffle<T>(array: T[]): T[] {
  const copy = [...array]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

interface ActiveItem {
  key: string
  content: string
  top: number
  duration: number
  color: string
}

export function DanmakuList({ danmaku }: DanmakuListProps) {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === "dark"

  const [active, setActive] = useState<ActiveItem[]>([])

  // 最近 50 条缓存池，以及全部历史池
  const recentPool = useMemo(
    () => shuffle(danmaku.slice(0, 50)),
    [danmaku]
  )
  const allPool = useMemo(() => shuffle(danmaku), [danmaku])

  const indexRef = useRef(0)
  const cycleRef = useRef(0)
  const poolRef = useRef<"recent" | "all">("recent")

  // 数据源变化时重置状态
  useEffect(() => {
    indexRef.current = 0
    cycleRef.current = 0
    poolRef.current = "recent"
    setActive([])
  }, [danmaku])

  useEffect(() => {
    if (danmaku.length === 0) return

    const spawn = () => {
      let item: Pick<Danmaku, "id" | "content" | "color" | "createdAt">

      if (poolRef.current === "recent") {
        item = recentPool[indexRef.current % recentPool.length]
        indexRef.current++

        if (indexRef.current >= recentPool.length) {
          indexRef.current = 0
          cycleRef.current++
          if (cycleRef.current >= 2) {
            poolRef.current = "all"
            indexRef.current = 0
          }
        }
      } else {
        item = allPool[indexRef.current % allPool.length]
        indexRef.current++

        if (indexRef.current >= allPool.length) {
          indexRef.current = 0
        }
      }

      const baseColor =
        lightPalette[Math.floor(Math.random() * lightPalette.length)]
      const color = isDark ? invertHex(baseColor) : baseColor
      const top = Math.floor(Math.random() * 85) + 5

      // 原速度基准 8s ~ 18s，新速度为现在的 30% ~ 50%
      const baseDuration = 8 + Math.random() * 10
      const speedRatio = 0.3 + Math.random() * 0.2
      const duration = baseDuration / speedRatio

      const key = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

      setActive((prev) => [
        ...prev,
        { key, content: item.content, top, duration, color },
      ])

      setTimeout(() => {
        setActive((prev) => prev.filter((i) => i.key !== key))
      }, duration * 1000)
    }

    spawn()
    const interval = setInterval(spawn, 2500)
    return () => clearInterval(interval)
  }, [danmaku.length, recentPool, allPool, isDark])

  return (
    <div className="relative h-full w-full overflow-hidden">
      <style>{`
        @keyframes danmaku-scroll {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(-100vw);
          }
        }
      `}</style>

      {active.length === 0 ? (
        <p className="flex h-full items-center justify-center text-xs text-muted-foreground">
          暂无弹幕
        </p>
      ) : (
        active.map((item) => (
          <div
            key={item.key}
            className="absolute whitespace-nowrap text-xs font-medium will-change-transform"
            style={{
              color: item.color,
              top: `${item.top}%`,
              right: 0,
              transform: "translateX(100%)",
              animation: `danmaku-scroll ${item.duration}s linear infinite`,
              textShadow: isDark
                ? "0 0 2px rgba(0,0,0,0.6)"
                : "0 0 2px rgba(255,255,255,0.6)",
            }}
          >
            {item.content}
          </div>
        ))
      )}
    </div>
  )
}
