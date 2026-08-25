import { WeatherWidget } from "@/components/weather/weather-widget"

export function WeatherBar() {
  return (
    <div className="pointer-events-auto fixed left-1/2 top-7 z-50 hidden -translate-x-1/2 -translate-y-1/2 xl:block">
      <WeatherWidget />
    </div>
  )
}
