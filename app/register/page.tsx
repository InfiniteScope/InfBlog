"use client"

import { use, useActionState, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"

import { registerUser } from "@/app/auth-actions"
import { AvatarUploader } from "@/components/profile/avatar-uploader"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

function getFieldError(
  state: Awaited<ReturnType<typeof registerUser>>,
  field: "username" | "nickname" | "password"
) {
  if (state && "errors" in state && state.errors[field]) {
    return state.errors[field]?.[0]
  }
  return null
}

function getSafeCallbackUrl(raw: string | null, fallback = "/") {
  if (!raw) return fallback
  try {
    const url = new URL(raw, window.location.origin)
    if (url.origin !== window.location.origin) return fallback
    return url.pathname + url.search + url.hash
  } catch {
    if (raw.startsWith("/") && !raw.startsWith("//")) return raw
    return fallback
  }
}

export default function RegisterPage({
  searchParams,
}: {
  searchParams?: Promise<{ callbackUrl?: string }>
}) {
  const router = useRouter()
  const [state, formAction, isPending] = useActionState(registerUser, null)
  const [avatarDataUrl, setAvatarDataUrl] = useState("")
  const [avatarError, setAvatarError] = useState<string | null>(null)

  const params = use(
    searchParams ?? Promise.resolve({} as { callbackUrl?: string })
  )
  const callbackUrl = getSafeCallbackUrl(params?.callbackUrl ?? null)
  const callbackQuery = callbackUrl
    ? `?callbackUrl=${encodeURIComponent(callbackUrl)}`
    : ""

  useEffect(() => {
    if (state?.success) {
      router.push(`/login${callbackQuery}`)
    }
  }, [state, callbackQuery, router])

  const usernameError = getFieldError(state, "username")
  const nicknameError = getFieldError(state, "nickname")
  const passwordError = getFieldError(state, "password")

  return (
    <div className="mx-auto flex min-h-[calc(100vh-3.5rem)] w-full max-w-3xl flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-6 rounded-xl border border-border bg-card/50 p-6">
        <div className="space-y-2 text-center">
          <p className="font-mono text-xs tracking-widest text-accent">
            // REGISTER
          </p>
          <h1 className="font-display text-3xl tracking-tight">注册</h1>
          <p className="text-sm text-muted-foreground">
            注册后默认权限为访客
          </p>
        </div>

        <form
          action={formAction}
          className="space-y-4"
          onSubmit={(e) => {
            if (avatarError) {
              e.preventDefault()
            }
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="username">用户名</Label>
            <Input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              aria-invalid={!!usernameError}
              required
            />
            {usernameError && (
              <p className="text-xs text-destructive">{usernameError}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="nickname">昵称（选填）</Label>
            <Input
              id="nickname"
              name="nickname"
              type="text"
              autoComplete="nickname"
              aria-invalid={!!nicknameError}
              placeholder="显示昵称，可随时修改"
            />
            {nicknameError && (
              <p className="text-xs text-destructive">{nicknameError}</p>
            )}
          </div>

          <AvatarUploader
            value={avatarDataUrl}
            onChange={setAvatarDataUrl}
            error={avatarError}
            onError={setAvatarError}
          />
          <input type="hidden" name="avatarDataUrl" value={avatarDataUrl} />

          <div className="space-y-2">
            <Label htmlFor="password">密码</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              aria-invalid={!!passwordError}
              required
            />
            {passwordError && (
              <p className="text-xs text-destructive">{passwordError}</p>
            )}
            <p className="text-xs text-muted-foreground">
              密码需多于 6 个字符，且包含大写字母、小写字母、数字、下划线中的至少两类
            </p>
          </div>

          {state?.success === true && (
            <p className="text-sm text-accent">{state.message}，请登录</p>
          )}
          {state?.success === false && state.message && (
            <p className="text-sm text-destructive">{state.message}</p>
          )}

          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "注册中..." : "注册"}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          已有账号？{" "}
          <Link
            href={`/login${callbackQuery}`}
            className="text-primary underline underline-offset-4"
          >
            登录
          </Link>
        </p>
      </div>
    </div>
  )
}
