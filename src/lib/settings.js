import { useSyncExternalStore } from 'react'

const KEY = 'convoya.settings'
const DEFAULTS = { mapStyle: 'light', sounds: true, keepAwake: true }
let state = (() => {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY)) }
  } catch {
    return { ...DEFAULTS }
  }
})()
const listeners = new Set()

export function getSettings() {
  return state
}
export function setSetting(key, value) {
  state = { ...state, [key]: value }
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    /* storage unavailable */
  }
  listeners.forEach((l) => l())
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
