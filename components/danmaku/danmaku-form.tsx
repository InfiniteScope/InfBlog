"use client"

import { useActionState } from "react"
import { Send } from "lucide-react"

import { submitDanmaku } from "@/app/danmaku/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function DanmakuForm() {
  const [state, formAction, isPending] = useActionState(submitDanmaku, null)

  return (
    <form action={formAction} className="flex gap-2">
      <Input
        name="content"
        placeholder="发送弹幕..."
        className="h-8 text-xs"
        disabled={isPending}
        aria-invalid={state?.success === false}
      />
      <Button type="submit" size="icon" className="h-8 w-8 shrink-0" disabled={isPending}>
        <Send className="h-3.5 w-3.5" />
      </Button>
    </form>
  )
}
