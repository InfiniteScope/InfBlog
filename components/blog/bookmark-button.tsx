"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { toast } from "sonner"
import { BookMarked } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { BookmarkType } from "@/lib/bookmarks"

interface BookmarkButtonProps {
  type: BookmarkType
  slug: string
  title: string
}

interface BookmarkState {
  percent: number
  anchor: string | null
  label: string | null
}

/**
 * 阅读书签按钮：记录当前阅读位置（滚动百分比 + 最近章节锚点）。
 * - 未登录 → 底部提示去登录
 * - 已登录 → 保存/更新书签，屏幕下方弹出提示引导到右上角「书签&收藏」
 */
export function BookmarkButton({ type, slug, title }: BookmarkButtonProps) {
  const { status } = useSession()
  const router = useRouter()
  const [bookmark, setBookmark] = useState<BookmarkState | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (status !== "authenticated") return
    let cancelled = false
    fetch(`/api/bookmarks?type=${type}&slug=${encodeURIComponent(slug)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data?.bookmark) setBookmark(data.bookmark)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [type, slug, status])

  function capturePosition(): { percent: number; anchor: string | null; label: string | null } {
    const doc = document.documentElement
    const max = doc.scrollHeight - window.innerHeight
    const percent = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0

    let anchor: string | null = null
    let label: string | null = null
    const heads = document.querySelectorAll(
      "article h1[id], article h2[id], article h3[id], article h4[id], article h5[id], article h6[id]"
    )
    for (const h of heads) {
      if (h.getBoundingClientRect().top + window.scrollY <= window.scrollY + 120) {
        anchor = h.id
        label = h.textContent?.trim() ?? null
      } else {
        break
      }
    }
    return { percent, anchor, label }
  }

  async function save() {
    if (busy) return
    if (status !== "authenticated") {
      toast.error("请先登录后使用书签", {
        toasterId: "bottom-toaster",
        action: { label: "去登录", onClick: () => router.push("/login") },
      })
      return
    }
    setBusy(true)
    try {
      const { percent, anchor, label } = capturePosition()
      const res = await fetch("/api/bookmarks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, slug, title, percent, anchor, label }),
      })
      if (res.ok) {
        setBookmark({ percent, anchor, label })
        toast.success(
          `${bookmark ? "书签位置已更新" : "书签已保存"}（读到 ${Math.round(percent * 100)}%）`,
          {
            toasterId: "bottom-toaster",
            description: "在右上角「书签&收藏」中可继续阅读",
            action: {
              label: "查看书签",
              onClick: () =>
                window.dispatchEvent(new Event("infblog:open-library")),
            },
          }
        )
      } else if (res.status === 401) {
        toast.error("登录已过期，请重新登录", { toasterId: "bottom-toaster" })
      } else {
        toast.error("保存失败，请稍后再试", { toasterId: "bottom-toaster" })
      }
    } catch {
      toast.error("保存失败，请稍后再试", { toasterId: "bottom-toaster" })
    } finally {
      setBusy(false)
    }
  }

  const bookmarked = bookmark !== null
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={save}
      disabled={busy}
      aria-label={bookmarked ? "更新书签位置" : "记录阅读位置"}
      title={
        bookmarked
          ? `已保存至 ${Math.round(bookmark.percent * 100)}%，点击更新`
          : "记录阅读位置"
      }
      className={cn(
        "h-11 gap-1.5 rounded-full border-border/60 bg-background/80 px-3 shadow-lg backdrop-blur-md transition-colors hover:border-accent/60 hover:bg-accent/10",
        bookmarked && "border-accent/70 text-accent"
      )}
    >
      <BookMarked
        className={cn("h-5 w-5", bookmarked && "fill-accent/20")}
      />
      {bookmarked && (
        <span className="min-w-4 text-xs font-medium tabular-nums">
          {Math.round(bookmark.percent * 100)}%
        </span>
      )}
    </Button>
  )
}
