import { useEffect, useRef, useState } from 'react'
import { Capacitor, registerPlugin } from '@capacitor/core'
import { Geolocation } from '@capacitor/geolocation'
import { Device } from '@capacitor/device'
import { bearing, haversine } from './geo'

const BackgroundGeolocation = registerPlugin('BackgroundGeolocation')
const native = Capacitor.isNativePlatform()

// Testing aid: ?mock=lat,lng[&heading=deg&speed=kmh] fakes a GPS (browser only).
function mockFromUrl() {
  if (native || typeof location === 'undefined') return null
  const p = new URLSearchParams(location.search)
  const m = p.get('mock')
  if (!m) return null
  const [lat, lng] = m.split(',').map(Number)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  return { lat, lng, heading: Number(p.get('heading') || 0), speed: Number(p.get('speed') || 0) }
}

export const isMockLocation = () => !!mockFromUrl()

/**
 * Your live position.
 * - status: 'starting' | 'ok' | 'denied' | 'unavailable'
 * - background: during a trip on Android, use a foreground service so sharing continues with the screen off.
 */
export function useMyLocation({ background = false, enabled = true } = {}) {
  const [fix, setFix] = useState(null)
  const [status, setStatus] = useState('starting')
  const last = useRef(null)
  const [retry, setRetry] = useState(0)

  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    let stop = () => {}

    const accept = (lat, lng, accuracy, speedMs, headingDeg) => {
      if (cancelled) return
      const now = Date.now()
      const prev = last.current
      let speed = speedMs != null && speedMs >= 0 ? speedMs * 3.6 : null
      let heading = headingDeg != null && !Number.isNaN(headingDeg) ? headingDeg : prev?.heading ?? 0
      if (prev) {
        const moved = haversine(prev.latlng, [lat, lng])
        const dt = (now - prev.at) / 1000
        if (speed == null && dt > 0) speed = moved > 3 ? (moved / dt) * 3.6 : 0
        if ((headingDeg == null || Number.isNaN(headingDeg)) && moved > 8) heading = bearing(prev.latlng, [lat, lng])
      }
      const next = { latlng: [lat, lng], accuracy: Math.round(accuracy || 0), speed: Math.round(speed || 0), heading, at: now }
      last.current = next
      setFix(next)
      setStatus('ok')
    }

    const mock = mockFromUrl()
    if (mock) {
      let { lat, lng } = mock
      const tick = () => {
        accept(lat, lng, 8, mock.speed / 3.6, mock.heading)
        const metres = (mock.speed / 3.6) * 2
        lat += (metres * Math.cos((mock.heading * Math.PI) / 180)) / 110540
        lng += (metres * Math.sin((mock.heading * Math.PI) / 180)) / (111320 * Math.cos((lat * Math.PI) / 180))
      }
      tick()
      const id = setInterval(tick, 2000)
      return () => clearInterval(id)
    }

    const start = async () => {
      if (native && background) {
        // Foreground service with a persistent notification, like Google Maps sharing.
        try {
          const id = await BackgroundGeolocation.addWatcher(
            {
              backgroundTitle: 'Sharing your live location',
              backgroundMessage: 'Your convoy can see where you are. Tap to open.',
              requestPermissions: true,
              stale: false,
              distanceFilter: 5,
            },
            (loc, err) => {
              if (err) {
                if (err.code === 'NOT_AUTHORIZED') setStatus('denied')
                return
              }
              if (loc) accept(loc.latitude, loc.longitude, loc.accuracy, loc.speed, loc.bearing)
            },
          )
          stop = () => BackgroundGeolocation.removeWatcher({ id })
          return
        } catch {
          /* fall back to the normal watcher below */
        }
      }

      if (native) {
        try {
          let perm = await Geolocation.checkPermissions()
          if (perm.location !== 'granted') perm = await Geolocation.requestPermissions({ permissions: ['location'] })
          if (perm.location !== 'granted' && perm.coarseLocation !== 'granted') {
            setStatus('denied')
            return
          }
          const id = await Geolocation.watchPosition({ enableHighAccuracy: true, timeout: 20000, maximumAge: 2000 }, (pos, err) => {
            if (err || !pos) return
            const c = pos.coords
            accept(c.latitude, c.longitude, c.accuracy, c.speed, c.heading)
          })
          stop = () => Geolocation.clearWatch({ id })
        } catch {
          setStatus('unavailable')
        }
        return
      }

      if (!navigator.geolocation) {
        setStatus('unavailable')
        return
      }
      const id = navigator.geolocation.watchPosition(
        (pos) => accept(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy, pos.coords.speed, pos.coords.heading),
        (err) => setStatus(err.code === 1 ? 'denied' : 'unavailable'),
        { enableHighAccuracy: true, maximumAge: 2000, timeout: 20000 },
      )
      stop = () => navigator.geolocation.clearWatch(id)
    }

    start()
    return () => {
      cancelled = true
      stop()
    }
  }, [background, retry, enabled])

  return { fix, status, retry: () => setRetry((r) => r + 1) }
}

// Battery level (0–100) where the device tells us; null otherwise.
export function useBattery() {
  const [level, setLevel] = useState(null)
  useEffect(() => {
    let alive = true
    const read = async () => {
      try {
        if (native) {
          const info = await Device.getBatteryInfo()
          if (alive && info.batteryLevel != null) setLevel(Math.round(info.batteryLevel * 100))
        } else if (navigator.getBattery) {
          const b = await navigator.getBattery()
          if (alive) setLevel(Math.round(b.level * 100))
        }
      } catch {
        /* not supported */
      }
    }
    read()
    const id = setInterval(read, 60000)
    return () => {
      alive = false
      clearInterval(id)
    }
  }, [])
  return level
}
