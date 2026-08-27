"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Bookmark, RefreshCw } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

interface FavoriteItem {
  slug: string
  title: string
  updatedAt: string
  favoritedAt: string
}

/**
 * 「我的收藏」列表：右上角用户菜单入口的展开层。
 * 数据来自 /api/favorites（登录用户）。
 */
export function FavoritesDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [items, setItems] = useState<FavoriteItem[] | null>(null)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setItems(null)
    fetch("/api/favorites")
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setItems(data.favorites ?? [])
      })
      .catch(() => {
        if (!cancelled) setItems([])
      })
    return () => {
      cancelled = true
    }
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>我的收藏</DialogTitle>
        </DialogHeader>

        {items === null ? (
          <p className="py-8 text-center text-sm text-muted-foreground">加载中...</p>
        ) : items.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            还没有收藏任何文章，去博客页点亮书签吧。
          </p>
        ) : (
          <div className="max-h-[60vh] space-y-2 overflow-y-auto pr-1">
            {items.map((item) => (
              <Link
                key={item.slug}
                href={`/blog/${item.slug}`}
                onClick={() => onOpenChange(false)}
                className="flex items-center gap-3 rounded-lg border border-border bg-card/50 p-3 transition-colors hover:border-accent/60 hover:bg-accent/5"
              >
                <Bookmark className="h-4 w-4 shrink-0 text-accent" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{item.title}</p>
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                    <RefreshCw className="h-3 w-3" />
                    更新于 {new Date(item.updatedAt).toLocaleDateString("zh-CN")}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}

        <div className="flex justify-end pt-1">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            关闭
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
