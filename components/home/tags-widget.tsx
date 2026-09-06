"use client"

import Link from "next/link"
import { Hash } from "lucide-react"

import type { Post } from "@/lib/mdx"

interface TagsWidgetProps {
  posts: Post[]
}

export function TagsWidget({ posts }: TagsWidgetProps) {
  const counts = new Map<string, number>()
  for (const post of posts) {
    for (const tag of post.tags) {
      counts.set(tag, (counts.get(tag) || 0) + 1)
    }
  }
  const tags = Array.from(counts.entries()).sort((a, b) => b[1] - a[1])

  return (
    <div className="space-y-3">
      <h3 className="flex items-center gap-2 font-display text-sm tracking-wide text-muted-foreground">
        <Hash className="h-3.5 w-3.5 text-accent" />
        // TAGS
      </h3>
      <div className="flex flex-wrap gap-2">
        {tags.length === 0 ? (
          <p className="text-sm text-muted-foreground">暂无标签</p>
        ) : (
          tags.map(([tag, count]) => (
            <Link
              key={tag}
              href={`/blog?tag=${encodeURIComponent(tag)}`}
              className="group inline-flex items-center gap-1.5 rounded-lg border border-border bg-card/50 px-2.5 py-1 text-xs transition-colors hover:border-accent/50 hover:bg-accent/10"
            >
              <span className="text-muted-foreground group-hover:text-foreground">
                {tag}
              </span>
              <span className="rounded-full bg-accent/10 px-1.5 py-0.5 text-[10px] font-medium text-accent">
                {count}
              </span>
            </Link>
          ))
        )}
      </div>
    </div>
  )
}
