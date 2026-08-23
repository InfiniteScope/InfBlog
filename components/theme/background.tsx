"use client"

import { useBackground } from "@/components/theme/background-provider"
import { ParticleBackground } from "@/components/theme/particle-background"
import { BlobBackground } from "@/components/theme/blob-background"

export function Background() {
  const { background } = useBackground()

  if (background === "particles") return <ParticleBackground />
  if (background === "blobs") return <BlobBackground />
  return null
}
