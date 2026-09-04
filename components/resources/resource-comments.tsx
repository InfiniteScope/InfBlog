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
          disabled={isPending || !content.trim()}
        >
          {isPending ? (
            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
          ) : (
            <Send className="mr-1.5 h-4 w-4" />
          )}
          发送
        </Button>
      </form>

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
                      {new Date(c.createdAt).toLocaleString("zh-CN")}
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
