export interface GeoLocation {
  city: string
  latitude: number
  longitude: number
  country?: string
}

export interface WeatherCurrent {
  temperature: number
  weatherCode: number
}

export function getWeatherDescription(code: number) {
  // WMO Weather interpretation codes
  if (code === 0) return "晴朗"
  if (code >= 1 && code <= 3) return "多云"
  if (code === 45 || code === 48) return "雾"
  if (code >= 51 && code <= 55) return "毛毛雨"
  if (code >= 61 && code <= 67) return "雨"
  if (code >= 71 && code <= 77) return "雪"
  if (code >= 80 && code <= 82) return "阵雨"
  if (code >= 85 && code <= 86) return "阵雪"
  if (code >= 95) return "雷阵雨"
  return "未知"
}

export function raceIpLocation(timeout = 4000): Promise<GeoLocation> {
  const controllers = [new AbortController(), new AbortController()]
  const timeoutId = setTimeout(() => {
    controllers.forEach((c) => c.abort())
  }, timeout)

  const ipapi = fetch("https://ipapi.co/json/", {
    signal: controllers[0].signal,
  })
    .then((res) => (res.ok ? res.json() : Promise.reject(res)))
    .then((data) => ({
      city: data.city as string,
      latitude: parseFloat(data.latitude),
      longitude: parseFloat(data.longitude),
      country: data.country_name as string,
    }))

  const ipApi = fetch("http://ip-api.com/json/?fields=status,city,lat,lon,country", {
    signal: controllers[1].signal,
  })
    .then((res) => (res.ok ? res.json() : Promise.reject(res)))
    .then((data) => ({
      city: data.city as string,
      latitude: parseFloat(data.lat),
      longitude: parseFloat(data.lon),
      country: data.country as string,
    }))

  return Promise.race([ipapi, ipApi])
    .finally(() => clearTimeout(timeoutId))
    .catch(() => ({
      city: "成都",
      latitude: 30.66,
      longitude: 104.06,
      country: "中国",
    }))
}

export async function fetchWeather(location: GeoLocation): Promise<WeatherCurrent> {
  const url = new URL("https://api.open-meteo.com/v1/forecast")
  url.searchParams.set("latitude", location.latitude.toString())
  url.searchParams.set("longitude", location.longitude.toString())
  url.searchParams.set("current", "temperature_2m,weather_code")
  url.searchParams.set("timezone", "auto")

  const res = await fetch(url)
  if (!res.ok) throw new Error("天气获取失败")
  const data = await res.json()
  return {
    temperature: data.current.temperature_2m as number,
    weatherCode: data.current.weather_code as number,
  }
}

export interface GeocodingResult {
  name: string
  latitude: number
  longitude: number
  country?: string
  admin1?: string
}

export async function searchCity(query: string): Promise<GeocodingResult[]> {
  const trimmed = query.trim()
  if (!trimmed) return []

  const url = new URL("https://geocoding-api.open-meteo.com/v1/search")
  url.searchParams.set("name", trimmed)
  url.searchParams.set("count", "10")
  url.searchParams.set("language", "zh")
  url.searchParams.set("format", "json")

  const res = await fetch(url)
  if (!res.ok) throw new Error("搜索失败")
  const data = await res.json()
  if (!data.results) return []

  const lowerQuery = trimmed.toLowerCase()
  const results = (data.results as Array<Record<string, unknown>>)
    .filter((item) => {
      const name = String(item.name ?? "")
      // Only keep results whose name actually starts with the query to avoid
      // irrelevant fuzzy matches from the API.
      return name.toLowerCase().startsWith(lowerQuery)
    })
    .map((item) => ({
      name: item.name as string,
      latitude: parseFloat(item.latitude as string),
      longitude: parseFloat(item.longitude as string),
      country: item.country as string | undefined,
      admin1: item.admin1 as string | undefined,
      population: Number(item.population ?? 0),
    }))
    .sort((a, b) => b.population - a.population)
    // Deduplicate by name; prefer the most populous match.
    .filter((item, index, arr) => {
      const firstIndex = arr.findIndex(
        (other) => other.name.toLowerCase() === item.name.toLowerCase()
      )
      return firstIndex === index
    })

  return results.slice(0, 5)
}
