import { Capacitor } from '@capacitor/core'
import { isValidCode, normalizeCode } from './profile'

// Invite links open WayTogether on the web straight into "Join trip" with the code filled in.
// The Android app has no web address of its own, so it shares the public site.
const SITE = (import.meta.env.VITE_PUBLIC_URL || 'https://waytogether-azure.vercel.app').replace(/\/$/, '')
const KEY = 'convoya.join'

function siteBase() {
  const web = !Capacitor.isNativePlatform() && /^https?:$/.test(window.location.protocol)
  return web ? `${window.location.origin}${window.location.pathname}` : `${SITE}/`
}

export const inviteUrl = (code) => `${siteBase()}?join=${encodeURIComponent(code)}`

export function inviteText(trip, code) {
  return `Join my trip "${trip.name}" on WayTogether: ${inviteUrl(code)}\nOr open WayTogether → Join trip → code ${code}`
}

// View-only live map for family and friends at home: no app, no sign-in, no location of their own.
export const watchUrl = (code) => `${siteBase()}?watch=${encodeURIComponent(code)}`

export function watchText(trip, code) {
  return `Follow our ride to ${trip.dest?.name || 'our destination'} live on WayTogether (view only): ${watchUrl(code)}`
}

// ?watch=WAY-1234 opens the view-only screen instead of the app. Kept in the address, so a refresh keeps watching.
export function watchCodeFromUrl() {
  try {
    const code = normalizeCode(new URLSearchParams(window.location.search).get('watch') || '')
    return isValidCode(code) ? code : null
  } catch {
    return null
  }
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
