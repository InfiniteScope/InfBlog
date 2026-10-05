"use client"

import { useActionState, useEffect, useState } from "react"
import { Send } from "lucide-react"

import { submitDanmaku, type DanmakuFormState } from "@/app/danmaku/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

/**
 * 冷却倒计时：用 action 返回的 retryAfterMs + 本地 limitedAt 基准计时，
 * 不依赖服务端时钟；倒计时归零后回到 idle，行内提示一并消失
 * （否则会留下"请 N 秒后再试"这类已经过期的文案）。
 */
function useCooldown(state: DanmakuFormState) {
  const [cooldown, setCooldown] = useState<{
    expiresAt: number
    error: string
  } | null>(null)
  const [remainingMs, setRemainingMs] = useState(0)
  const retryAfterMs =
    state && state.success === false ? state.retryAfterMs ?? 0 : 0
  const limitedAt = state && state.success === false ? state.limitedAt : undefined

  useEffect(() => {
    if (retryAfterMs <= 0) return
    const expiresAt = (limitedAt ?? Date.now()) + retryAfterMs
    const error = state && state.success === false ? state.error : ""
    setCooldown({ expiresAt, error })
    setRemainingMs(Math.max(0, expiresAt - Date.now()))
    // 250ms 步进：归零当帧即恢复可发送
    const timer = setInterval(() => {
      const left = expiresAt - Date.now()
      if (left <= 0) {
        clearInterval(timer)
        setRemainingMs(0)
        setCooldown(null)
      } else {
        setRemainingMs(left)
      }
    }, 250)
    return () => clearInterval(timer)
    // state 不入依赖：每次 action 返回都会换引用，只按限速标量重跑
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [retryAfterMs, limitedAt])

  /* 是限速类错误：文案只由冷却倒计时负责，倒计时结束即整体消失，
     不能再回落到 state.error（否则会留下过期的"请 N 秒后再试"） */
  const retryPending = retryAfterMs > 0
  const active = cooldown !== null
  const errorText = retryPending
    ? active
      ? cooldown.error
      : null
    : state && state.success === false
      ? state.error
      : null

  return { active, remainingMs, errorText }
}

export function DanmakuForm() {
  const [state, formAction, isPending] = useActionState(submitDanmaku, null)
  const { active: cooling, remainingMs, errorText } = useCooldown(state)
  const coolingSeconds = Math.ceil(remainingMs / 1000)

  return (
    <div className="space-y-1.5">
      <form action={formAction} className="flex gap-2">
        <Input
          name="content"
          placeholder={cooling ? `冷却中，${coolingSeconds} 秒后可发送` : "发送弹幕..."}
          className="h-8 text-xs"
          disabled={isPending || cooling}
          maxLength={50}
          aria-invalid={state?.success === false}
        />
        <Button
          type="submit"
          size="icon"
          className="h-8 w-8 shrink-0"
          disabled={isPending || cooling}
          aria-label={cooling ? "发送过于频繁" : "发送弹幕"}
          title={cooling ? `发送过快，请 ${coolingSeconds} 秒后再试` : "发送弹幕"}
        >
          <Send className="h-3.5 w-3.5" />
        </Button>
      </form>

      {/* 行内提示：限速时展示剩余秒数并持续倒计时；其他错误复用同一行 */}
      {errorText && (
        <p
          role="status"
          aria-live="polite"
          className="font-mono text-[10px] leading-tight text-destructive"
        >
          {cooling ? `发送过快，请 ${coolingSeconds} 秒后再试` : errorText}
        </p>
      )}
    </div>
  )
}
