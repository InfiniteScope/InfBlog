"use client"

import { useActionState } from "react"

import { changePassword } from "@/app/auth-actions"
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

interface PasswordFormProps {
  userId: string
}

export function PasswordForm({ userId }: PasswordFormProps) {
  const [state, formAction, isPending] = useActionState(
    changePassword.bind(null, userId),
    null
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display text-xl tracking-tight">
          修改密码
        </CardTitle>
        <CardDescription>站长账号不可修改密码</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="oldPassword">旧密码</Label>
            <Input
              id="oldPassword"
              name="oldPassword"
              type="password"
              autoComplete="current-password"
              required
            />
            {state?.success === false && state.errors?.oldPassword && (
              <p className="text-xs text-destructive">
                {state.errors.oldPassword[0]}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="newPassword">新密码</Label>
            <Input
              id="newPassword"
              name="newPassword"
              type="password"
              autoComplete="new-password"
              required
            />
            {state?.success === false && state.errors?.newPassword && (
              <p className="text-xs text-destructive">
                {state.errors.newPassword[0]}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              新密码需多于 6 个字符，且包含大写字母、小写字母、数字、下划线中的至少两类
            </p>
          </div>
          <div className="flex items-center justify-between">
            <Button type="submit" disabled={isPending}>
              {isPending ? "修改中..." : "修改密码"}
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
