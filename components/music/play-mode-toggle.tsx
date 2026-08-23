"use client"

import { CircleStop, Repeat, Repeat1 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useMusic } from "@/components/music/music-provider"

const PLAY_MODE_CONFIG = {
  "list-loop": { icon: Repeat, label: "列表循环" },
  "single-loop": { icon: Repeat1, label: "单曲循环" },
  "no-loop": { icon: CircleStop, label: "单曲不循环（播完即停）" },
} as const

export function PlayModeToggle() {
  const { playMode, cyclePlayMode } = useMusic()
  const { icon: Icon, label } = PLAY_MODE_CONFIG[playMode]

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-7 w-7"
      onClick={cyclePlayMode}
      title={`播放模式：${label}（点击切换）`}
    >
      <Icon className="h-3.5 w-3.5" />
    </Button>
  )
}
