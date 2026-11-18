"use client"

import { useEffect, useState } from "react"

import { SpaceNoEdenBgmPill } from "./SpaceNoEdenBgmPill"
import { SpaceNoEdenStageCanvas } from "./SpaceNoEdenStageCanvas"
import { useSpaceNoEdenStage } from "./stage-context"

export function SpaceNoEdenBackdrop() {
  const { active } = useSpaceNoEdenStage()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted || !active) return null

  return (
    <>
      <SpaceNoEdenStageCanvas />
      <SpaceNoEdenBgmPill />
    </>
  )
}
