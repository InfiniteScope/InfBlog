"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"

const RETURN_KEY = "infblog-login-return"

/**
 * Records the last non-login path so the login page can redirect back
 * after a successful sign-in (e.g. when opening /login directly).
 */
export function LoginReturnTracker() {
  const pathname = usePathname()

  useEffect(() => {
    if (pathname === "/login" || pathname === "/register") return
    try {
      sessionStorage.setItem(RETURN_KEY, pathname)
    } catch {
      // storage unavailable; fallback stays "/"
    }
  }, [pathname])

  return null
}

export function getLoginReturnPath(): string {
  try {
    return sessionStorage.getItem(RETURN_KEY) || "/"
  } catch {
    return "/"
  }
}
