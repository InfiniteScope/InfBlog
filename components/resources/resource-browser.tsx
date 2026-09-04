"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useState } from "react"
import { Search, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

interface ResourceBrowserProps {
  allTags: string[]
}

/** 资源列表：关键词搜索 + 标签分类筛选（URL 驱动，可分享/刷新） */
export function ResourceBrowser({ allTags }: ResourceBrowserProps) {
  const router = useRouter()
  const params = useSearchParams()
  const q = params.get("q") ?? ""
  const tag = params.get("tag") ?? ""
  const [kw, setKw] = useState(q)

  const apply = (nextTag?: string, nextQ?: string) => {
    const sp = new URLSearchParams()
    const t = nextTag ?? tag
    const keyword = (nextQ ?? kw).trim()
    if (t) sp.set("tag", t)
    if (keyword) sp.set("q", keyword)
    const query = sp.toString()
    router.push(query ? `/resources?${query}` : "/resources")
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={kw}
          onChange={(e) => setKw(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && apply()}
          placeholder="搜索资源名称、简介、官方网站..."
          className="pl-9 pr-9"
        />
        {kw && (
          <button
            type="button"
            onClick={() => {
              setKw("")
              apply(undefined, "")
            }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground transition-colors hover:text-foreground"
            aria-label="清空搜索"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => apply(undefined)}
          className={cn(
            "rounded-full border px-3 py-1 text-xs transition-colors",
            !tag
              ? "border-accent bg-accent/15 text-accent"
              : "border-border text-muted-foreground hover:border-accent/50"
          )}
        >
          全部
        </button>
        {allTags.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => apply(t === tag ? undefined : t)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs transition-colors",
              tag === t
                ? "border-accent bg-accent/15 text-accent"
                : "border-border text-muted-foreground hover:border-accent/50"
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {(q || tag) && (
        <Button
          variant="ghost"
          size="sm"
          className="text-xs text-muted-foreground"
          onClick={() => {
            setKw("")
            router.push("/resources")
          }}
        >
          <X className="mr-1 h-3.5 w-3.5" />
          清除筛选
        </Button>
      )}
    </div>
  )
}
