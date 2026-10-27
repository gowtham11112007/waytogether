import { useEffect, useState, useSyncExternalStore } from 'react'

// Everything a rider can customise (Settings screen). Saved on this phone only.
const KEY = 'convoya.settings'
export const DEFAULT_QUICK = ['On my way', 'Slow down', 'Wait for me', 'Stopping soon', 'All good', 'Where are you?', 'Take the next exit', 'Let’s regroup']
export const DEFAULT_SETTINGS = {
  v: 2, // settings version, for one-time changes to saved settings
  // Look
  theme: 'system', // system | light | dark
  mapStyle: 'auto', // auto (follows the theme) | light | dark | satellite
  mapPlaces: true, // petrol, hotels, food, hospitals and more on the map
  showSpeed: true, // speed bubble while riding
  // Units
  units: 'metric', // metric | imperial
  clock: 'auto', // auto | 12 | 24
  // Alerts
  sounds: true,
  volume: 'medium', // low | medium | high
  vibrate: true,
  voice: false,
  chatSounds: true,
  notify: { stops: true, route: true, spread: true, battery: true, members: true },
  // Safety
  keepAwake: true,
  sosHold: 3, // seconds to hold the SOS button
  emergencyNumber: '112',
  contact: null, // { name, phone }
  // Privacy
  shareBattery: true,
  // Trips and chat
  tripType: 'Bike',
  quickReplies: DEFAULT_QUICK,
}

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY)) || {}
    // Before themes existed, "light" was simply the default map: let it follow the theme now.
    if (!('theme' in saved) && saved.mapStyle === 'light') saved.mapStyle = 'auto'
    // v2: places (petrol, hotels…) are on for everyone; they used to be hidden by default.
    if ((saved.v || 1) < 2) saved.mapPlaces = true
    delete saved.map3d // the 3D map was removed
    saved.v = DEFAULT_SETTINGS.v
    return { ...DEFAULT_SETTINGS, ...saved, notify: { ...DEFAULT_SETTINGS.notify, ...(saved.notify || {}) } }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

let state = load()
const listeners = new Set()

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    /* storage unavailable */
  }
  listeners.forEach((l) => l())
}

export function getSettings() {
  return state
}
export function setSetting(key, value) {
  state = { ...state, [key]: value }
  save()
}
export function setNotify(kind, on) {
  state = { ...state, notify: { ...state.notify, [kind]: on } }
  save()
}
export function resetSettings() {
  state = { ...DEFAULT_SETTINGS }
  save()
}
export function useSettings() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => state,
  )
}

const darkQuery = () => (typeof window !== 'undefined' ? window.matchMedia?.('(prefers-color-scheme: dark)') : null)

// Is the app in its dark theme right now (chosen, or following the phone)?
export function useDarkTheme() {
  const { theme } = useSettings()
  const [systemDark, setSystemDark] = useState(() => !!darkQuery()?.matches)
  useEffect(() => {
    const mq = darkQuery()
    if (!mq) return
    const onChange = (e) => setSystemDark(e.matches)
    mq.addEventListener?.('change', onChange)
    return () => mq.removeEventListener?.('change', onChange)
  }, [])
  return theme === 'dark' || (theme === 'system' && systemDark)
}

// The map style to draw: "auto" is the Night map in the dark theme and the Default map otherwise.
export function useMapStyle() {
  const { mapStyle } = useSettings()
  const dark = useDarkTheme()
  return mapStyle === 'auto' ? (dark ? 'dark' : 'light') : mapStyle
}
