"use client"

import { FileText, Image, Type, Clock } from "lucide-react"

import type { Post } from "@/lib/mdx"

interface StatsWidgetProps {
  posts: Post[]
  /** 站点最后更新时间（已格式化）：动态 / 博客 / 文库三者取最新 */
  lastUpdate: string
}

export function StatsWidget({ posts, lastUpdate }: StatsWidgetProps) {
  const totalWords = posts.reduce((sum, p) => sum + (p.wordCount || 0), 0)
  const totalImages = posts.reduce((sum, p) => sum + (p.imageCount || 0), 0)

  const items = [
    { icon: FileText, label: "文章数", value: posts.length },
    { icon: Type, label: "总字数", value: totalWords.toLocaleString("zh-CN") },
    { icon: Image, label: "图片数", value: totalImages },
    { icon: Clock, label: "最后更新", value: lastUpdate },
  ]

  return (
    <div className="space-y-3">
      <h3 className="flex items-center gap-2 font-display text-sm tracking-wide text-muted-foreground">
        <Clock className="h-3.5 w-3.5 text-accent" />
        // STATS
      </h3>
      <div className="grid grid-cols-2 gap-2">
        {items.map((item) => (
          <div
            key={item.label}
            className="rounded-xl border border-border bg-card/50 p-3 transition-colors hover:border-accent/40"
          >
            <item.icon className="mb-1.5 h-3.5 w-3.5 text-accent" />
            <p className="font-mono text-lg font-medium leading-none">
              {item.value}
            </p>
            <p className="mt-1 text-[10px] text-muted-foreground">
              {item.label}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
