import { Capacitor, CapacitorHttp } from '@capacitor/core'
import { CapacitorUpdater } from '@capgo/capacitor-updater'
import nativeInfo from '../../native-version.json'

// Over-the-air updates, self-hosted on GitHub Releases:
// every push to main builds the web app and publishes update.json + bundle.zip (see .github/workflows).
const FEED = 'https://github.com/gowtham11112007/waytogether/releases/latest/download/update.json'
const native = Capacitor.isNativePlatform()

export const NATIVE_VERSION = nativeInfo.native // native features built into this APK
export const BUILD = Number(import.meta.env.VITE_APP_BUILD || 0) // web build running right now
export const VERSION_LABEL = `v${NATIVE_VERSION}.${BUILD}`

const KEY = 'convoya.update'
const remember = (v) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(v))
  } catch {
    /* storage unavailable */
  }
}
const recall = () => {
  try {
    return JSON.parse(localStorage.getItem(KEY))
  } catch {
    return null
  }
}

// Tell the updater this bundle started fine (otherwise it rolls back to the previous one).
export function markAppReady() {
  if (native) CapacitorUpdater.notifyAppReady().catch(() => {})
}

/**
 * Returns { state: 'none' } | { state: 'ready', bundleId, build, notes } | { state: 'apk', apk, notes }
 * 'ready' = a newer web build is downloaded and can be applied with applyUpdate().
 */
export async function checkForUpdate() {
  if (!native) return { state: 'none' }
  try {
    const res = await CapacitorHttp.get({ url: `${FEED}?t=${Date.now()}`, responseType: 'json' })
    const feed = typeof res.data === 'string' ? JSON.parse(res.data) : res.data
    if (!feed?.build) return { state: 'none' }
    if (feed.native > NATIVE_VERSION) return { state: 'apk', apk: feed.apk, notes: feed.notes, build: feed.build }
    if (feed.build <= BUILD) return { state: 'none' }
    const saved = recall()
    if (saved?.build === feed.build && saved.bundleId) return { state: 'ready', bundleId: saved.bundleId, build: feed.build, notes: feed.notes }
    const bundle = await CapacitorUpdater.download({ url: feed.bundle, version: String(feed.build) })
    remember({ build: feed.build, bundleId: bundle.id })
    return { state: 'ready', bundleId: bundle.id, build: feed.build, notes: feed.notes }
  } catch {
    return { state: 'none' } // offline or no release yet: try again later
  }
}

// Switch to the downloaded build now (reloads the app; an active trip resumes automatically).
export function applyUpdate(bundleId) {
  return CapacitorUpdater.set({ id: bundleId })
}
