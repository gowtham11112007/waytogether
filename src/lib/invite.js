import { Capacitor } from '@capacitor/core'
import { isValidCode, normalizeCode } from './profile'

// Invite links open WayTogether on the web straight into "Join trip" with the code filled in.
// The Android app has no web address of its own, so it shares the public site.
const SITE = (import.meta.env.VITE_PUBLIC_URL || 'https://waytogether-azure.vercel.app').replace(/\/$/, '')
const KEY = 'convoya.join'

export function inviteUrl(code) {
  const web = !Capacitor.isNativePlatform() && /^https?:$/.test(window.location.protocol)
  const base = web ? `${window.location.origin}${window.location.pathname}` : `${SITE}/`
  return `${base}?join=${encodeURIComponent(code)}`
}

export function inviteText(trip, code) {
  return `Join my trip "${trip.name}" on WayTogether: ${inviteUrl(code)}\nOr open WayTogether → Join trip → code ${code}`
}

// The code this page was opened with (?join=WAY-1234), read once at startup. It's kept for the
// session so it survives the round trip through Google sign-in, and cleared when used.
function readInvite() {
  try {
    const url = new URL(window.location.href)
    const raw = url.searchParams.get('join')
    if (raw != null) {
      url.searchParams.delete('join')
      window.history.replaceState(null, '', url.pathname + url.search + url.hash)
      const code = normalizeCode(raw)
      if (isValidCode(code)) sessionStorage.setItem(KEY, code)
    }
    return sessionStorage.getItem(KEY)
  } catch {
    return null
  }
}

export const pendingInvite = typeof window === 'undefined' ? null : readInvite()

export function clearInvite() {
  try {
    sessionStorage.removeItem(KEY)
  } catch {
    /* storage unavailable */
  }
}
