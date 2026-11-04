"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useSession } from "next-auth/react"
import { useTheme } from "next-themes"

import type { Danmaku } from "@prisma/client"

import {
  DANMAKU_CREATED_EVENT,
  type CreatedDanmakuDetail,
} from "@/lib/danmaku-events"

interface DanmakuListProps {
  danmaku: Pick<
    Danmaku,
    "id" | "content" | "color" | "createdAt" | "userId"
  >[]
}

type DanmakuItem = Omit<DanmakuListProps["danmaku"][number], "createdAt"> & {
  createdAt: Date | string
}

interface ActiveItem {
  key: string
  content: string
  color: string
  top: number
  duration: number
  mine: boolean
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

/** 泳道高度（像素），侧栏弹幕区 96px 高 → 4 条泳道 */
const LANE_HEIGHT = 22
/** 普通弹幕的发射间隔 */
const SPAWN_INTERVAL_MS = 1300
/** 同一泳道再次发射前要等多久（避免文字重叠） */
const LANE_BUSY_MS = 4000
/** 滚动耗时范围（秒） */
const MIN_DURATION = 9
const DURATION_RANGE = 5

function invertHex(hex: string): string {
  const sanitized = hex.replace("#", "")
  const r = 255 - parseInt(sanitized.slice(0, 2), 16)
  const g = 255 - parseInt(sanitized.slice(2, 4), 16)
  const b = 255 - parseInt(sanitized.slice(4, 6), 16)
  return `#${[r, g, b]
    .map((n) => n.toString(16).padStart(2, "0"))
    .join("")}`
}

function pickColor(isDark: boolean) {
  const base = lightPalette[Math.floor(Math.random() * lightPalette.length)]
  return isDark ? invertHex(base) : base
}

function FlyingDanmaku({
  item,
  trackWidth,
  isDark,
  onDone,
}: {
  item: ActiveItem
  trackWidth: number
  isDark: boolean
  onDone: (key: string) => void
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el || trackWidth <= 0) return

    // 从容器右缘外开始，移动到完全离开左缘
    const distance = trackWidth + el.offsetWidth + 24
    const durationMs = item.duration * 1000
    const animation = el.animate(
      [
        { transform: "translateX(0)" },
        { transform: `translateX(-${distance}px)` },
      ],
      { duration: durationMs, easing: "linear", fill: "forwards" }
    )

    let finished = false
    const finish = () => {
      if (finished) return
      finished = true
      onDone(item.key)
    }
    animation.onfinish = finish
    const timer = window.setTimeout(finish, durationMs + 120)

    return () => {
      animation.cancel()
      window.clearTimeout(timer)
    }
  }, [item, trackWidth, onDone])

  return (
    <div
      ref={ref}
      data-danmaku-item
      data-mine={item.mine ? "true" : "false"}
      className="absolute whitespace-nowrap text-xs font-medium will-change-transform"
      style={{
        left: "100%",
        top: item.top,
        color: item.color,
        textShadow: isDark
          ? "0 0 2px rgba(0,0,0,0.6)"
          : "0 0 2px rgba(255,255,255,0.6)",
      }}
    >
      {item.mine ? (
        // 登录用户自己发的弹幕：白色框（B 站风格），匿名用户不会走到这里
        <span className="rounded-md border border-white/90 bg-black/45 px-1.5 py-0.5 text-white shadow-[0_0_10px_rgba(255,255,255,0.25)]">
          {item.content}
        </span>
      ) : (
        item.content
      )}
    </div>
  )
}

export function DanmakuList({ danmaku }: DanmakuListProps) {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === "dark"
  const { data: session } = useSession()
  const myId = session?.user?.id ?? null

  const containerRef = useRef<HTMLDivElement>(null)
  const [trackWidth, setTrackWidth] = useState(0)
  const [active, setActive] = useState<ActiveItem[]>([])

  /** 当前可用的弹幕池（服务端数据 + 本地刚发的） */
  const itemsRef = useRef<DanmakuItem[]>(danmaku)
  /** 每条泳道下一次可发射的时间（performance.now 基准） */
  const laneFreeAtRef = useRef<number[]>([])

  // 容器宽度：动画需要按“容器宽度 + 文字宽度”精确算距离
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const measure = () => setTrackWidth(el.clientWidth)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // 合并服务端下发的弹幕（去重），不清空正在飞行的条目
  useEffect(() => {
    const map = new Map<number, DanmakuItem>()
    for (const item of [...itemsRef.current, ...danmaku]) map.set(item.id, item)
    itemsRef.current = [...map.values()]
  }, [danmaku])

  const spawn = useCallback(
    (item: DanmakuItem | null, force = false) => {
      if (!item) return

      const laneCount = Math.max(
        2,
        Math.floor((containerRef.current?.clientHeight ?? 96) / LANE_HEIGHT)
      )
      if (laneFreeAtRef.current.length !== laneCount) {
        laneFreeAtRef.current = Array(laneCount).fill(0)
      }

      const now = performance.now()
      let lane = laneFreeAtRef.current.findIndex((freeAt) => freeAt <= now)
      if (lane < 0) {
        // 普通弹幕：没空泳道就跳过，避免重叠；
        // 刚发送的弹幕（force）：挤到最早空闲的泳道，保证立刻可见
        if (!force) return
        lane = laneFreeAtRef.current.indexOf(
          Math.min(...laneFreeAtRef.current)
        )
      }
      laneFreeAtRef.current[lane] = now + LANE_BUSY_MS

      const key = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
      setActive((prev) => [
        ...prev,
        {
          key,
          content: item.content,
          color: pickColor(isDark),
          top: lane * LANE_HEIGHT + 1,
          duration: MIN_DURATION + Math.random() * DURATION_RANGE,
          mine: Boolean(myId && item.userId && item.userId === myId),
        },
      ])
    },
    [isDark, myId]
  )

  const pickNext = useCallback(() => {
    const pool = itemsRef.current
    if (pool.length === 0) return null
    const recent = pool.slice(0, 15)
    const useRecent = recent.length > 0 && Math.random() < 0.65
    const source = useRecent ? recent : pool
    return source[Math.floor(Math.random() * source.length)]
  }, [])

  // 发射器：启动时先补 3 条，之后每 1.3s 一条
  useEffect(() => {
    if (itemsRef.current.length === 0) return

    const timers: number[] = [
      window.setTimeout(() => spawn(pickNext()), 0),
      window.setTimeout(() => spawn(pickNext()), 220),
      window.setTimeout(() => spawn(pickNext()), 440),
    ]
    const interval = window.setInterval(
      () => spawn(pickNext()),
      SPAWN_INTERVAL_MS
    )

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer))
      window.clearInterval(interval)
    }
  }, [spawn, pickNext])

  // 自己发送成功 → 立即插入并发射（不刷新页面）
  useEffect(() => {
    const onCreated = (event: Event) => {
      const detail = (event as CustomEvent<CreatedDanmakuDetail>).detail
      if (!detail) return
      const item: DanmakuItem = {
        id: detail.id,
        content: detail.content,
        color: detail.color,
        userId: detail.userId,
        createdAt: detail.createdAt,
      }
      itemsRef.current = [
        item,
        ...itemsRef.current.filter((existing) => existing.id !== item.id),
      ]
      spawn(item, true)
    }

    window.addEventListener(DANMAKU_CREATED_EVENT, onCreated)
    return () => window.removeEventListener(DANMAKU_CREATED_EVENT, onCreated)
  }, [spawn])

  const handleDone = useCallback((key: string) => {
    setActive((prev) => prev.filter((item) => item.key !== key))
  }, [])

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-hidden">
      {active.length === 0 && danmaku.length === 0 ? (
        <p className="flex h-full items-center justify-center text-xs text-muted-foreground">
          暂无弹幕
        </p>
      ) : (
        active.map((item) => (
          <FlyingDanmaku
            key={item.key}
            item={item}
            trackWidth={trackWidth}
            isDark={isDark}
            onDone={handleDone}
          />
        ))
      )}
    </div>
  )
}
