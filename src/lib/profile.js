const PROFILE_KEY = 'convoya.profile'
const TRIP_KEY = 'convoya.trip'

const read = (k) => {
  try {
    return JSON.parse(localStorage.getItem(k))
  } catch {
    return null
  }
}
const write = (k, v) => {
  try {
    if (v == null) localStorage.removeItem(k)
    else localStorage.setItem(k, JSON.stringify(v))
  } catch {
    /* storage unavailable */
  }
  return v
}

export const newId = () =>
  globalThis.crypto?.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`

export const loadProfile = () => read(PROFILE_KEY)
export const saveProfile = (p) => write(PROFILE_KEY, p)

// The trip you're in survives app restarts, like Google Maps location sharing.
export const loadActiveTrip = () => read(TRIP_KEY)
export const saveActiveTrip = (t) => write(TRIP_KEY, t)

export function newTripCode() {
  const n = Math.floor(1000 + Math.random() * 9000)
  return `WAY-${n}`
}

export function normalizeCode(v) {
  let x = String(v || '').toUpperCase().replace(/[^A-Z0-9]/g, '')
  if (x.length > 3) x = x.slice(0, 3) + '-' + x.slice(3, 7)
  return x
}
export const isValidCode = (c) => /^[A-Z]{3}-\d{4}$/.test(c)

// Finished trips (on this phone only).
const HISTORY_KEY = 'convoya.history'
export const loadHistory = () => read(HISTORY_KEY) || []
export function addHistory(entry) {
  const list = [entry, ...loadHistory().filter((h) => h.id !== entry.id)].slice(0, 30)
  write(HISTORY_KEY, list)
  return list
}

// Group chat, kept per trip so it survives an app restart.
export const loadChat = (code) => read(`convoya.chat.${code}`) || []
export const saveChat = (code, msgs) => write(`convoya.chat.${code}`, msgs.slice(-150))
export const clearChat = (code) => write(`convoya.chat.${code}`, null)
