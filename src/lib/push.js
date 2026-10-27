import { Capacitor, CapacitorHttp } from '@capacitor/core'
import { PushNotifications } from '@capacitor/push-notifications'
import { NATIVE_VERSION } from './updates'

// Push alerts (Firebase Cloud Messaging, free): SOS and group stops reach riders even when the app is closed.
// Each phone shares its push token in the trip; the phone raising the alert asks our /api/notify to send it.
// Only APKs from native version 3 have Firebase built in (registering without it would crash the app).
const SITE = (import.meta.env.VITE_PUBLIC_URL || 'https://waytogether-azure.vercel.app').replace(/\/$/, '')
const enabled = Capacitor.isNativePlatform() && NATIVE_VERSION >= 3

let token = null
export const getPushToken = () => token

export async function initPush() {
  if (!enabled) return
  try {
    PushNotifications.addListener('registration', (t) => {
      token = t.value
    })
    let perm = await PushNotifications.checkPermissions()
    if (perm.receive === 'prompt') perm = await PushNotifications.requestPermissions()
    if (perm.receive === 'granted') await PushNotifications.register()
  } catch {
    /* no push on this phone */
  }
}

// kind: 'sos' (the urgent, loud channel) or 'trip'.
export async function sendPush(tokens, { title, body, kind = 'trip' }) {
  const list = [...new Set(tokens.filter(Boolean))].filter((t) => t !== token)
  if (!list.length) return
  try {
    await CapacitorHttp.post({
      url: `${SITE}/api/notify`,
      headers: { 'Content-Type': 'application/json' },
      data: { tokens: list.slice(0, 50), title, body, kind },
      connectTimeout: 10000,
      readTimeout: 10000,
    })
  } catch {
    /* the realtime alert still goes out */
  }
}
