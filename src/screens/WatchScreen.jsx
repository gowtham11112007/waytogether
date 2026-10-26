import { useEffect, useMemo, useState } from 'react'
import { Eye, Flag, Loader2, Navigation2, UserPlus } from 'lucide-react'
import MapView from '../components/MapView'
import { Avatar, Logo, PrimaryButton, RoleTag, StatusText } from '../components/ui'
import { googleMapsDirections, openExternal } from '../lib/external'
import { formatClock, formatKm, formatSpeed, nearestOnRoute, timeAgo } from '../lib/geo'
import { useMapStyle, useSettings } from '../lib/settings'
import { getRoute } from '../lib/places'
import { joinChannel } from '../lib/realtime'

const OFFLINE_AFTER = 45000

// View-only live map for family at home (?watch=WAY-1234). No profile and no location of their own;
// the riders' phones don't see watchers at all.
export default function WatchScreen({ code }) {
  const [riders, setRiders] = useState({})
  const [trip, setTrip] = useState(null)
  const [conn, setConn] = useState('connecting')
  const [ended, setEnded] = useState(null)
  const [route, setRoute] = useState(null)
  const [now, setNow] = useState(Date.now())
  const [waited, setWaited] = useState(false)
  const [selectedId, setSelectedId] = useState(null)
  const [focus, setFocus] = useState(null)
  const [mode, setMode] = useState('group')
  const settings = useSettings()
  const mapStyle = useMapStyle()

  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 5000)
    const wait = setTimeout(() => setWaited(true), 9000)
    return () => {
      clearInterval(tick)
      clearTimeout(wait)
    }
  }, [])

  useEffect(() => {
    const ch = joinChannel(code, null, {
      onStatus: setConn,
      onSync: (all) => {
        setRiders(all)
        const metas = Object.values(all).map((p) => p.trip).filter(Boolean)
        if (metas.length) {
          const best = metas.reduce((a, b) => ((b.rev || 0) > (a.rev || 0) ? b : a))
          setTrip((cur) => (!cur || (best.rev || 0) >= (cur.rev || 0) ? best : cur))
        }
      },
      onEvent: (evt) => {
        if (evt.type === 'trip' && evt.meta) setTrip((cur) => (!cur || (evt.meta.rev || 0) > (cur.rev || 0) ? evt.meta : cur))
        else if (evt.type === 'end') setEnded(evt.byName || 'The leader')
      },
    })
    return () => {
      ch.leave()
    }
  }, [code])

  const routeKey = trip ? `${trip.start?.latlng}|${trip.dest?.latlng}` : ''
  useEffect(() => {
    if (!trip?.start?.latlng || !trip?.dest?.latlng) return
    let alive = true
    getRoute(trip.start.latlng, trip.dest.latlng)
      .then((r) => alive && setRoute(r))
      .catch(() => {})
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeKey])

  const members = useMemo(
    () =>
      Object.entries(riders)
        .map(([id, p]) => {
          const latlng = p.lat != null && p.lng != null ? [p.lat, p.lng] : null
          const stale = now - (p.updatedAt || 0) > OFFLINE_AFTER
          const along = route && latlng ? nearestOnRoute(route, latlng).along : null
          return {
            id,
            name: p.name || 'Rider',
            photo: p.photo || null,
            avatar: p.avatar || null,
            role: p.role || 'member',
            latlng,
            speed: p.speed || 0,
            heading: p.heading || 0,
            status: p.status || 'riding',
            updatedAt: p.updatedAt || now,
            toGo: along != null ? Math.max(0, route.total - along) : null,
            state: p.status === 'sos' ? 'sos' : stale ? 'offline' : p.status || 'riding',
          }
        })
        // Leader first, then whoever is furthest along.
        .sort((a, b) => (b.role === 'leader') - (a.role === 'leader') || (a.toGo ?? Infinity) - (b.toGo ?? Infinity)),
    [riders, now, route],
  )

  // Arrival time from whoever is furthest along.
  const live = members.filter((m) => m.state !== 'offline' && m.toGo != null)
  const toGo = live.length ? Math.min(...live.map((m) => m.toGo)) : null
  const eta = route && toGo != null ? now + (toGo / route.total) * route.duration * 1000 : null
  const emergencies = members.filter((m) => m.state === 'sos')

  const show = (m) => {
    if (!m) return
    setSelectedId(m.id)
    if (m.latlng) {
      setMode('free')
      setFocus({ type: 'point', latlng: m.latlng, zoom: 15.5, n: Date.now() })
    }
  }

  return (
    <div className="animate-screen-in relative h-full w-full overflow-hidden bg-canvas">
      <div className="absolute inset-0">
        <MapView
          friends={members}
          route={route}
          dest={trip?.dest}
          start={trip?.start}
          regroup={trip?.regroup}
          selectedId={selectedId}
          onSelect={(id) => show(members.find((m) => m.id === id))}
          focus={focus}
          mode={mode}
          onUserMove={() => setMode('free')}
          padding={{ top: 96 + Math.min(emergencies.length, 2) * 72, bottom: 320 }}
          styleKey={mapStyle}
          places={settings.mapPlaces}
          buildings={settings.map3d}
        />
      </div>

      <div className="pointer-events-none absolute inset-x-3 top-0 z-[1100] flex flex-col gap-2 pt-safe">
        <div className="pointer-events-auto flex h-14 items-center gap-3 rounded-full bg-white pl-2 pr-4 shadow-[0_4px_16px_rgba(17,24,39,0.16)]">
          <Logo size={38} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-[15.5px] font-extrabold leading-5">{trip?.dest?.name ? `To ${trip.dest.name}` : `Trip ${code}`}</div>
            <div className="truncate text-[12.5px] font-semibold text-ink-3">{trip?.name ? `${trip.name} · live view` : 'Live view'}</div>
          </div>
          <span className={`flex shrink-0 items-center gap-1.5 text-[12.5px] font-bold ${conn === 'live' ? 'text-ok' : 'text-amber-600'}`}>
            <span className={`h-2 w-2 rounded-full ${conn === 'live' ? 'animate-live bg-ok' : 'bg-warn'}`} /> {conn === 'live' ? 'Live' : 'Connecting'}
          </span>
        </div>
        {emergencies.slice(0, 2).map((m) => (
          <div key={m.id} role="alert" className="animate-slide-down pointer-events-auto flex items-center gap-3 rounded-2xl bg-[#B3121F] p-3 pr-2 text-white shadow-[0_10px_30px_rgba(179,18,31,0.4)]">
            <span className="relative flex shrink-0">
              <span className="absolute inset-0 animate-ping rounded-full bg-white/40" />
              <Avatar member={m} size={40} ring={false} badge={false} />
            </span>
            <button onClick={() => show(m)} className="min-w-0 flex-1 text-left">
              <span className="block truncate text-[14.5px] font-extrabold leading-5">{m.name} sent an SOS</span>
              <span className="block truncate text-[12.5px] font-semibold text-white/80">The convoy has been alerted · {timeAgo(now - m.updatedAt)}</span>
            </button>
            {m.latlng && (
              <button onClick={() => openExternal(googleMapsDirections(m.latlng))} className="flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-[#fff] px-3.5 text-[13.5px] font-extrabold text-[#B3121F]">
                <Navigation2 size={16} fill="currentColor" /> Go
              </button>
            )}
          </div>
        ))}
      </div>

      <section className="animate-sheet-in absolute inset-x-0 bottom-0 z-[1000] flex max-h-[52%] flex-col rounded-t-[28px] bg-white px-5 pb-safe pt-2 shadow-[0_-8px_30px_rgba(17,24,39,0.14)]">
        <div className="mx-auto mb-3 h-1.5 w-10 shrink-0 rounded-full bg-gray-300" />
        <div className="flex shrink-0 items-center gap-2">
          <span className="flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-[12px] font-bold text-brand">
            <Eye size={14} /> View only
          </span>
          <span className="text-[12.5px] font-semibold text-ink-3">Your location isn’t shared</span>
        </div>

        {!members.length ? (
          <div className="flex flex-col items-center py-7 text-center">
            {!waited ? (
              <span className="flex items-center gap-2 text-[14px] font-semibold text-ink-3">
                <Loader2 size={18} className="animate-spin" /> Connecting to {code}…
              </span>
            ) : (
              <>
                <span className="text-[16px] font-extrabold">No one is sharing on {code} right now</span>
                <span className="mt-1 max-w-[290px] text-[13.5px] font-medium text-ink-3">The ride may not have started yet. This page updates by itself as soon as someone is riding.</span>
              </>
            )}
          </div>
        ) : (
          <>
            <div className="mt-3 shrink-0">
              <div className="text-[19px] font-extrabold tracking-tight">
                {eta ? `Arriving around ${formatClock(eta)}` : `${members.length} ${members.length === 1 ? 'rider' : 'riders'} on the way`}
              </div>
              {toGo != null && route && (
                <>
                  <div className="mt-0.5 text-[13px] font-medium text-ink-3">
                    {formatKm(toGo)} to go · {members.length} {members.length === 1 ? 'rider' : 'riders'}
                  </div>
                  <div className="mt-2.5 h-2 rounded-full bg-canvas">
                    <div className="h-2 rounded-full bg-brand transition-[width] duration-700" style={{ width: `${Math.round(Math.min(1, Math.max(0, 1 - toGo / route.total)) * 100)}%` }} />
                  </div>
                </>
              )}
            </div>
            <ul className="no-scrollbar -mx-1 mt-2 min-h-0 flex-1 overflow-y-auto px-1">
              {members.map((m, i) => (
                <li key={m.id} className="animate-rise" style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}>
                  <button onClick={() => show(m)} className={`flex w-full items-center gap-3 py-2.5 text-left ${m.state === 'offline' ? 'opacity-70' : ''}`}>
                    <Avatar member={m} size={42} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="truncate text-[15px] font-bold">{m.name}</span>
                        <RoleTag role={m.role} />
                      </span>
                      <span className="block truncate text-[12.5px] font-medium text-ink-3">
                        <StatusText state={m.state} />
                        {m.speed > 3 && m.state !== 'offline' && ` · ${formatSpeed(m.speed)}`} · {timeAgo(now - m.updatedAt)}
                      </span>
                    </span>
                    {m.toGo != null && <span className="shrink-0 text-[13px] font-extrabold tabular-nums">{formatKm(m.toGo)}</span>}
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}

        <a href={`${window.location.pathname}?join=${code}`} className="mt-3 flex h-12 shrink-0 items-center justify-center gap-2 rounded-2xl border border-line text-[14.5px] font-bold text-brand">
          <UserPlus size={18} /> Ride along: join this trip
        </a>
      </section>

      {ended && (
        <div className="animate-backdrop-in absolute inset-0 z-[1700] flex items-center justify-center bg-black/40 p-6">
          <div className="animate-pop w-full max-w-[340px] rounded-3xl bg-white p-6 text-center">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-50 text-ok">
              <Flag size={26} />
            </span>
            <div className="mt-3 text-[20px] font-extrabold">The ride has ended</div>
            <p className="mt-1 text-[14px] font-medium text-ink-3">
              {ended} ended the trip{trip?.dest?.name ? ` to ${trip.dest.name}` : ''}. Live sharing has stopped.
            </p>
            <PrimaryButton className="mt-5" onClick={() => window.location.assign(window.location.pathname)}>
              Open WayTogether
            </PrimaryButton>
          </div>
        </div>
      )}
    </div>
  )
}
