import { useCallback, useEffect, useRef, useState } from 'react'
import { Capacitor } from '@capacitor/core'
import { App as NativeApp } from '@capacitor/app'
import { StatusBar, Style } from '@capacitor/status-bar'
import { usePresence } from './components/ui'
import { useBattery, useMyLocation } from './lib/location'
import { currentGoogleProfile, signOut } from './lib/auth'
import { clearInvite, pendingInvite, watchCodeFromUrl } from './lib/invite'
import { loadActiveTrip, loadProfile, saveActiveTrip, saveProfile } from './lib/profile'
import { useDarkTheme } from './lib/settings'
import HomeScreen from './screens/HomeScreen'
import SettingsScreen from './screens/SettingsScreen'
import Setup from './screens/Setup'
import TripScreen from './screens/TripScreen'
import WatchScreen from './screens/WatchScreen'
import UpdateBanner from './components/UpdateBanner'
import { TripProvider, useTrip } from './state/TripContext'

function Screens({ loc, profile, onOpenSettings, invite, onInviteUsed }) {
  const t = useTrip()
  // Opened an invite link while already riding: stay in the current trip.
  useEffect(() => {
    if (!t.active || !invite) return
    if (invite !== t.code) t.notify({ level: 'info', title: 'You’re already in a trip', body: `Leave it first to join ${invite}.` })
    onInviteUsed()
  }, [t.active, t.code, invite, onInviteUsed, t.notify])
  // Keyed wrappers: switching between home and a trip plays a short fade-in.
  return t.active ? (
    <div key="trip" className="animate-screen-in h-full w-full">
      <TripScreen loc={loc} onOpenSettings={onOpenSettings} />
    </div>
  ) : (
    <div key="home" className="animate-screen-in h-full w-full">
      <HomeScreen loc={loc} profile={profile} onEditProfile={onOpenSettings} invite={invite} onInviteUsed={onInviteUsed} />
    </div>
  )
}

// Settings slides in over whichever screen is showing. Signing out leaves a trip properly first,
// so friends see "left the trip" rather than "offline".
function SettingsLayer({ open, profile, onClose, onSaveProfile, onSignedOut }) {
  const t = useTrip()
  const { mounted, leaving } = usePresence(open, 260)
  if (!mounted) return null
  return (
    <SettingsScreen
      profile={profile}
      leaving={leaving}
      onClose={onClose}
      onSaveProfile={onSaveProfile}
      onSignOut={async () => {
        if (t.active) t.leaveTrip()
        if (profile.google) await signOut()
        onSignedOut()
      }}
    />
  )
}

// A view-only live link (?watch=WAY-1234) for family: no sign-in, no location of their own.
const watchCode = watchCodeFromUrl()

export default function App() {
  const [profile, setProfile] = useState(loadProfile)
  const [inTrip, setInTrip] = useState(() => !!loadActiveTrip())
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [invite, setInvite] = useState(pendingInvite) // trip code from an invite link
  const inviteUsed = useCallback(() => {
    clearInvite()
    setInvite(null)
  }, [])
  // During a trip on Android, location keeps flowing with the screen off (foreground service).
  const loc = useMyLocation({ background: inTrip, enabled: !!profile && !watchCode })
  const battery = useBattery()
  const inTripRef = useRef(inTrip)
  inTripRef.current = inTrip
  const settingsRef = useRef(settingsOpen)
  settingsRef.current = settingsOpen

  // Light or dark theme (Settings → Appearance, or the phone's setting): the page, the browser bar and Android's status bar.
  const dark = useDarkTheme()
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light'
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#161B22' : '#ffffff')
    if (Capacitor.isNativePlatform()) StatusBar.setStyle({ style: dark ? Style.Dark : Style.Light }).catch(() => {})
  }, [dark])

  // Coming back from Google (web redirect) or an existing Google session: use its name and photo.
  useEffect(() => {
    currentGoogleProfile().then((g) => {
      if (!g) return
      setProfile((p) => {
        if (p && !p.google) return p
        // Keep what they chose here: their own name and face.
        return saveProfile({ ...g, name: p?.google && p.name ? p.name : g.name, avatar: p?.avatar, useAvatar: p?.useAvatar })
      })
    })
  }, [])

  // Android back button: close Settings first, then let the screen underneath handle it.
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return
    const sub = NativeApp.addListener('backButton', () => {
      if (settingsRef.current) setSettingsOpen(false)
      else if (inTripRef.current) window.dispatchEvent(new Event('convoya:back'))
      else window.dispatchEvent(new Event('convoya:home-back'))
    })
    return () => {
      sub.then((h) => h.remove())
    }
  }, [])

  if (watchCode) {
    return (
      <div className="app-shell">
        <div className="app-frame">
          <WatchScreen code={watchCode} />
        </div>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <div className="app-frame">
        <UpdateBanner inTrip={inTrip} />
        {!profile ? (
          <Setup onDone={(p) => setProfile(saveProfile(p))} />
        ) : (
          <TripProvider profile={profile} fix={loc.fix} battery={battery} onActiveChange={setInTrip}>
            <Screens loc={loc} profile={profile} onOpenSettings={() => setSettingsOpen(true)} invite={invite} onInviteUsed={inviteUsed} />
            <SettingsLayer
              open={settingsOpen}
              profile={profile}
              onClose={() => setSettingsOpen(false)}
              onSaveProfile={(p) => setProfile(saveProfile(p))}
              onSignedOut={() => {
                setSettingsOpen(false)
                saveActiveTrip(null)
                saveProfile(null)
                setProfile(null)
              }}
            />
          </TripProvider>
        )}
      </div>
    </div>
  )
}
