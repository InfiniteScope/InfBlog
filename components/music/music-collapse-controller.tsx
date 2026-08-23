"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"

import { useMusic } from "@/components/music/music-provider"

export function MusicCollapseController() {
  const pathname = usePathname()
  const { setCollapsed } = useMusic()

  // Set initial state based on route.
  useEffect(() => {
    if (pathname === "/") {
      setCollapsed(false)
    } else {
      setCollapsed(true)
    }
  }, [pathname, setCollapsed])

  return null
}
