"use client"

import { useEffect, useRef, useState } from "react"
import { animate, useInView, useReducedMotion } from "motion/react"

import { LoadingDots } from "@/components/ui/loading-dots"
import type { Post } from "@/lib/mdx"
import type { Update } from "@/lib/updates"

interface ViewStats {
  total: number
  week: number
  today: number
}

function NumberTicker({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true })
  const prefersReducedMotion = useReducedMotion()

  useEffect(() => {
    if (!inView || ref.current === null) return

    if (prefersReducedMotion) {
      ref.current.textContent = value.toLocaleString("zh-CN")
      return
    }

    const controls = animate(0, value, {
      duration: 1.2,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (latest) => {
        if (ref.current) {
          ref.current.textContent = Math.round(latest).toLocaleString("zh-CN")
        }
      },
    })

    return () => controls.stop()
  }, [value, inView, prefersReducedMotion])

  return <span ref={ref}>0</span>
}

/**
 * 站点数据仪表带：合并原 SITE_VIEWS（/api/views 客户端拉取）
 * 与 STATS（静态汇总）为一条全宽发丝线数据带。
 */
export function DataStrip({ posts, updates }: { posts: Post[]; updates: Update[] }) {
  const [views, setViews] = useState<ViewStats | null>(null)

  useEffect(() => {
    let cancelled = false

    async function init() {
      try {
        const res = await fetch("/api/views")
        const data = (await res.json()) as ViewStats
        if (!cancelled) setViews(data)
      } catch {
        // ignore network errors
      }
    }

    init()
    return () => {
      cancelled = true
    }
  }, [])

  const totalWords = posts.reduce((sum, p) => sum + (p.wordCount || 0), 0)
  const totalImages = posts.reduce((sum, p) => sum + (p.imageCount || 0), 0)
  const lastUpdate = updates[0]?.date
    ? new Date(updates[0].date).toLocaleDateString("zh-CN")
    : "—"

  const numbers: { label: string; value: number | undefined }[] = [
    { label: "总浏览量", value: views?.total },
    { label: "近 7 日", value: views?.week },
    { label: "今日", value: views?.today },
    { label: "文章", value: posts.length },
    { label: "总字数", value: totalWords },
    { label: "图片", value: totalImages },
  ]

  return (
    <div className="v2-data-strip grid-cols-2 sm:grid-cols-4 lg:grid-cols-7">
      {numbers.map((cell) => (
        <div key={cell.label} className="v2-data-cell">
          <p className="font-mono text-2xl font-medium leading-none tabular-nums">
            {cell.value === undefined ? (
              <LoadingDots />
            ) : (
              <NumberTicker value={cell.value} />
            )}
          </p>
          <p className="mt-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            {cell.label}
          </p>
        </div>
      ))}
      <div className="v2-data-cell col-span-2 sm:col-span-1">
        <p className="font-mono text-sm font-medium leading-none tabular-nums">
          {lastUpdate}
        </p>
        <p className="mt-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          最后更新
        </p>
      </div>
    </div>
  )
}
