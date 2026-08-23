"use client"

import { use, useActionState, useEffect, useRef } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"

import { loginUser } from "@/app/auth-actions"
import { getLoginReturnPath } from "@/components/login-return-tracker"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

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

export default function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<{ callbackUrl?: string }>
}) {
  const router = useRouter()
  const { update } = useSession()
  const [state, formAction, isPending] = useActionState(loginUser, null)

  const params = use(
    searchParams ?? Promise.resolve({} as { callbackUrl?: string })
  )
  // Priority: explicit ?callbackUrl= → last non-login path → "/"
  const callbackUrl = getSafeCallbackUrl(
    params?.callbackUrl ?? getLoginReturnPath()
  )
  const redirectedRef = useRef(false)

  useEffect(() => {
    // Guard: `update` identity changes on every session refetch (next-auth v5
    // beta), so without a ref this effect would loop forever calling
    // GET /api/auth/csrf + POST /api/auth/session.
    if (state?.success && !redirectedRef.current) {
      redirectedRef.current = true
      // Force session refetch so UI reflects logged-in state immediately.
      update().finally(() => {
        router.push(callbackUrl)
        router.refresh()
      })
    }
  }, [state, callbackUrl, router, update])

  return (
    <div className="mx-auto flex min-h-[calc(100vh-3.5rem)] w-full max-w-3xl flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-6 rounded-xl border border-border bg-card/50 p-6">
        <div className="space-y-2 text-center">
          <p className="font-mono text-xs tracking-widest text-accent">
            // LOGIN
          </p>
          <h1 className="font-display text-3xl tracking-tight">登录</h1>
        </div>

        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">用户名</Label>
            <Input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">密码</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </div>

          {state?.success === false && state.message && (
            <p className="text-sm text-destructive">{state.message}</p>
          )}

          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "登录中..." : "登录"}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          还没有账号？{" "}
          <Link
            href={`/register${
              callbackUrl ? `?callbackUrl=${encodeURIComponent(callbackUrl)}` : ""
            }`}
            className="text-primary underline underline-offset-4"
          >
            注册
          </Link>
        </p>
      </div>
    </div>
  )
}
