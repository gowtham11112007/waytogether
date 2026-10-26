import { useEffect, useState } from 'react'
import { Umbrella, Wind } from 'lucide-react'
import { formatSpeed } from '../lib/geo'
import { describe, weatherAt } from '../lib/weather'

// Weather for a spot, refreshed every 15 minutes. null while loading or offline (then nothing shows).
export function useWeather(latlng) {
  const key = latlng ? latlng.map((v) => v.toFixed(2)).join(',') : ''
  const [w, setW] = useState(null)
  useEffect(() => {
    if (!key) return
    let alive = true
    const load = () =>
      weatherAt(key.split(',').map(Number))
        .then((d) => alive && setW(d))
        .catch(() => {})
    load()
    const id = setInterval(load, 15 * 60000)
    return () => {
      alive = false
      clearInterval(id)
    }
  }, [key])
  return key ? w : null
}

// "31° Partly cloudy · rain 40%" in the route preview.
export function WeatherPill({ latlng }) {
  const w = useWeather(latlng)
  if (!w) return null
  const { label, Icon } = describe(w)
  return (
    <span className="animate-fade-up inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-2.5 py-1 text-[12.5px] font-bold text-sky-800">
      <Icon size={15} /> {w.temp}° {label}
      {w.rain >= 30 && <span className="text-sky-600">· rain {w.rain}%</span>}
    </span>
  )
}

// Weather where you are and where you're heading (Trip tab).
export function WeatherCard({ here, dest, destName }) {
  const a = useWeather(here)
  const b = useWeather(dest)
  const rows = [
    ['Where you are', a],
    [destName || 'Destination', b],
  ].filter(([, w]) => w)
  if (!rows.length) return null
  return (
    <div className="animate-fade-up rounded-3xl border border-line p-4">
      <div className="text-[12px] font-bold uppercase tracking-wide text-ink-3">Weather</div>
      <div className="mt-2.5 grid gap-3">
        {rows.map(([name, w]) => {
          const { label, Icon } = describe(w)
          return (
            <div key={name} className="flex items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sky-50 text-sky-600">
                <Icon size={22} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[14.5px] font-bold">{name}</div>
                <div className="flex items-center gap-1 truncate text-[12.5px] font-medium text-ink-3">
                  {label} · <Wind size={12} /> {formatSpeed(w.wind)}
                </div>
              </div>
              <div className="shrink-0 text-right">
                <div className="text-[19px] font-extrabold leading-6 tabular-nums">{w.temp}°</div>
                <div className={`text-[11.5px] font-bold ${w.rain >= 50 ? 'text-sky-700' : 'text-ink-3'}`}>{w.rain}% rain</div>
              </div>
            </div>
          )
        })}
      </div>
      {b && b.rain >= 50 && (
        <p className="mt-3 flex items-center gap-2 rounded-xl bg-sky-50 px-3 py-2 text-[12.5px] font-semibold text-sky-800">
          <Umbrella size={15} className="shrink-0" /> Rain likely at {destName || 'the destination'} in the next 3 hours.
        </p>
      )}
    </div>
  )
}
