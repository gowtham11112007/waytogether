import { useEffect, useRef, useState } from 'react'
import { App as NativeApp } from '@capacitor/app'
import { ArrowLeft, Bike, Car, ChevronRight, Clock, Flag, Gauge, Layers, Loader2, LocateFixed, MapPin, Navigation, Route as RouteIcon, ScanLine, Search, Timer, Users, X } from 'lucide-react'
import MapView from '../components/MapView'
import { Avatar, ModalSheet, PrimaryButton } from '../components/ui'
import QRScanner from '../components/QRScanner'
import SearchView from '../components/SearchView'
import { formatDuration, formatKm, haversine } from '../lib/geo'
import { getRoute, placeName, searchPlaces } from '../lib/places'
import { isValidCode, loadHistory, normalizeCode } from '../lib/profile'
import { setSetting, useSettings } from '../lib/settings'
import { lookupTrip } from '../lib/realtime'
import { useTrip } from '../state/TripContext'

function LocationBanner({ loc }) {
  if (loc.status === 'ok' || loc.status === 'starting') return null
  return (
    <div className="pointer-events-auto flex items-center gap-3 rounded-2xl bg-white p-3 shadow-[0_8px_24px_rgba(17,24,39,0.16)]">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
        <LocateFixed size={20} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[14px] font-bold">Location is off</div>
        <div className="text-[12.5px] font-medium text-ink-3">WayTogether needs it to show you and share with friends.</div>
      </div>
      <button onClick={loc.retry} className="rounded-full bg-brand px-3.5 py-2 text-[13px] font-bold text-white">Turn on</button>
    </div>
  )
}

function PlaceSheet({ place, route, routeState, canCreate, onCreate, onClose }) {
  const [name, setName] = useState(`${place.name} trip`)
  const [type, setType] = useState('Bike')
  return (
    <section className="animate-fade-up absolute inset-x-0 bottom-0 z-[1100] rounded-t-[28px] bg-white px-5 pb-safe pt-2 shadow-[0_-8px_30px_rgba(17,24,39,0.16)]">
      <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-gray-300" />
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-[22px] font-extrabold tracking-tight">{place.name}</h2>
          <p className="truncate text-[13.5px] font-medium text-ink-3">{place.area}</p>
        </div>
        <button onClick={onClose} aria-label="Close" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-canvas text-ink-2">
          <X size={20} />
        </button>
      </div>

      <div className="mt-3 flex items-center gap-2 text-[15px] font-bold">
        {routeState === 'loading' && (
          <span className="flex items-center gap-2 text-ink-3">
            <Loader2 size={16} className="animate-spin" /> Finding the best route…
          </span>
        )}
        {routeState === 'ok' && route && (
          <>
            <span className="text-ok">{formatDuration(route.duration)}</span>
            <span className="text-ink-3">· {formatKm(route.distance)}</span>
          </>
        )}
        {routeState === 'error' && <span className="text-[13.5px] font-semibold text-amber-700">Couldn’t load a route. You can still start the trip.</span>}
        {routeState === 'nolocation' && <span className="text-[13.5px] font-semibold text-ink-3">Waiting for your location…</span>}
      </div>

      <label className="mt-4 block">
        <span className="text-[12px] font-bold text-ink-3">Trip name</span>
        <input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 h-12 w-full rounded-xl border border-line px-3.5 text-[15px] font-semibold outline-none focus:border-brand focus:ring-4 focus:ring-blue-100" />
      </label>
      <div className="mt-3 grid grid-cols-3 gap-2" role="radiogroup" aria-label="Trip type">
        {[
          ['Bike', Bike],
          ['Car', Car],
          ['Mixed', Users],
        ].map(([t, Icon]) => (
          <button
            key={t}
            role="radio"
            aria-checked={type === t}
            onClick={() => setType(t)}
            className={`flex h-11 items-center justify-center gap-2 rounded-full border text-[14px] font-bold ${type === t ? 'border-brand bg-blue-50 text-brand' : 'border-line text-ink-2'}`}
          >
            <Icon size={18} /> {t}
          </button>
        ))}
      </div>
      <PrimaryButton className="mt-4" disabled={!canCreate || !name.trim()} onClick={() => onCreate({ name: name.trim(), type })}>
        <Navigation size={19} fill="currentColor" /> Create group trip
      </PrimaryButton>
    </section>
  )
}

function JoinSheet({ open, onClose, myLatLng, onJoin }) {
  const [code, setCode] = useState('')
  const [state, setState] = useState('idle') // idle | looking | found | missing
  const [found, setFound] = useState(null)
  const [scanning, setScanning] = useState(false)

  useEffect(() => {
    if (!open) {
      setCode('')
      setState('idle')
      setFound(null)
    }
  }, [open])

  useEffect(() => {
    if (!isValidCode(code)) {
      setState('idle')
      setFound(null)
      return
    }
    let alive = true
    setState('looking')
    lookupTrip(code).then((r) => {
      if (!alive) return
      setFound(r)
      setState(r ? 'found' : 'missing')
    })
    return () => {
      alive = false
    }
  }, [code])

  const nearest = found && myLatLng ? Math.min(...found.riders.filter((r) => r.lat != null).map((r) => haversine(myLatLng, [r.lat, r.lng]))) : null

  return (
    <>
      <ModalSheet open={open && !scanning} onClose={onClose} title="Join a trip" subtitle="Enter the code your trip leader shared.">
        <label htmlFor="join-code" className="sr-only">Trip code</label>
        <input
          id="join-code"
          value={code}
          onChange={(e) => setCode(normalizeCode(e.target.value))}
          placeholder="WAY-0000"
          autoComplete="off"
          autoCapitalize="characters"
          inputMode="text"
          className="h-16 w-full rounded-2xl border-2 border-line text-center font-mono text-[28px] font-bold tracking-[0.16em] outline-none placeholder:text-gray-300 focus:border-brand focus:ring-4 focus:ring-blue-100"
        />
        <button onClick={() => setScanning(true)} className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-full border border-line text-[15px] font-bold">
          <ScanLine size={19} /> Scan QR code
        </button>

        <div className="min-h-[120px] py-3">
          {state === 'looking' && (
            <div className="flex items-center justify-center gap-2 py-8 text-[14px] font-semibold text-ink-3">
              <Loader2 size={18} className="animate-spin" /> Looking for {code}…
            </div>
          )}
          {state === 'missing' && (
            <p className="py-6 text-center text-[14px] font-semibold text-ink-2">
              No one is sharing on <b>{code}</b> right now.
              <br />
              <span className="font-medium text-ink-3">Check the code, or ask the leader to open WayTogether.</span>
            </p>
          )}
          {state === 'found' && found && (
            <div className="animate-fade-up rounded-2xl border border-line p-4">
              <div className="text-[18px] font-extrabold tracking-tight">{found.trip.name}</div>
              <div className="mt-0.5 flex items-center gap-1.5 text-[13.5px] font-medium text-ink-3">
                <MapPin size={14} /> To {found.trip.dest?.name} · {found.trip.type}
              </div>
              <div className="mt-3 flex items-center gap-3">
                <div className="flex -space-x-2">
                  {found.riders.slice(0, 5).map((r) => (
                    <span key={r.id} className="rounded-full ring-2 ring-white">
                      <Avatar member={r} size={30} ring={false} badge={false} />
                    </span>
                  ))}
                </div>
                <div className="min-w-0 flex-1 text-[13px] font-semibold text-ink-2">
                  {found.trip.leaderName} (leader) · {found.riders.length} sharing now
                  {nearest != null && Number.isFinite(nearest) && <span className="block text-ink-3">Group is {formatKm(nearest)} from you</span>}
                </div>
              </div>
            </div>
          )}
        </div>
        <PrimaryButton disabled={state !== 'found'} onClick={() => onJoin(code, found.trip)}>
          Join trip
        </PrimaryButton>
        <p className="mt-2 text-center text-[12px] font-medium text-ink-3">Your location is shared only with this trip, until you leave it.</p>
      </ModalSheet>
      {scanning && (
        <QRScanner
          onClose={() => setScanning(false)}
          onCode={(c) => {
            setScanning(false)
            setCode(c)
          }}
        />
      )}
    </>
  )
}

function tripDuration(h) {
  const m = Math.max(1, Math.round((h.endedAt - h.startedAt) / 60000))
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)}h ${m % 60}m`
}

export default function HomeScreen({ loc, profile, onEditProfile }) {
  const t = useTrip()
  const [view, setView] = useState('home') // home | search | place
  const [place, setPlace] = useState(null)
  const [route, setRoute] = useState(null)
  const [routeState, setRouteState] = useState('idle')
  const [joinOpen, setJoinOpen] = useState(false)
  const [focus, setFocus] = useState(null)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [shownTrip, setShownTrip] = useState(null)
  const settings = useSettings()
  const history = loadHistory()
  const myLatLng = loc.fix?.latlng || null
  const hasFix = !!myLatLng

  // Center on you once the first GPS fix arrives, like Google Maps on launch.
  const centered = useRef(false)
  useEffect(() => {
    if (!myLatLng || centered.current) return
    centered.current = true
    setFocus({ type: 'point', latlng: myLatLng, zoom: 15.5, n: Date.now() })
  }, [myLatLng])

  // A trip just finished: show its summary.
  useEffect(() => {
    if (t.summary) setShownTrip(t.summary)
  }, [t.summary])

  // Android back: close search / route preview / join first, then leave the app.
  const layers = useRef({})
  layers.current = { view, joinOpen }
  useEffect(() => {
    const onBack = () => {
      const l = layers.current
      if (l.joinOpen) setJoinOpen(false)
      else if (l.view !== 'home') {
        setView('home')
        setPlace(null)
        setRoute(null)
      } else NativeApp.exitApp().catch(() => {})
    }
    window.addEventListener('convoya:home-back', onBack)
    return () => window.removeEventListener('convoya:home-back', onBack)
  }, [])

  // Route preview from where you are to the place you picked.
  useEffect(() => {
    if (!place) return
    if (!hasFix) {
      setRouteState('nolocation')
      setFocus({ type: 'fit', points: [place.latlng], n: Date.now() })
      return
    }
    let alive = true
    setRoute(null)
    setRouteState('loading')
    getRoute(myLatLng, place.latlng)
      .then((r) => {
        if (!alive) return
        setRoute(r)
        setRouteState('ok')
        setFocus({ type: 'fit', points: r.coords.filter((_, i) => i % 5 === 0).concat([place.latlng]), padding: { top: 90, bottom: 430 }, n: Date.now() })
      })
      .catch(() => {
        if (!alive) return
        setRouteState('error')
        setFocus({ type: 'fit', points: [myLatLng, place.latlng], padding: { top: 90, bottom: 430 }, n: Date.now() })
      })
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [place, hasFix])

  const create = async ({ name, type }) => {
    const startName = await placeName(myLatLng)
    t.createTrip({
      name,
      type,
      dest: { name: place.name, area: place.area, latlng: place.latlng },
      start: { name: startName, latlng: myLatLng },
    })
  }

  const me = loc.fix ? { latlng: loc.fix.latlng, heading: loc.fix.heading, accuracy: loc.fix.accuracy } : null

  return (
    <div className="relative h-full w-full overflow-hidden bg-canvas">
      <div className="absolute inset-0">
        <MapView
          me={me}
          route={view === 'place' ? route : null}
          dest={view === 'place' ? place : null}
          focus={focus}
          mode="free"
          padding={{ top: 90, bottom: view === 'place' ? 430 : 300 }}
          styleKey={settings.mapStyle}
        />
      </div>

      {view !== 'search' && (
        <div className="pointer-events-none absolute inset-x-3 top-0 z-[1100] flex flex-col gap-2 pt-safe">
          {view === 'home' ? (
            <div className="pointer-events-auto flex h-14 items-center gap-2 rounded-full bg-white pl-4 pr-1.5 shadow-[0_4px_16px_rgba(17,24,39,0.16)]">
              <button onClick={() => setView('search')} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                <Search size={21} className="shrink-0 text-ink-2" />
                <span className="truncate text-[16px] font-semibold text-ink-3">Where to?</span>
              </button>
              <button onClick={onEditProfile} aria-label="Your profile" className="shrink-0 rounded-full">
                <Avatar member={profile} size={42} ring={false} badge={false} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                setView('search')
                setPlace(null)
              }}
              className="pointer-events-auto flex h-14 items-center gap-3 rounded-full bg-white px-4 text-left shadow-[0_4px_16px_rgba(17,24,39,0.16)]"
            >
              <ArrowLeft size={21} className="shrink-0 text-ink-2" />
              <span className="truncate text-[16px] font-bold">{place?.name}</span>
            </button>
          )}
          <LocationBanner loc={loc} />
        </div>
      )}

      {view === 'home' && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[1000] flex flex-col">
          <div className="pointer-events-auto mb-3 mr-4 flex flex-col items-end gap-2.5 self-end">
            <button
              onClick={() => setSetting('mapStyle', settings.mapStyle === 'light' ? 'satellite' : settings.mapStyle === 'satellite' ? 'dark' : 'light')}
              aria-label="Change map style"
              className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-ink-2 shadow-[0_4px_12px_rgba(17,24,39,0.18)] active:scale-95"
            >
              <Layers size={21} />
            </button>
            <button
              onClick={() => myLatLng && setFocus({ type: 'point', latlng: myLatLng, zoom: 16, n: Date.now() })}
              aria-label="Center on me"
              className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-brand shadow-[0_4px_12px_rgba(17,24,39,0.18)] active:scale-95"
            >
              <LocateFixed size={22} />
            </button>
          </div>
          <section className="pointer-events-auto rounded-t-[28px] bg-white px-5 pb-safe pt-2 shadow-[0_-8px_30px_rgba(17,24,39,0.14)]">
            <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-gray-300" />
            <h2 className="text-[19px] font-extrabold tracking-tight">Ride together, {profile.name.split(' ')[0]}</h2>
            <p className="mt-0.5 text-[13.5px] font-medium text-ink-3">See your friends live on one map, all trip long.</p>
            <div className="mt-4 grid grid-cols-2 gap-2.5">
              <button onClick={() => setView('search')} className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-brand text-[15.5px] font-bold text-white shadow-[0_8px_20px_rgba(26,115,232,0.3)] active:scale-[0.98]">
                <Navigation size={19} fill="currentColor" /> Start a trip
              </button>
              <button onClick={() => setJoinOpen(true)} className="flex h-14 items-center justify-center gap-2 rounded-2xl border border-line text-[15.5px] font-bold active:scale-[0.98]">
                <Users size={19} /> Join trip
              </button>
            </div>
            {history.length > 0 && (
              <button onClick={() => setHistoryOpen(true)} className="mt-3 flex w-full items-center gap-3 rounded-2xl bg-canvas px-3.5 py-3 text-left active:scale-[0.99]">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-ink-2"><RouteIcon size={17} /></span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-bold">Last trip: {history[0].to}</span>
                  <span className="block truncate text-[12.5px] font-medium text-ink-3">
                    {formatKm(history[0].distance)} · {tripDuration(history[0])} · {history.length} {history.length === 1 ? 'trip' : 'trips'} total
                  </span>
                </span>
                <ChevronRight size={18} className="text-ink-3" />
              </button>
            )}
            <div className="mt-3 flex items-center justify-center gap-1.5 text-[12px] font-semibold text-ink-3">
              <Clock size={13} /> Location is shared only while you’re in a trip
            </div>
          </section>
        </div>
      )}

      <ModalSheet open={historyOpen} onClose={() => setHistoryOpen(false)} title="Past trips" subtitle="Saved on this phone">
        <ul className="no-scrollbar -mx-1 max-h-[60vh] overflow-y-auto px-1">
          {history.map((h) => (
            <li key={h.id}>
              <button
                onClick={() => {
                  setHistoryOpen(false)
                  setShownTrip(h)
                }}
                className="flex w-full items-center gap-3 border-b border-line py-3 text-left last:border-0"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-canvas text-ink-2"><Flag size={18} /></span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-bold">{h.name}</span>
                  <span className="block truncate text-[12.5px] font-medium text-ink-3">
                    {formatKm(h.distance)} · {tripDuration(h)} · {h.riders.length} riders
                  </span>
                </span>
                <span className="shrink-0 text-[12px] font-semibold text-ink-3">{new Date(h.endedAt).toLocaleDateString([], { day: 'numeric', month: 'short' })}</span>
              </button>
            </li>
          ))}
        </ul>
      </ModalSheet>

      <ModalSheet
        open={!!shownTrip}
        onClose={() => {
          setShownTrip(null)
          t.clearSummary()
        }}
        title={t.summary && shownTrip?.id === t.summary.id ? 'Trip complete' : shownTrip?.name}
        subtitle={shownTrip ? `${shownTrip.from || 'Start'} → ${shownTrip.to} · ${new Date(shownTrip.endedAt).toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' })}` : ''}
      >
        {shownTrip && (
          <div className="pb-2">
            <div className="grid grid-cols-3 gap-2.5">
              {[
                [RouteIcon, formatKm(shownTrip.distance), 'you rode'],
                [Timer, tripDuration(shownTrip), 'on the road'],
                [Gauge, `${shownTrip.maxSpeed} km/h`, 'top speed'],
              ].map(([Icon, v, k]) => (
                <div key={k} className="flex flex-col items-center gap-1 rounded-2xl bg-canvas py-4">
                  <Icon size={18} className="text-brand" />
                  <span className="text-[17px] font-extrabold">{v}</span>
                  <span className="text-[11.5px] font-semibold text-ink-3">{k}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-2xl border border-line p-4">
              <div className="text-[13px] font-bold uppercase tracking-wide text-ink-3">Riders</div>
              <div className="mt-1 text-[15px] font-semibold">{shownTrip.riders.join(', ')}</div>
              <div className="mt-3 text-[13px] font-medium text-ink-3">
                {shownTrip.alerts} {shownTrip.alerts === 1 ? 'alert' : 'alerts'} · {shownTrip.messages} {shownTrip.messages === 1 ? 'message' : 'messages'} · code {shownTrip.code}
              </div>
            </div>
            <PrimaryButton
              className="mt-4"
              onClick={() => {
                setShownTrip(null)
                t.clearSummary()
              }}
            >
              Done
            </PrimaryButton>
          </div>
        )}
      </ModalSheet>

      {view === 'search' && (
        <SearchView
          near={myLatLng}
          onClose={() => setView('home')}
          onPick={(p) => {
            setPlace(p)
            setView('place')
          }}
        />
      )}

      {view === 'place' && place && (
        <PlaceSheet
          key={place.id}
          place={place}
          route={route}
          routeState={routeState}
          canCreate={hasFix}
          onCreate={create}
          onClose={() => {
            setView('home')
            setPlace(null)
            setRoute(null)
            if (myLatLng) setFocus({ type: 'point', latlng: myLatLng, zoom: 15.5, n: Date.now() })
          }}
        />
      )}

      <JoinSheet open={joinOpen} onClose={() => setJoinOpen(false)} myLatLng={myLatLng} onJoin={(code, trip) => t.joinTrip(code, trip)} />
    </div>
  )
}
