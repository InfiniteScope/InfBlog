"use client"

import { useEffect, useRef, useState } from "react"

import { cn } from "@/lib/utils"

interface ProgressBarProps {
  value: number
  max: number
  onChange: (value: number) => void
  className?: string
}

export function ProgressBar({ value, max, onChange, className }: ProgressBarProps) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [dragging, setDragging] = useState(false)
  const [localValue, setLocalValue] = useState(value)

  useEffect(() => {
    if (!dragging) setLocalValue(value)
  }, [value, dragging])

  const percent = max > 0 ? Math.max(0, Math.min(1, localValue / max)) : 0

  const handlePointer = (clientX: number) => {
    const rect = trackRef.current?.getBoundingClientRect()
    if (!rect) return
    const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    const newValue = pct * max
    setLocalValue(newValue)
    onChange(newValue)
  }

  return (
    <div
      ref={trackRef}
      className={cn(
        "group relative h-2 w-full cursor-pointer rounded-full bg-muted transition-colors hover:bg-muted-foreground/20",
        className
      )}
      onPointerDown={(e) => {
        setDragging(true)
        handlePointer(e.clientX)
        e.currentTarget.setPointerCapture(e.pointerId)
      }}
      onPointerMove={(e) => {
        if (dragging) handlePointer(e.clientX)
      }}
      onPointerUp={(e) => {
        setDragging(false)
        try {
          e.currentTarget.releasePointerCapture(e.pointerId)
        } catch {}
      }}
      onPointerLeave={() => setDragging(false)}
    >
      <div
        className="absolute left-0 top-0 h-full rounded-full bg-accent transition-all"
        style={{ width: `${percent * 100}%` }}
      />
      <div
        className="absolute h-3.5 w-3.5 rounded-full border-2 border-background bg-accent shadow"
        style={{
          left: `${percent * 100}%`,
          top: "50%",
          transform: "translate(-50%, -50%)",
        }}
      />
    </div>
  )
}
