"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface BlogTagFilterProps {
  tags: [tag: string, count: number][]
}

/** 博客列表标签筛选：胶囊按钮组（URL 驱动，保留排序参数） */
export function BlogTagFilter({ tags }: BlogTagFilterProps) {
  const router = useRouter()
  const params = useSearchParams()
  const active = params.get("tag") ?? ""

  const apply = (next?: string) => {
    const sp = new URLSearchParams(params.toString())
    if (next) sp.set("tag", next)
    else sp.delete("tag")
    const query = sp.toString()
    router.push(query ? `/blog?${query}` : "/blog", { scroll: false })
  }

  if (tags.length === 0) return null

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => apply(undefined)}
        className={cn(
          "rounded-full border px-3 py-1 text-xs transition-colors",
          !active
            ? "border-accent bg-accent/15 text-accent"
            : "border-border text-muted-foreground hover:border-accent/50"
        )}
      >
        全部
      </button>
      {tags.map(([tag, count]) => (
        <button
          key={tag}
          type="button"
          onClick={() => apply(tag === active ? undefined : tag)}
          className={cn(
            "rounded-full border px-3 py-1 text-xs transition-colors",
            active === tag
              ? "border-accent bg-accent/15 text-accent"
              : "border-border text-muted-foreground hover:border-accent/50"
          )}
        >
          {tag}
          <span className="ml-1 text-[10px] text-muted-foreground/70">
            {count}
          </span>
        </button>
      ))}
      {active && (
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs text-muted-foreground"
          onClick={() => apply(undefined)}
        >
          <X className="mr-1 h-3.5 w-3.5" />
          清除筛选
        </Button>
      )}
    </div>
  )
}
