"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { toast } from "sonner"
import { BookMarked, LocateFixed, RotateCcw, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  captureBookmarkPosition,
  saveBookmark,
  scrollToBookmarkPercent,
} from "@/lib/bookmark-scroll"
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
 * 阅读书签按钮（右下角浮标）。
 * - **未记录过书签** → 点击直接在当前位置创建书签（原行为）
 * - **已有书签** → 点击弹出一个贴着按钮的小选项框：
 *   「更新书签」（记录到当前位置）/「跳转到书签所在位置」/「取消」
 * - 未登录 → 底部提示去登录
 */
export function BookmarkButton({ type, slug, title }: BookmarkButtonProps) {
  const { status } = useSession()
  const router = useRouter()
  const [bookmark, setBookmark] = useState<BookmarkState | null>(null)
  const [busy, setBusy] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  // 拉取当前书签（未登录时不请求）
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

  async function persist(): Promise<boolean> {
    if (busy) return false
    // 会话加载中：静默忽略，避免刚加载时误报「请先登录」
    if (status === "loading") return false
    if (status !== "authenticated") {
      toast.error("请先登录后使用书签", {
        toasterId: "bottom-toaster",
        action: { label: "去登录", onClick: () => router.push("/login") },
      })
      return false
    }

    setBusy(true)
    try {
      const position = captureBookmarkPosition()
      const result = await saveBookmark({ type, slug, title, ...position })
      if (result.ok) {
        setBookmark(result.position)
        return true
      }
      if (result.status === 401) {
        toast.error("登录已过期，请重新登录", { toasterId: "bottom-toaster" })
      } else {
        console.error("[bookmark] save failed:", result.status)
        toast.error(`保存失败（HTTP ${result.status}），请稍后再试`, {
          toasterId: "bottom-toaster",
        })
      }
      return false
    } finally {
      setBusy(false)
    }
  }

  /** 已存书签：把位置更新到当前滚动处 */
  async function handleUpdate() {
    const had = bookmark
    const ok = await persist()
    if (!ok) return
    const percent = captureBookmarkPosition().percent
    toast.success(`${had ? "书签位置已更新" : "书签已保存"}（读到 ${Math.round(percent * 100)}%）`, {
      toasterId: "bottom-toaster",
      description: "在右上角「书签&收藏」中可继续阅读",
      action: {
        label: "查看书签",
        onClick: () => window.dispatchEvent(new Event("infblog:open-library")),
      },
    })
  }

  /** 已存书签：跳回书签位置 */
  function handleJump() {
    if (!bookmark) return
    scrollToBookmarkPercent(bookmark.percent)
    toast.success(`已回到读到 ${Math.round(bookmark.percent * 100)}% 的位置`, {
      toasterId: "bottom-toaster",
    })
  }

  const bookmarked = bookmark !== null

  const triggerButton = (
    <Button
      variant="outline"
      size="sm"
      disabled={busy}
      onClick={bookmarked ? undefined : () => void handleUpdate()}
      aria-label={bookmarked ? "书签操作" : "记录阅读位置"}
      title={
        bookmarked
          ? `已保存至 ${Math.round((bookmark?.percent ?? 0) * 100)}%`
          : "记录阅读位置"
      }
      className={cn(
        "h-11 gap-1.5 rounded-full border-border/60 bg-background/80 px-3 shadow-lg backdrop-blur-md transition-colors hover:border-accent/60 hover:bg-accent/10",
        bookmarked && "border-accent/70 text-accent"
      )}
    >
      <BookMarked className={cn("h-5 w-5", bookmarked && "fill-accent/20")} />
      {bookmarked && (
        <span className="min-w-4 text-xs font-medium tabular-nums">
          {Math.round((bookmark?.percent ?? 0) * 100)}%
        </span>
      )}
    </Button>
  )

  // 没有书签 → 点击直接创建（保持原逻辑）
  if (!bookmarked) return triggerButton

  // 已有书签 → 点击弹出小选项框，贴着按钮向上展开
  return (
    <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
      <DropdownMenuTrigger asChild>{triggerButton}</DropdownMenuTrigger>
      <DropdownMenuContent
        side="top"
        align="end"
        sideOffset={8}
        className="w-52 rounded-xl border-border/70 bg-popover/95 p-1.5 shadow-xl backdrop-blur-md"
      >
        <DropdownMenuLabel className="flex items-center justify-between px-2 py-1.5 font-mono text-[10px] tracking-widest text-muted-foreground">
          <span>书签</span>
          <span className="text-accent">
            读到 {Math.round(bookmark.percent * 100)}%
          </span>
        </DropdownMenuLabel>
        {bookmark.label && (
          <p className="px-2 pb-1.5 text-[11px] leading-snug text-muted-foreground/80">
            {bookmark.label}
          </p>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => {
            void handleUpdate()
          }}
          disabled={busy}
          className="gap-2 rounded-lg text-[13px]"
        >
          <RotateCcw className="h-3.5 w-3.5 shrink-0" />
          更新书签
          <span className="ml-auto font-mono text-[10px] text-muted-foreground">
            记录到当前位置
          </span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={handleJump}
          className="gap-2 rounded-lg text-[13px]"
        >
          <LocateFixed className="h-3.5 w-3.5 shrink-0" />
          跳转到书签所在位置
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => setMenuOpen(false)}
          className="gap-2 rounded-lg text-[13px] text-muted-foreground"
        >
          <X className="h-3.5 w-3.5 shrink-0" />
          取消
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
