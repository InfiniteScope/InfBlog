import { WeatherWidget } from "@/components/weather/weather-widget"

export function WeatherBar() {
  return (
    <div className="pointer-events-auto fixed left-1/2 top-[4.5rem] z-50 hidden -translate-x-1/2 lg:block">
      <WeatherWidget />
    </div>
  )
}
