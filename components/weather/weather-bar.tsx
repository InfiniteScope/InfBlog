"use client"

import { WeatherWidget } from "@/components/weather/weather-widget"
import { useAspectRatio, ASPECT_RATIO_THRESHOLD } from "@/lib/hooks/use-aspect-ratio"

export function WeatherBar() {
  const aspectRatio = useAspectRatio()

  if (aspectRatio < ASPECT_RATIO_THRESHOLD) {
    return null
  }

  return (
    <div className="pointer-events-auto fixed left-1/2 top-7 z-50 -translate-x-1/2 -translate-y-1/2">
      <WeatherWidget />
    </div>
  )
}
