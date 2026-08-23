"use client"

import { cn } from "@/lib/utils"

interface RangeSliderProps {
  value: number
  max: number
  min?: number
  step?: number
  onChange: (value: number) => void
  onPointerDown?: () => void
  onPointerUp?: () => void
  className?: string
}

export function RangeSlider({
  value,
  max,
  min = 0,
  step = 1,
  onChange,
  onPointerDown,
  onPointerUp,
  className,
}: RangeSliderProps) {
  const percent = max > min ? ((value - min) / (max - min)) * 100 : 0

  return (
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onTouchStart={onPointerDown}
      onTouchEnd={onPointerUp}
      className={cn("music-slider", className)}
      style={{
        background: `linear-gradient(to right, hsl(var(--accent)) 0%, hsl(var(--accent)) ${percent}%, hsl(var(--muted)) ${percent}%, hsl(var(--muted)) 100%)`,
      }}
    />
  )
}
