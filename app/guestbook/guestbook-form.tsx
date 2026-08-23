"use client"

import { useActionState, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Ghost, Send, User } from "lucide-react"

import { submitGuestbookMessage } from "@/app/guestbook/actions"
import { useSidebarCollapse } from "@/components/layout/sidebar-collapse-provider"
import {
  getLoginRedirectUrl,
  restoreLoginDraft,
  saveLoginDraft,
} from "@/lib/login-redirect"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

const DRAFT_KEY = "guestbook-draft"

export function GuestbookForm() {
  const { data: session } = useSession()
  const { collapsed } = useSidebarCollapse()
  const router = useRouter()
  const [state, formAction, isPending] = useActionState(
    submitGuestbookMessage,
    null
  )

  const [content, setContent] = useState("")
  const [open, setOpen] = useState(false)

  // Restore draft after coming back from login.
  useEffect(() => {
    const draft = restoreLoginDraft<string>(DRAFT_KEY)
    if (draft) setContent(draft)
  }, [])

  useEffect(() => {
    if (state?.success) {
      setContent("")
      setOpen(false)
    }
  }, [state])

  const submit = (mode: "nickname" | "anonymous") => {
    if (!content.trim()) return

    const formData = new FormData()
    formData.set("content", content)
    formData.set("mode", mode)

    formAction(formData)
  }

  const goToLogin = () => {
    saveLoginDraft(DRAFT_KEY, content)
    router.push(getLoginRedirectUrl("/guestbook"))
  }

  return (
    <>
      {/* Fixed bottom input bar */}
      <div
        className={cn(
          "fixed bottom-0 right-0 z-40 border-t border-border bg-background/95 px-4 py-3 backdrop-blur-xl md:px-6",
          collapsed ? "lg:left-[80px]" : "lg:left-[280px]"
        )}
      >
        <form
          className="mx-auto flex max-w-3xl items-end gap-3"
          onSubmit={(e) => {
            e.preventDefault()
            if (!content.trim()) return
            setOpen(true)
          }}
        >
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="写下你的想法，支持 Markdown 语法..."
            className="min-h-[3rem] resize-none rounded-2xl bg-muted/50 px-4 py-2.5"
            rows={1}
            maxLength={500}
          />
          <Button
            type="submit"
            size="icon"
            className="h-10 w-10 shrink-0 rounded-full"
            disabled={!content.trim()}
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>

      {/* Mode selection dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>选择留言方式</DialogTitle>
            <DialogDescription>
              预览内容：
              <span className="mt-1 block max-h-32 overflow-auto rounded-md border border-border bg-muted/50 p-2 text-sm text-foreground">
                {content}
              </span>
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 pt-2">
            <Button
              variant="outline"
              className="justify-start gap-2"
              onClick={() => submit("nickname")}
              disabled={isPending}
            >
              <User className="h-4 w-4" />
              {session?.user
                ? `使用昵称：${session.user.nickname || session.user.name}`
                : "使用昵称留言"}
            </Button>

            {!session?.user && (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                你尚未登录，使用昵称留言需要先登录。
                <Button
                  variant="link"
                  size="sm"
                  className="h-auto p-0 text-destructive"
                  onClick={goToLogin}
                >
                  去登录
                </Button>
              </div>
            )}

            <Button
              variant="outline"
              className="justify-start gap-2"
              onClick={() => submit("anonymous")}
              disabled={isPending}
            >
              <Ghost className="h-4 w-4" />
              匿名留言
            </Button>
          </div>

          {state?.success === false && state.message && (
            <p className="text-sm text-destructive">{state.message}</p>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
