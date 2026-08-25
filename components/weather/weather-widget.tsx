"use client"

import { useEffect, useState } from "react"
import {
  Cloud,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  MapPin,
  Search,
  Sun,
} from "lucide-react"

import {
  type GeoLocation,
  type WeatherCurrent,
  type GeocodingResult,
  raceIpLocation,
  fetchWeather,
  searchCity,
  getWeatherDescription,
} from "@/lib/weather"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { useTimePrecision } from "@/components/time/time-precision-provider"
import { LoadingDots } from "@/components/ui/loading-dots"

const STORAGE_KEY = "infblog-weather-location"

function WeatherIcon({ code, className }: { code: number; className?: string }) {
  if (code === 0) return <Sun className={cn("text-amber-400", className)} />
  if (code >= 1 && code <= 3) return <Cloud className={cn("text-slate-400", className)} />
  if (code === 45 || code === 48) return <CloudFog className={cn("text-slate-400", className)} />
  if (code >= 51 && code <= 67) return <CloudRain className={cn("text-blue-400", className)} />
  if (code >= 71 && code <= 77) return <CloudSnow className={cn("text-sky-200", className)} />
  if (code >= 80 && code <= 82) return <CloudRain className={cn("text-blue-400", className)} />
  if (code >= 85 && code <= 86) return <CloudSnow className={cn("text-sky-200", className)} />
  if (code >= 95) return <CloudLightning className={cn("text-violet-400", className)} />
  return <Sun className={cn("text-amber-400", className)} />
}

function useClock() {
  const [time, setTime] = useState<Date | null>(null)
  useEffect(() => {
    setTime(new Date())
    const id = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  return time
}

export function WeatherWidget() {
  const [location, setLocation] = useState<GeoLocation | null>(null)
  const [weather, setWeather] = useState<WeatherCurrent | null>(null)
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [searchResults, setSearchResults] = useState<GeocodingResult[]>([])
  const [searching, setSearching] = useState(false)
  const time = useClock()
  const { precision } = useTimePrecision()

  useEffect(() => {
    let cancelled = false
    async function init() {
      const saved = localStorage.getItem(STORAGE_KEY)
      let loc: GeoLocation
      if (saved) {
        try {
          loc = JSON.parse(saved) as GeoLocation
        } catch {
          loc = await raceIpLocation()
        }
      } else {
        loc = await raceIpLocation()
      }
      if (cancelled) return
      setLocation(loc)
      try {
        const w = await fetchWeather(loc)
        if (!cancelled) setWeather(w)
      } catch {
        // ignore
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    init()
    return () => {
      cancelled = true
    }
  }, [])

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return
    setSearching(true)
    try {
      const results = await searchCity(query.trim())
      setSearchResults(results)
    } finally {
      setSearching(false)
    }
  }

  const selectLocation = (result: GeocodingResult) => {
    const loc: GeoLocation = {
      city: result.name,
      latitude: result.latitude,
      longitude: result.longitude,
      country: result.country,
    }
    setLocation(loc)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(loc))
    setDialogOpen(false)
    setSearchResults([])
    setQuery("")
    fetchWeather(loc).then(setWeather).catch(() => {})
  }

  return (
    <>
      <button
        onClick={() => setDialogOpen(true)}
        className="group flex items-center gap-2 rounded-full border border-border/60 bg-background/50 px-3 py-1.5 text-xs backdrop-blur-md transition-all hover:border-accent/60 hover:bg-accent/10"
        aria-label="切换天气地区"
      >
        {loading || !weather || !location ? (
          <span className="flex items-center gap-2 text-muted-foreground">
            <LoadingDots />
            天气加载中...
          </span>
        ) : (
          <>
            <MapPin className="h-3 w-3 text-accent transition-transform group-hover:scale-110" />
            <span className="font-medium">{location.city}</span>
            <WeatherIcon code={weather.weatherCode} className="h-3.5 w-3.5" />
            <span>{weather.temperature}°C</span>
            <span className="text-muted-foreground tabular-nums">
              {time?.toLocaleTimeString("zh-CN", {
                hour: "2-digit",
                minute: "2-digit",
                ...(precision === "second" ? { second: "2-digit" as const } : {}),
              })}
            </span>
          </>
        )}
      </button>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>切换天气地区</DialogTitle>
            <DialogDescription>
              搜索城市名称，选择后更新天气与时间显示
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSearch} className="flex gap-2 pt-2">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="输入城市名，如成都、北京..."
            />
            <Button type="submit" size="icon" disabled={searching}>
              <Search className="h-4 w-4" />
            </Button>
          </form>
          <div className="grid gap-2">
            {searchResults.map((result) => (
              <Button
                key={`${result.name}-${result.latitude}`}
                variant="outline"
                className="justify-start"
                onClick={() => selectLocation(result)}
              >
                <MapPin className="mr-2 h-4 w-4 text-accent" />
                {result.name}
                {result.admin1 ? ` · ${result.admin1}` : ""}
                {result.country ? ` · ${result.country}` : ""}
              </Button>
            ))}
            {searchResults.length === 0 && !searching && query && (
              <p className="text-sm text-muted-foreground">未找到相关城市</p>
            )}
            {searching && (
              <p className="text-sm text-muted-foreground">搜索中...</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
