import { useEffect, useRef, useState } from 'react'
import { Capacitor } from '@capacitor/core'
import { App as NativeApp } from '@capacitor/app'
import { StatusBar, Style } from '@capacitor/status-bar'
import { ModalSheet, PrimaryButton } from './components/ui'
import { useBattery, useMyLocation } from './lib/location'
import { currentGoogleProfile, signOut } from './lib/auth'
import { loadActiveTrip, loadProfile, saveActiveTrip, saveProfile } from './lib/profile'
import HomeScreen from './screens/HomeScreen'
import Setup from './screens/Setup'
import UpdateBanner from './components/UpdateBanner'
import { VERSION_LABEL } from './lib/updates'
import TripScreen from './screens/TripScreen'
import { TripProvider, useTrip } from './state/TripContext'

function ProfileSheet({ open, profile, onClose, onSave, onSignOut }) {
  const [name, setName] = useState(profile?.name || '')
  useEffect(() => setName(profile?.name || ''), [profile, open])
  return (
    <ModalSheet open={open} onClose={onClose} title="Your profile" subtitle={profile?.email ? `Signed in with Google · ${profile.email}` : 'This is the name your friends see on the map.'}>
      <input
        value={name}
        onChange={(e) => setName(e.target.value.slice(0, 24))}
        aria-label="Your name"
        className="h-14 w-full rounded-2xl border border-line px-4 text-[17px] font-semibold outline-none focus:border-brand focus:ring-4 focus:ring-blue-100"
      />
      <PrimaryButton className="mt-3" disabled={name.trim().length < 2} onClick={() => onSave(name.trim())}>
        Save
      </PrimaryButton>
      <button onClick={onSignOut} className="mt-2 h-12 w-full rounded-2xl text-[15px] font-bold text-danger">
        {profile?.google ? 'Sign out' : 'Reset profile'}
      </button>
      <p className="pb-1 text-center text-[12px] font-semibold text-ink-3">WayTogether {VERSION_LABEL}</p>
    </ModalSheet>
  )
}

function Screens({ loc, profile, onEditProfile }) {
  const t = useTrip()
  return t.active ? <TripScreen loc={loc} /> : <HomeScreen loc={loc} profile={profile} onEditProfile={onEditProfile} />
}

export default function App() {
  const [profile, setProfile] = useState(loadProfile)
  const [inTrip, setInTrip] = useState(() => !!loadActiveTrip())
  const [editing, setEditing] = useState(false)
  // During a trip on Android, location keeps flowing with the screen off (foreground service).
  const loc = useMyLocation({ background: inTrip, enabled: !!profile })
  const battery = useBattery()
  const inTripRef = useRef(inTrip)
  inTripRef.current = inTrip

  // Coming back from Google (web redirect) or an existing Google session: use its name and photo.
  useEffect(() => {
    currentGoogleProfile().then((g) => {
      if (!g) return
      setProfile((p) => {
        if (p && !p.google) return p
        return saveProfile({ ...g, name: p?.google && p.name ? p.name : g.name })
      })
    })
  }, [])

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return
    StatusBar.setStyle({ style: Style.Light }).catch(() => {})
    const sub = NativeApp.addListener('backButton', () => {
      if (inTripRef.current) window.dispatchEvent(new Event('convoya:back'))
      else window.dispatchEvent(new Event('convoya:home-back'))
    })
    return () => {
      sub.then((h) => h.remove())
    }
  }, [])

  return (
    <div className="app-shell">
      <div className="app-frame">
        <UpdateBanner inTrip={inTrip} />
        {!profile ? (
          <Setup onDone={(p) => setProfile(saveProfile(p))} />
        ) : (
          <TripProvider profile={profile} fix={loc.fix} battery={battery} onActiveChange={setInTrip}>
            <Screens loc={loc} profile={profile} onEditProfile={() => setEditing(true)} />
            <ProfileSheet
              open={editing}
              profile={profile}
              onClose={() => setEditing(false)}
              onSave={(name) => {
                setProfile(saveProfile({ ...profile, name }))
                setEditing(false)
              }}
              onSignOut={async () => {
                setEditing(false)
                if (profile.google) await signOut()
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
