"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { useSession } from "next-auth/react"
import { useTheme } from "next-themes"
import { GripHorizontal, Maximize2, X } from "lucide-react"

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
  /** 垂直位置（相对容器高度的百分比），两个容器共用 */
  topPercent: number
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

/** 泳道高度（像素），侧栏弹幕区约 78px 高 → 3 条泳道 */
const LANE_HEIGHT = 22
/** 普通弹幕的发射间隔 */
const SPAWN_INTERVAL_MS = 1300
/** 同一泳道再次发射前要等多久（避免文字重叠） */
const LANE_BUSY_MS = 4000
/** 滚动耗时（秒）——原 9~14s 提速 1.5 倍 → 6~9.33s */
const MIN_DURATION = 6
const DURATION_RANGE = 10 / 3
/** 放大浮窗的尺寸 */
const PANEL_HEIGHT = 280
const PANEL_MAX_WIDTH = 560

function panelWidth() {
  return Math.max(240, Math.min(PANEL_MAX_WIDTH, window.innerWidth - 24))
}

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
      className="pointer-events-none absolute whitespace-nowrap text-xs font-medium will-change-transform"
      style={{
        left: "100%",
        top: `calc(${item.topPercent}% - 8px)`,
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
  const panelBodyRef = useRef<HTMLDivElement>(null)
  const [trackWidth, setTrackWidth] = useState(0)
  const [panelBodyWidth, setPanelBodyWidth] = useState(0)
  const [active, setActive] = useState<ActiveItem[]>([])
  const [mounted, setMounted] = useState(false)
  /** null = 浮窗关闭；否则是浮窗左上角坐标 */
  const [panelPos, setPanelPos] = useState<{ x: number; y: number } | null>(null)
  const dragRef = useRef<{ dx: number; dy: number } | null>(null)

  /** 当前可用的弹幕池（服务端数据 + 本地刚发的） */
  const itemsRef = useRef<DanmakuItem[]>(danmaku)
  /** 每条泳道下一次可发射的时间（performance.now 基准） */
  const laneFreeAtRef = useRef<number[]>([])

  useEffect(() => setMounted(true), [])

  // 侧栏弹幕区宽度
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const measure = () => setTrackWidth(el.clientWidth)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // 放大浮窗的内容宽度
  useEffect(() => {
    if (!panelPos) return
    const el = panelBodyRef.current
    if (!el) return
    const measure = () => setPanelBodyWidth(el.clientWidth)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [panelPos])

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
        Math.floor((containerRef.current?.clientHeight ?? 78) / LANE_HEIGHT)
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
          topPercent: ((lane + 0.5) / laneCount) * 100,
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

  const openPanel = useCallback(() => {
    const width = panelWidth()
    setPanelPos({
      x: Math.max(12, (window.innerWidth - width) / 2),
      y: Math.max(12, (window.innerHeight - PANEL_HEIGHT) / 2),
    })
  }, [])

  const closePanel = useCallback(() => {
    dragRef.current = null
    setPanelPos(null)
  }, [])

  const onDragStart = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!panelPos) return
    dragRef.current = {
      dx: event.clientX - panelPos.x,
      dy: event.clientY - panelPos.y,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const onDragMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return
    const width = panelWidth()
    const x = Math.min(
      Math.max(0, event.clientX - dragRef.current.dx),
      window.innerWidth - width
    )
    const y = Math.min(
      Math.max(0, event.clientY - dragRef.current.dy),
      window.innerHeight - PANEL_HEIGHT
    )
    setPanelPos({ x, y })
  }

  const onDragEnd = (event: React.PointerEvent<HTMLDivElement>) => {
    dragRef.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  return (
    <>
      <div ref={containerRef} className="relative h-full w-full overflow-hidden">
        {/* 放大按钮：弹幕区右上角 */}
        <button
          type="button"
          onClick={openPanel}
          aria-label="放大弹幕"
          title="放大弹幕"
          className="absolute right-0.5 top-0.5 z-20 rounded-md border border-border/60 bg-background/75 p-1 text-muted-foreground backdrop-blur transition-colors hover:border-accent/60 hover:text-accent"
        >
          <Maximize2 className="h-3 w-3" />
        </button>

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

      {mounted &&
        panelPos &&
        createPortal(
          <div
            data-danmaku-panel
            className="pointer-events-none fixed rounded-xl border border-border bg-background/90 shadow-2xl backdrop-blur-md"
            style={{
              left: panelPos.x,
              top: panelPos.y,
              width: panelWidth(),
              height: PANEL_HEIGHT,
              zIndex: 2147483000,
            }}
          >
            {/* 只有标题栏可交互（拖动/关闭），弹幕主体点击穿透到网页 */}
            <div
              onPointerDown={onDragStart}
              onPointerMove={onDragMove}
              onPointerUp={onDragEnd}
              onPointerCancel={onDragEnd}
              className="pointer-events-auto flex h-9 cursor-grab touch-none select-none items-center justify-between border-b border-border/60 px-3 active:cursor-grabbing"
            >
              <span className="font-mono text-[10px] tracking-[0.2em] text-muted-foreground">
                // DANMAKU
              </span>
              <div className="flex items-center gap-1">
                <GripHorizontal className="h-4 w-4 text-muted-foreground/70" />
                <button
                  type="button"
                  onPointerDown={(event) => event.stopPropagation()}
                  onClick={closePanel}
                  aria-label="关闭弹幕浮窗"
                  title="关闭"
                  className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent/10 hover:text-accent"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <div
              ref={panelBodyRef}
              className="pointer-events-none relative overflow-hidden"
              style={{ height: PANEL_HEIGHT - 36 }}
            >
              {active.map((item) => (
                <FlyingDanmaku
                  key={`panel-${item.key}`}
                  item={item}
                  trackWidth={panelBodyWidth}
                  isDark={isDark}
                  onDone={handleDone}
                />
              ))}
            </div>
          </div>,
          document.body
        )}
    </>
  )
}
