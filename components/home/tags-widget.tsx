"use client"

import Link from "next/link"

import { SectionHeading } from "@/components/ui/section-heading"
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
      <SectionHeading index="04">// TAGS</SectionHeading>
      <div className="flex flex-wrap gap-2">
        {tags.length === 0 ? (
          <p className="text-sm text-muted-foreground">暂无标签</p>
        ) : (
          tags.map(([tag, count]) => (
            <Link
              key={tag}
              href={`/blog?tag=${encodeURIComponent(tag)}`}
              className="v2-tag"
            >
              <span>{tag}</span>
              <span className="v2-tag-count">{count}</span>
            </Link>
          ))
        )}
      </div>
    </div>
  )
}
