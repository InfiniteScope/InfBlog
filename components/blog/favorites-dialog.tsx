"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { BookMarked, Bookmark, RefreshCw, Trash2 } from "lucide-react"
import { toast } from "sonner"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { formatDateTime } from "@/lib/format-date"

interface FavoriteItem {
  slug: string
  title: string
  updatedAt: string
  favoritedAt: string
}

interface BookmarkItem {
  id: number
  type: "post" | "doc"
  slug: string
  title: string
  percent: number
  anchor: string | null
  label: string | null
  updatedAt: string
}

/** 书签链接：#bm-<锚点>（无锚点时退化为百分比） */
function bookmarkHref(item: BookmarkItem): string {
  const base = item.type === "doc" ? `/docs/${item.slug}` : `/blog/${item.slug}`
  const frag = item.anchor
    ? `#bm-${encodeURIComponent(item.anchor)}`
    : `#bm-${item.percent.toFixed(3)}`
  return base + frag
}

/**
 * 「书签 & 收藏」列表：右上角用户菜单入口的展开层。
 * 书签来自 /api/bookmarks，收藏来自 /api/favorites（均需登录）。
 */
export function FavoritesDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [favorites, setFavorites] = useState<FavoriteItem[] | null>(null)
  const [bookmarks, setBookmarks] = useState<BookmarkItem[] | null>(null)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setFavorites(null)
    setBookmarks(null)
    Promise.all([
      fetch("/api/favorites").then((res) => res.json()),
      fetch("/api/bookmarks").then((res) => res.json()),
    ])
      .then(([favData, bmData]) => {
        if (cancelled) return
        setFavorites(favData.favorites ?? [])
        setBookmarks(bmData.bookmarks ?? [])
      })
      .catch(() => {
        if (cancelled) return
        setFavorites([])
        setBookmarks([])
      })
    return () => {
      cancelled = true
    }
  }, [open])

  const removeBookmark = async (id: number) => {
    setBookmarks((prev) => (prev ? prev.filter((b) => b.id !== id) : prev))
    const res = await fetch("/api/bookmarks", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    })
    if (!res.ok) {
      toast.error("删除失败")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>书签 & 收藏</DialogTitle>
        </DialogHeader>

        <div className="max-h-[65vh] space-y-5 overflow-y-auto pr-1">
          {/* 书签 */}
          <section className="space-y-2">
            <p className="font-mono text-xs tracking-widest text-muted-foreground">
              // 书签（继续阅读）
            </p>
            {bookmarks === null ? (
              <p className="py-4 text-center text-sm text-muted-foreground">加载中...</p>
            ) : bookmarks.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                还没有书签。阅读文章时点右下角 <BookMarked className="inline h-3.5 w-3.5" /> 记录阅读位置。
              </p>
            ) : (
              <div className="space-y-2">
                {bookmarks.map((item) => (
                  <div
                    key={item.id}
                    className="group flex items-center gap-3 rounded-lg border border-border bg-card/50 p-3 transition-colors hover:border-accent/60 hover:bg-accent/5"
                  >
                    {/* 书签用原生 <a>：同页跳转需要原生 hashchange 事件
                        （Next Link 的 pushState 不触发），ReadingResume 依赖它 */}
                    <a
                      href={bookmarkHref(item)}
                      onClick={() => onOpenChange(false)}
                      className="flex min-w-0 flex-1 items-center gap-3"
                    >
                      <BookMarked className="h-4 w-4 shrink-0 text-accent" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{item.title}</p>
                        <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                          <span className="text-accent">
                            读到 {Math.round(item.percent * 100)}%
                          </span>
                          {item.label && (
                            <span className="truncate">· {item.label}</span>
                          )}
                        </p>
                      </div>
                    </a>
                    <button
                      type="button"
                      onClick={() => removeBookmark(item.id)}
                      aria-label="删除书签"
                      title="删除书签"
                      className="shrink-0 rounded p-1 text-muted-foreground/50 opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          <Separator />

          {/* 收藏 */}
          <section className="space-y-2">
            <p className="font-mono text-xs tracking-widest text-muted-foreground">
              // 收藏
            </p>
            {favorites === null ? (
              <p className="py-4 text-center text-sm text-muted-foreground">加载中...</p>
            ) : favorites.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                还没有收藏任何文章，去博客页点亮收藏吧。
              </p>
            ) : (
              <div className="space-y-2">
                {favorites.map((item) => (
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
                        更新于 {formatDateTime(item.updatedAt)}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="flex justify-end pt-1">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            关闭
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
