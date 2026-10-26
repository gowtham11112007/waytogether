import { Cloud, CloudDrizzle, CloudFog, CloudLightning, CloudMoon, CloudRain, CloudSnow, CloudSun, Moon, Sun } from 'lucide-react'

// Weather from Open-Meteo (free, no key): conditions now, plus the chance of rain over the next few hours.
const API = 'https://api.open-meteo.com/v1/forecast'
const FRESH = 10 * 60000
const cache = new Map()

function timeout(ms) {
  const ctl = new AbortController()
  setTimeout(() => ctl.abort(new DOMException('Request timed out', 'TimeoutError')), ms)
  return ctl.signal
}

/** { temp °C, code (WMO), wind km/h, day, rain: highest chance of rain (%) in the next 3 hours } */
export async function weatherAt(latlng) {
  const key = latlng.map((v) => v.toFixed(2)).join(',')
  const hit = cache.get(key)
  if (hit && Date.now() - hit.at < FRESH) return hit.data
  const [lat, lng] = latlng
  const url =
    `${API}?latitude=${lat.toFixed(3)}&longitude=${lng.toFixed(3)}` +
    '&current=temperature_2m,weather_code,wind_speed_10m,is_day&hourly=precipitation_probability&forecast_hours=3&timezone=auto'
  const res = await fetch(url, { signal: timeout(8000) })
  if (!res.ok) throw new Error('Weather unavailable')
  const j = await res.json()
  const c = j.current || {}
  const data = {
    temp: Math.round(c.temperature_2m),
    code: c.weather_code,
    wind: Math.round(c.wind_speed_10m),
    day: c.is_day !== 0,
    rain: Math.max(0, ...(j.hourly?.precipitation_probability || []).filter((v) => v != null)),
  }
  cache.set(key, { at: Date.now(), data })
  return data
}

// WMO weather codes → words and an icon.
export function describe({ code, day = true }) {
  if (code === 0) return { label: 'Clear', Icon: day ? Sun : Moon }
  if (code <= 2) return { label: 'Partly cloudy', Icon: day ? CloudSun : CloudMoon }
  if (code === 3) return { label: 'Cloudy', Icon: Cloud }
  if (code === 45 || code === 48) return { label: 'Fog', Icon: CloudFog }
  if (code >= 51 && code <= 57) return { label: 'Drizzle', Icon: CloudDrizzle }
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return { label: code >= 80 ? 'Rain showers' : 'Rain', Icon: CloudRain }
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return { label: 'Snow', Icon: CloudSnow }
  if (code >= 95) return { label: 'Thunderstorm', Icon: CloudLightning }
  return { label: 'Cloudy', Icon: Cloud }
}

export const rainy = (w) => (w.code >= 51 && w.code <= 67) || (w.code >= 80 && w.code <= 82) || w.code >= 95
