"use client"

/**
 * Helpers for preserving user state across the login flow.
 *
 * Usage in a feature that needs to redirect to login:
 *   saveLoginDraft("my-feature-draft", state)
 *   window.location.href = getLoginRedirectUrl()
 *
 * On return, restore the draft:
 *   const draft = restoreLoginDraft<MyState>("my-feature-draft")
 */

export function getLoginRedirectUrl(fallback = "/") {
  if (typeof window === "undefined") return `/login?callbackUrl=${encodeURIComponent(fallback)}`

  const current = window.location.pathname + window.location.search + window.location.hash
  return `/login?callbackUrl=${encodeURIComponent(current || fallback)}`
}

export function saveLoginDraft<T>(key: string, data: T) {
  if (typeof window === "undefined") return
  try {
    sessionStorage.setItem(key, JSON.stringify(data))
  } catch {
    // ignore storage errors
  }
}

export function restoreLoginDraft<T>(key: string): T | null {
  if (typeof window === "undefined") return null
  try {
    const raw = sessionStorage.getItem(key)
    if (!raw) return null
    sessionStorage.removeItem(key)
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}
