"use client"

import { useEffect, useState } from "react"

interface Viewport {
  width: number
  height: number
  aspectRatio: number
}

const SSR_VIEWPORT: Viewport = {
  width: 1280,
  height: 800,
  aspectRatio: 1.6,
}

export function useAspectRatio(): Viewport {
  const [viewport, setViewport] = useState<Viewport>(
    typeof window !== "undefined"
      ? {
          width: window.innerWidth,
          height: window.innerHeight,
          aspectRatio: window.innerWidth / window.innerHeight,
        }
      : SSR_VIEWPORT
  )

  useEffect(() => {
    function update() {
      setViewport({
        width: window.innerWidth,
        height: window.innerHeight,
        aspectRatio: window.innerWidth / window.innerHeight,
      })
    }

    update()
    window.addEventListener("resize", update)
    return () => window.removeEventListener("resize", update)
  }, [])

  return viewport
}

export const ASPECT_RATIO_THRESHOLD = 1.61
export const DRAWER_BREAKPOINT = 1024
