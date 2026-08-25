"use client"

import { useEffect, useState } from "react"

export function useAspectRatio() {
  const [aspectRatio, setAspectRatio] = useState<number>(
    typeof window !== "undefined" ? window.innerWidth / window.innerHeight : 1.7
  )

  useEffect(() => {
    function update() {
      setAspectRatio(window.innerWidth / window.innerHeight)
    }

    update()
    window.addEventListener("resize", update)
    return () => window.removeEventListener("resize", update)
  }, [])

  return aspectRatio
}

export const ASPECT_RATIO_THRESHOLD = 1.6645
