import { Capacitor, registerPlugin } from '@capacitor/core'
import { AppLauncher } from '@capacitor/app-launcher'

const native = Capacitor.isNativePlatform()

// Opens Google Maps, Spotify, etc. in their own apps on Android; a new tab on the web.
export async function openExternal(url) {
  if (native) {
    try {
      await AppLauncher.openUrl({ url })
      return true
    } catch {
      return false
    }
  }
  window.open(url, '_blank', 'noopener')
  return true
}

export const googleMapsDirections = (latlng) =>
  `https://www.google.com/maps/dir/?api=1&destination=${latlng[0].toFixed(6)},${latlng[1].toFixed(6)}&travelmode=driving`

// Media keys: control whatever is playing (Spotify, YouTube Music, any player). Android only.
const MediaControl = registerPlugin('MediaControl')
export const musicAvailable = native
export const music = {
  playPause: () => MediaControl.playPause().catch(() => {}),
  next: () => MediaControl.next().catch(() => {}),
  previous: () => MediaControl.previous().catch(() => {}),
  volumeUp: () => MediaControl.volumeUp().catch(() => {}),
  volumeDown: () => MediaControl.volumeDown().catch(() => {}),
  status: () => MediaControl.status().catch(() => ({ playing: false })),
}

export async function openSpotify(playlistUrl) {
  if (playlistUrl) return openExternal(playlistUrl)
  if (native && (await openExternal('spotify:'))) return true
  return openExternal('https://open.spotify.com/')
}
