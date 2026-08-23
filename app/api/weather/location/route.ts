import { NextResponse } from "next/server"

const TIMEOUT_MS = 3500

function timeoutSignal(ms: number) {
  const controller = new AbortController()
  setTimeout(() => controller.abort(), ms)
  return controller.signal
}

interface GeoLocation {
  city: string
  latitude: number
  longitude: number
  country?: string
}

/**
 * 服务端代理 IP 定位——ipapi.co / ip-api.com 均无 CORS 头，
 * 浏览器直连必然被拦截（此前在客户端 fetch 永远走回退成都）。
 * 服务端竞速两个源，先成功者胜。
 */
export async function GET() {
  const ipapi = fetch("https://ipapi.co/json/", {
    signal: timeoutSignal(TIMEOUT_MS),
    cache: "no-store",
  })
    .then((res) => (res.ok ? res.json() : Promise.reject(res)))
    .then((data) => ({
      city: data.city as string,
      latitude: parseFloat(data.latitude),
      longitude: parseFloat(data.longitude),
      country: data.country_name as string,
    }))

  const ipApi = fetch("http://ip-api.com/json/?fields=status,city,lat,lon,country", {
    signal: timeoutSignal(TIMEOUT_MS),
    cache: "no-store",
  })
    .then((res) => (res.ok ? res.json() : Promise.reject(res)))
    .then((data) => ({
      city: data.city as string,
      latitude: parseFloat(data.lat),
      longitude: parseFloat(data.lon),
      country: data.country as string,
    }))

  const location: GeoLocation = await Promise.race([ipapi, ipApi]).catch(() => ({
    city: "成都",
    latitude: 30.66,
    longitude: 104.06,
    country: "中国",
  }))

  return NextResponse.json(location)
}
