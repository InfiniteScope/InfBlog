"use client"

import { useState, useTransition } from "react"
import { Calendar, Trash2, User } from "lucide-react"
import ReactMarkdown from "react-markdown"

import {
  deleteGuestbookMessage,
  type GuestbookMessage,
} from "@/app/guestbook/actions"

const palettes = [
  "bg-amber-100 text-amber-950 dark:bg-amber-900/60 dark:text-amber-50",
  "bg-emerald-100 text-emerald-950 dark:bg-emerald-900/60 dark:text-emerald-50",
  "bg-sky-100 text-sky-950 dark:bg-sky-900/60 dark:text-sky-50",
  "bg-rose-100 text-rose-950 dark:bg-rose-900/60 dark:text-rose-50",
  "bg-violet-100 text-violet-950 dark:bg-violet-900/60 dark:text-violet-50",
  "bg-orange-100 text-orange-950 dark:bg-orange-900/60 dark:text-orange-50",
]

interface CurrentUser {
  id: string
  role: "OWNER" | "ADMIN" | "VISITOR"
}

interface MessageCardProps {
  message: GuestbookMessage
  rotation?: number
  currentUser?: CurrentUser
}

export function MessageCard({
  message,
  rotation = 0,
  currentUser,
}: MessageCardProps) {
  const palette = palettes[message.id % palettes.length]
  const [isPending, startTransition] = useTransition()
  const [removed, setRemoved] = useState(false)

  const canDelete =
    currentUser &&
    (currentUser.role === "OWNER" || message.userId === currentUser.id)

  const handleDelete = () => {
    if (!confirm("确定要删除这条留言吗？")) return
    startTransition(async () => {
      const result = await deleteGuestbookMessage(message.id)
      if (result.success) {
        setRemoved(true)
      } else {
        alert(result.message)
      }
    })
  }

  if (removed) return null

  return (
    <article
      className={`relative break-inside-avoid rounded-lg p-5 shadow-sm transition-transform hover:-translate-y-1 hover:shadow-md ${palette}`}
      style={{ transform: `rotate(${rotation}deg)` }}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-xs font-semibold opacity-90">
          <User className="h-3 w-3" />
          {message.isAnonymous ? "匿名用户" : message.author}
        </span>
        <span className="flex shrink-0 items-center gap-1 text-[10px] opacity-70">
          <Calendar className="h-3 w-3" />
          {message.createdAt.toLocaleDateString("zh-CN")}
        </span>
      </div>
      <div className="max-w-none text-sm leading-relaxed [&_p]:mb-2 [&_p:last-child]:mb-0 [&_strong]:font-bold [&_em]:italic [&_code]:rounded [&_code]:bg-black/10 [&_code]:px-1 [&_code]:py-0.5 dark:[&_code]:bg-white/10 [&_a]:underline [&_a]:underline-offset-2 [&_ul]:ml-4 [&_ul]:list-disc [&_ol]:ml-4 [&_ol]:list-decimal [&_blockquote]:border-l-2 [&_blockquote]:border-current [&_blockquote]:pl-2 [&_blockquote]:opacity-80">
        <ReactMarkdown>{message.content}</ReactMarkdown>
      </div>

      {canDelete && (
        <button
          onClick={handleDelete}
          disabled={isPending}
          className="absolute right-2 top-2 rounded-md p-1 opacity-40 transition-opacity hover:bg-black/10 hover:opacity-100 disabled:opacity-20 dark:hover:bg-white/10"
          aria-label="删除留言"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      )}
    </article>
  )
}
