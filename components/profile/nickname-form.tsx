"use client"

import { useActionState, useEffect, useRef, useState } from "react"
import { useSession } from "next-auth/react"

import { updateNickname } from "@/app/auth-actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

interface NicknameFormProps {
  userId: string
  currentNickname: string
}

export function NicknameForm({ userId, currentNickname }: NicknameFormProps) {
  const { data: session, update } = useSession()
  const [state, formAction, isPending] = useActionState(
    updateNickname.bind(null, userId),
    null
  )
  const syncedRef = useRef(false)

  // Reflect the session's latest nickname immediately after a successful
  // save (source of truth: the refreshed session).
  const displayName =
    session?.user?.nickname ?? session?.user?.name ?? currentNickname
  const [nickname, setNickname] = useState(displayName)

  useEffect(() => {
    setNickname(displayName)
  }, [displayName])

  useEffect(() => {
    // Guard: `update` identity changes on every session refetch (next-auth v5
    // beta), so without a ref this effect would loop forever calling
    // GET /api/auth/csrf + POST /api/auth/session.
    if (state?.success && !syncedRef.current) {
      syncedRef.current = true
      // The server action already refreshed the JWT cookie via
      // `unstable_update`. Calling `update()` re-reads it into the client's
      // SessionProvider so UI (navbar etc.) reflects the change instantly.
      update()
    }
  }, [state, update])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display text-xl tracking-tight">
          修改昵称
        </CardTitle>
        <CardDescription>昵称会显示在部分页面中</CardDescription>
      </CardHeader>
      <CardContent>
        <form id="nickname-form" action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nickname">昵称</Label>
            <Input
              id="nickname"
              name="nickname"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="输入新昵称"
            />
            {state?.success === false && state.errors?.nickname && (
              <p className="text-xs text-destructive">
                {state.errors.nickname[0]}
              </p>
            )}
          </div>
          <div className="flex items-center justify-between">
            <Button type="submit" disabled={isPending}>
              {isPending ? "保存中..." : "保存昵称"}
            </Button>
            {state?.success === true && (
              <p className="text-sm text-accent">{state.message}</p>
            )}
            {state?.success === false && state.message && (
              <p className="text-sm text-destructive">{state.message}</p>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
