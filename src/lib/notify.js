import { Capacitor, registerPlugin } from '@capacitor/core'
import { App } from '@capacitor/app'
import { LocalNotifications } from '@capacitor/local-notifications'
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics'

const native = Capacitor.isNativePlatform()
export async function askNotificationPermission() {
  if (!native) return
  try {
    const p = await LocalNotifications.checkPermissions()
    if (p.display !== 'granted') await LocalNotifications.requestPermissions()
  } catch {
    /* not available */
  }
}

// On Android the WebView can still report "visible" while the app is in the background,
// so trust the native app-state events there.
let nativeActive = true
if (native) App.addListener('appStateChange', ({ isActive }) => (nativeActive = isActive))
export const appInBackground = () => (native ? !nativeActive : typeof document !== 'undefined' && document.visibilityState === 'hidden')

// A system notification, shown when the app isn't on screen (e.g. phone in pocket during a ride).
// Posted by the app's own TripAlerts plugin: immediate, no alarm permission, works in the background.
const TripAlerts = registerPlugin('TripAlerts')
export async function systemNotify(title, body, channel = 'trip') {
  if (!native) return
  try {
    await TripAlerts.show({ title, body, channel })
  } catch {
    /* permission denied */
  }
}

export function haptic(kind = 'light') {
  if (!native) {
    try {
      navigator.vibrate?.(kind === 'danger' ? [200, 100, 200, 100, 400] : 30)
    } catch {
      /* unsupported */
    }
    return
  }
  const p =
    kind === 'danger'
      ? Haptics.notification({ type: NotificationType.Error })
      : kind === 'warn'
        ? Haptics.notification({ type: NotificationType.Warning })
        : kind === 'ok'
          ? Haptics.notification({ type: NotificationType.Success })
          : Haptics.impact({ style: ImpactStyle.Light })
  p.catch(() => {})
  if (kind === 'danger') Haptics.vibrate({ duration: 1200 }).catch(() => {})
}
