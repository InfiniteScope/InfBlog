"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes"

type PointerLikeEvent = {
  clientX?: number
  clientY?: number
}

interface ThemeTransitionContextValue {
  /** Toggle between light and dark with a View Transition reveal. */
  toggleWithTransition: (event?: PointerLikeEvent) => void
}

const ThemeTransitionContext = React.createContext<ThemeTransitionContextValue | null>(null)

export function useThemeTransition() {
  const context = React.useContext(ThemeTransitionContext)
  if (!context) {
    throw new Error("useThemeTransition must be used within ThemeProvider")
  }
  return context
}

function ThemeTransitionProvider({ children }: { children: React.ReactNode }) {
  const { resolvedTheme, setTheme } = useTheme()

  const toggleWithTransition = React.useCallback(
    (event?: PointerLikeEvent) => {
      const nextTheme = resolvedTheme === "dark" ? "light" : "dark"

      const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
      if (!("startViewTransition" in document) || prefersReducedMotion) {
        setTheme(nextTheme)
        return
      }

      let originX = window.innerWidth / 2
      let originY = window.innerHeight / 2

      if (event?.clientX != null && event?.clientY != null) {
        originX = event.clientX
        originY = event.clientY
      }

      document.documentElement.style.setProperty("--vt-origin-x", `${originX}px`)
      document.documentElement.style.setProperty("--vt-origin-y", `${originY}px`)

      const doc = document as Document & {
        startViewTransition?: (callback: () => void | Promise<void>) => {
          ready: Promise<void>
          finished: Promise<void>
          updateCallbackDone: Promise<void>
        }
      }

      doc.startViewTransition?.(() => {
        setTheme(nextTheme)
      })
    },
    [resolvedTheme, setTheme]
  )

  return (
    <ThemeTransitionContext.Provider value={{ toggleWithTransition }}>
      {children}
    </ThemeTransitionContext.Provider>
  )
}

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false
  }

  return (
    target.isContentEditable ||
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT"
  )
}

function ThemeHotkey() {
  const { resolvedTheme } = useTheme()
  const { toggleWithTransition } = useThemeTransition()

  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || event.repeat) {
        return
      }

      if (event.metaKey || event.ctrlKey || event.altKey) {
        return
      }

      if (!event.key || event.key.toLowerCase() !== "d") {
        return
      }

      if (isTypingTarget(event.target)) {
        return
      }

      toggleWithTransition()
    }

    window.addEventListener("keydown", onKeyDown)

    return () => {
      window.removeEventListener("keydown", onKeyDown)
    }
  }, [resolvedTheme, toggleWithTransition])

  return null
}

function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      {...props}
    >
      <ThemeTransitionProvider>
        <ThemeHotkey />
        {children}
      </ThemeTransitionProvider>
    </NextThemesProvider>
  )
}

export { ThemeProvider }
