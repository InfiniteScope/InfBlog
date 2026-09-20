"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowUpDown, Check } from "lucide-react"

import {
  DEFAULT_ORDER,
  DEFAULT_SORT,
  type SortMetric,
  type SortOrder,
} from "@/lib/post-sort"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const METRIC_OPTIONS: { value: SortMetric; label: string }[] = [
  { value: "updatedAt", label: "更新时间" },
  { value: "publishedAt", label: "发布时间" },
  { value: "totalViews", label: "总浏览量" },
  { value: "monthViews", label: "近期浏览量" },
  { value: "likes", label: "点赞量" },
  { value: "favorites", label: "收藏量" },
  { value: "words", label: "字数" },
]

const ORDER_OPTIONS: { value: SortOrder; label: string }[] = [
  { value: "normal", label: "正序" },
  { value: "reverse", label: "逆序" },
]

interface PostSortControlProps {
  metric: SortMetric
  order: SortOrder
}

/** 博客列表排序：标题右侧按钮 → 双列弹层（指标 / 排序方式），URL 驱动 */
export function PostSortControl({ metric, order }: PostSortControlProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("pointerdown", onPointerDown)
    document.addEventListener("keydown", onKeyDown)
    return () => {
      document.removeEventListener("pointerdown", onPointerDown)
      document.removeEventListener("keydown", onKeyDown)
    }
  }, [open])

  const apply = (nextMetric: SortMetric, nextOrder: SortOrder) => {
    const params = new URLSearchParams()
    if (nextMetric !== DEFAULT_SORT) params.set("sort", nextMetric)
    if (nextOrder !== DEFAULT_ORDER) params.set("order", nextOrder)
    const query = params.toString()
    router.push(query ? `/blog?${query}` : "/blog", { scroll: false })
  }

  const optionClass = (selected: boolean) =>
    cn(
      "flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors",
      selected
        ? "text-accent"
        : "text-muted-foreground hover:bg-muted hover:text-foreground"
    )

  return (
    <div ref={rootRef} className="relative">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-1.5"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((v) => !v)}
      >
        <ArrowUpDown className="h-3.5 w-3.5" />
        排序
      </Button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-64 rounded-lg border border-border bg-popover p-3 text-popover-foreground shadow-lg">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <p className="px-2 pb-1 font-mono text-[10px] tracking-widest text-muted-foreground/70">
                排列指标
              </p>
              {METRIC_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => apply(option.value, order)}
                  className={optionClass(metric === option.value)}
                >
                  {option.label}
                  {metric === option.value && (
                    <Check className="h-3.5 w-3.5 shrink-0" />
                  )}
                </button>
              ))}
            </div>

            <div className="space-y-1 border-l border-border/60 pl-3">
              <p className="px-2 pb-1 font-mono text-[10px] tracking-widest text-muted-foreground/70">
                排序方式
              </p>
              {ORDER_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => apply(metric, option.value)}
                  className={optionClass(order === option.value)}
                >
                  {option.label}
                  {order === option.value && (
                    <Check className="h-3.5 w-3.5 shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
