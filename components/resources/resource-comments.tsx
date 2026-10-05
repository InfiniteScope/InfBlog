"use client"

import { useActionState, useEffect, useState } from "react"
import { Loader2, MessageCircle, Send } from "lucide-react"
import { toast } from "sonner"
import { useSession } from "next-auth/react"

import {
  submitResourceComment,
  type ResourceCommentActionState,
} from "@/app/resources/actions"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { formatDateTimeStrict } from "@/lib/format-date"

/** 评论冷却倒计时：由 action 返回的 retryAfterMs 本地计时，归零即恢复 */
function useCooldown(state: ResourceCommentActionState) {
  const [remainingMs, setRemainingMs] = useState(0)
  const retryAfterMs =
    state && state.success === false ? state.retryAfterMs ?? 0 : 0

  useEffect(() => {
    if (retryAfterMs <= 0) {
      setRemainingMs((prev) => (prev === 0 ? prev : 0))
      return
    }
    const expiresAt = Date.now() + retryAfterMs
    setRemainingMs(retryAfterMs)
    const timer = setInterval(() => {
      const left = expiresAt - Date.now()
      if (left <= 0) {
        clearInterval(timer)
        setRemainingMs(0)
      } else {
        setRemainingMs(left)
      }
    }, 250)
    return () => clearInterval(timer)
  }, [retryAfterMs])

  return remainingMs
}

export interface ResourceCommentView {
  id: string
  content: string
  createdAt: string
  user: {
    nickname?: string | null
    name?: string | null
    image?: string | null
  }
}

interface ResourceCommentsProps {
  resourceId: string
  initialComments: ResourceCommentView[]
}

/** 资源评论区：强制登录后发表，未登录点发送仅提示 */
export function ResourceComments({
  resourceId,
  initialComments,
}: ResourceCommentsProps) {
  const { status } = useSession()
  const [comments, setComments] = useState(initialComments)
  const [content, setContent] = useState("")
  const [state, formAction, isPending] = useActionState<
    ResourceCommentActionState,
    FormData
  >(submitResourceComment.bind(null, resourceId), null)
  const coolingMs = useCooldown(state)
  const cooling = coolingMs > 0
  const coolingSeconds = Math.ceil(coolingMs / 1000)

  useEffect(() => {
    if (state?.success) {
      const userName = state.message
      setContent("")
      toast.success(userName)
      window.location.reload()
    } else if (state?.success === false) {
      toast.error(state.message)
    }
  }, [state])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (status !== "authenticated") {
      toast.error("评论需要登录后使用，请先登录")
      return
    }
    if (!content.trim()) return
    const formData = new FormData()
    formData.set("content", content)
    formAction(formData)
  }

  return (
    <section className="mt-6 border-t border-border pt-6">
      <p className="mb-3 flex items-center gap-1.5 text-xs text-muted-foreground">
        <MessageCircle className="h-3.5 w-3.5" />
        评论（{comments.length}）
      </p>

      <form onSubmit={handleSubmit} className="flex items-start gap-3">
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value.slice(0, 500))}
          placeholder={
            status === "authenticated"
              ? "说说你的看法..."
              : "登录后即可发表评论"
          }
          className="min-h-[72px] flex-1 resize-none text-sm"
          maxLength={500}
        />
        <Button
          type="submit"
          className="h-9 shrink-0"
          disabled={isPending || cooling || !content.trim()}
          title={cooling ? `评论过于频繁，请 ${coolingSeconds} 秒后再试` : undefined}
        >
          {isPending ? (
            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
          ) : (
            <Send className="mr-1.5 h-4 w-4" />
          )}
          {cooling ? `${coolingSeconds}s` : "发送"}
        </Button>
      </form>

      {cooling && (
        <p
          role="status"
          aria-live="polite"
          className="mt-1.5 font-mono text-[10px] text-destructive"
        >
          评论过于频繁，请 {coolingSeconds} 秒后再试
        </p>
      )}

      <div className="mt-4 space-y-4">
        {comments.length === 0 ? (
          <p className="py-4 text-center text-xs text-muted-foreground">
            还没有评论，来抢沙发吧
          </p>
        ) : (
          comments.map((c) => {
            const label = c.user.nickname || c.user.name || "匿名用户"
            return (
              <div key={c.id} className="flex items-start gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={c.user.image || undefined} />
                  <AvatarFallback className="text-sm">
                    {label.slice(0, 1)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-sm font-medium">{label}</p>
                    <p className="shrink-0 text-[10px] text-muted-foreground">
                      {formatDateTimeStrict(c.createdAt)}
                    </p>
                  </div>
                  <p className="mt-0.5 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                    {c.content}
                  </p>
                </div>
              </div>
            )
          })
        )}
      </div>
    </section>
  )
}
