"use client"

import { useEffect, useRef, useState } from "react"
import { animate, useInView, useReducedMotion } from "motion/react"
import { Eye, TrendingUp, Sun } from "lucide-react"

import { LoadingDots } from "@/components/ui/loading-dots"
import { SectionHeading } from "@/components/ui/section-heading"

interface ViewStats {
  total: number
  week: number
  today: number
}

function NumberTicker({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true })
  const prefersReducedMotion = useReducedMotion()
  const displayed = useRef(0)

  useEffect(() => {
    if (!inView || ref.current === null) return

    if (prefersReducedMotion) {
      displayed.current = value
      ref.current.textContent = value.toLocaleString("zh-CN")
      return
    }

    const controls = animate(0, value, {
      duration: 1.2,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (latest) => {
        displayed.current = latest
        if (ref.current) {
          ref.current.textContent = Math.round(latest).toLocaleString("zh-CN")
        }
      },
    })

    return () => controls.stop()
  }, [value, inView, prefersReducedMotion])

  return <span ref={ref}>0</span>
}

export function ViewsCard() {
  const [stats, setStats] = useState<ViewStats | null>(null)

  useEffect(() => {
    let cancelled = false

    async function init() {
      try {
        const res = await fetch("/api/views")
        const data = (await res.json()) as ViewStats
        if (!cancelled) setStats(data)
      } catch {
        // ignore network errors
      }
    }

    init()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="space-y-3">
      <SectionHeading index="02">// SITE_VIEWS</SectionHeading>
      <div className="grid min-w-0 grid-cols-3 gap-2">
        <div className="min-w-0 v2-card p-3">
          <Eye className="mb-1.5 h-3.5 w-3.5 text-muted-foreground" />
          <p className="truncate font-mono text-xl font-medium leading-none tabular-nums">
            {stats ? <NumberTicker value={stats.total} /> : <LoadingDots />}
          </p>
          <p className="mt-1.5 font-mono text-[10px] tracking-wider text-muted-foreground">
            总浏览量
          </p>
        </div>
        <div className="min-w-0 v2-card p-3">
          <TrendingUp className="mb-1.5 h-3.5 w-3.5 text-muted-foreground" />
          <p className="truncate font-mono text-xl font-medium leading-none tabular-nums">
            {stats ? <NumberTicker value={stats.week} /> : <LoadingDots />}
          </p>
          <p className="mt-1.5 font-mono text-[10px] tracking-wider text-muted-foreground">
            近 7 日
          </p>
        </div>
        <div className="min-w-0 v2-card p-3">
          <Sun className="mb-1.5 h-3.5 w-3.5 text-muted-foreground" />
          <p className="truncate font-mono text-xl font-medium leading-none tabular-nums">
            {stats ? <NumberTicker value={stats.today} /> : <LoadingDots />}
          </p>
          <p className="mt-1.5 font-mono text-[10px] tracking-wider text-muted-foreground">
            今日
          </p>
        </div>
      </div>
    </div>
  )
}
