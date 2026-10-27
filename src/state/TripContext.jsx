import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { Flag, MapPinned, Music2, Settings2, ShieldQuestion, UserMinus } from 'lucide-react'
import { PLACE_KINDS } from '../data/placeKinds'
import { CHECKIN_OPTIONS, STATUS, rulesFor } from '../data/trip'
import { chime, playSiren } from '../lib/alarm'
import { formatDistance, formatKm, haversine, nearestOnRoute } from '../lib/geo'
import { appInBackground, askNotificationPermission, haptic, systemNotify } from '../lib/notify'
import { getRoute } from '../lib/places'
import { addHistory, clearChat, loadActiveTrip, loadChat, newId, newTripCode, saveActiveTrip, saveChat } from '../lib/profile'
import { joinChannel } from '../lib/realtime'
import { getSettings } from '../lib/settings'
import { speak } from '../lib/speech'

const OFFLINE_AFTER = 45000 // no update for 45 s → offline
const TRACK_EVERY = 3000 // share position at most every 3 s…
const HEARTBEAT = 15000 // …and at least every 15 s while standing still

// "Not moving" safety check. Browser-only test overrides: ?stillMin=0.5&checkinSec=20
const testParam = (k) => {
  try {
    return Number(new URLSearchParams(window.location.search).get(k)) || 0
  } catch {
    return 0
  }
}
const TEST_STILL_MS = testParam('stillMin') * 60000
const TEST_CHECKIN_MS = testParam('checkinSec') * 1000
const STILL_RADIUS = 40 // metres of GPS wobble that still counts as "not moving"
const AUTO_RESUME = 500 // riding 500 m away from a declared stop = back on the road
const RESUMABLE = new Set(['fuel', 'food', 'rest', 'waiting', 'regroup'])
const ARRIVE_RADIUS = 200 // within 200 m of the route counts as having reached it
const LEFT_GRACE = 30000 // ignore a rider's leftover position updates for 30 s after they leave

const TripCtx = createContext(null)
export const useTrip = () => useContext(TripCtx)

let alertSeq = 0
const makeAlert = (a) => ({ id: `${Date.now()}-${++alertSeq}`, at: Date.now(), ...a })

// "840 m from you", "right next to you"
const fromYou = (d) => (d < 50 ? 'right next to you' : `${formatDistance(d)} from you`)
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1)

function healthOf(members, rules) {
  const within = formatDistance(rules.spread)
  const placed = members.filter((m) => m.latlng)
  const n = placed.length
  const live = placed.filter((m) => m.state !== 'offline') // offline riders get their own alert
  const riding = live.filter((m) => m.arrived)
  const coming = live.filter((m) => !m.arrived && !m.you)
  const out = riding.filter((m) => !m.inPack).sort((a, b) => b.gap - a.gap)
  const together = riding.length - out.length
  const offline = n - live.length
  const base = { together, n }

  // Someone needs help: that's the only thing the convoy should be looking at.
  const alarm = members.find((m) => !m.you && (m.state === 'sos' || m.state === 'noreply'))
  if (alarm) {
    return {
      ...base,
      level: 'danger',
      memberId: alarm.id,
      title: alarm.state === 'sos' ? `${alarm.name} needs help` : `${alarm.name} isn’t responding`,
      line: alarm.fromMe != null ? `${cap(fromYou(alarm.fromMe))}. Tap to see them on the map.` : 'Showing their last known location.',
    }
  }
  if (n <= 1) return { ...base, level: 'info', title: 'Waiting for friends', line: 'Share the trip code so friends can join.' }

  const me = placed.find((m) => m.you)
  if (me && !me.arrived) return { ...base, level: 'info', title: 'You’re on the way', line: `The group is ${formatDistance(me.gap)} away.` }

  const onWay = coming.length === 1 ? `${coming[0].name} is on the way` : coming.length ? `${coming.length} friends are on the way` : ''
  const offlineNote = offline ? ` ${offline} offline.` : ''
  if (out.length === 0) {
    if (riding.length <= 1 && coming.length) {
      const c = coming[0]
      return { ...base, level: 'info', title: onWay, line: coming.length === 1 && c.fromMe != null ? `${cap(fromYou(c.fromMe))}, heading to the group.` : 'They show up here as they reach the route.' }
    }
    if (riding.length <= 1) return { ...base, level: 'warn', title: offline === 1 ? 'Your friend is offline' : 'Friends are offline', line: 'Showing their last known location.' }
    if (coming.length) return { ...base, level: 'ok', title: 'Group together', line: `${together} riders within ${within}. ${onWay}.${offlineNote}` }
    return { ...base, level: 'ok', title: offline ? 'Group together' : 'Everyone together', line: `All ${together} riders are within ${within}.${offlineNote}` }
  }
  // In a bigger group one straggler under 1.5 km is still "together"; in a small group anyone away counts.
  if (riding.length >= 4 && out.length === 1 && out[0].gap <= rules.behind) {
    return { ...base, level: 'ok', title: 'Everyone together', line: `${together} of ${riding.length} riders are within ${within}.` }
  }
  // With two riders "the group" is just the other person.
  const other = riding.length === 2 ? riding.find((m) => m !== out[0]) : null
  const away = (m) => {
    const km = formatKm(m.gap)
    if (other) return m.you ? `You’re ${km} from ${other.name}.` : `${m.name} is ${km} from ${other.you ? 'you' : other.name}.`
    return `${m.you ? 'You’re' : `${m.name} is`} ${km} ${m.ahead ? 'ahead of' : 'away from'} the group.`
  }
  if (out[0].gap > rules.behind * 2) return { ...base, level: 'danger', title: 'Convoy split', line: away(out[0]) }
  const behind = out.filter((m) => m.gap > rules.behind)
  const line =
    out.length === 1
      ? away(out[0])
      : behind.length
        ? `${behind.length} ${behind.length > 1 ? 'riders are' : 'rider is'} more than ${formatKm(rules.behind)} away.`
        : `${out.length} riders are drifting from the group.`
  return { ...base, level: 'warn', title: 'Convoy spreading', line }
}

const freshStats = () => ({ startedAt: Date.now(), distance: 0, maxSpeed: 0, last: null, riders: [], track: [] })

// Keep at most `max` points of a path, spread evenly (always keeping the last one).
function thin(points, max) {
  if (points.length <= max) return points
  const step = (points.length - 1) / (max - 1)
  return Array.from({ length: max }, (_, i) => points[Math.round(i * step)])
}

export function TripProvider({ profile, fix, battery, onActiveChange, children }) {
  const [active, setActiveState] = useState(loadActiveTrip) // { code, role, meta, status, stats }
  const [roster, setRoster] = useState({}) // id -> { payload, online, lastSeen }
  const [conn, setConn] = useState('idle')
  const [route, setRoute] = useState(null)
  const [routeError, setRouteError] = useState(null)
  const [alerts, setAlerts] = useState([])
  // Unread counts go by time, not by list length (the lists are capped, so lengths stop growing).
  const [seenAt, setSeenAt] = useState(0)
  const [messages, setMessages] = useState(() => (loadActiveTrip()?.code ? loadChat(loadActiveTrip().code) : []))
  const [chatSeenAt, setChatSeenAt] = useState(() => Date.now())
  const [toast, setToast] = useState(null)
  const [myStatus, setMyStatusState] = useState(() => loadActiveTrip()?.status || 'riding')
  const [ended, setEnded] = useState(() => (loadActiveTrip()?.endedBy ? { by: loadActiveTrip().endedBy } : null))
  const [summary, setSummary] = useState(null)
  const [now, setNow] = useState(Date.now())
  const [checkins, setCheckins] = useState({}) // memberId -> { id, askedAt, byName, byMe } waiting for a reply
  const [noReply, setNoReply] = useState({}) // memberId -> true when a check-in went unanswered
  const [checkinRequest, setCheckinRequest] = useState(null) // someone is asking ME "are you OK?"
  const still = useRef({}) // memberId -> { anchor, since } for the not-moving check
  const stopAnchor = useRef(null) // where I declared a stop (for auto "back on road")
  const repliedAt = useRef({}) // memberId -> when they answered a check-in (to skip the duplicate status alert)
  const arrivedRef = useRef(new Set()) // riders who have reached the route or the group at least once
  const departed = useRef({}) // memberId -> when they tapped Leave
  const fixRef = useRef(fix)
  fixRef.current = fix

  const channel = useRef(null)
  const rosterRef = useRef(roster)
  rosterRef.current = roster
  const activeRef = useRef(active)
  activeRef.current = active
  const flags = useRef({})
  const joinedAt = useRef(0)
  const lastTrack = useRef({ at: 0, latlng: null, status: null, rev: -1 })
  const stats = useRef(active?.stats || freshStats())

  // This trip's convoy rules: set by the leader for everyone (Trip options → Convoy rules), defaults by trip type.
  const rules = useMemo(() => ({ ...rulesFor(active?.meta?.type), ...(active?.meta?.rules || {}) }), [active?.meta?.type, active?.meta?.rules])
  const stillMs = TEST_STILL_MS || rules.stillMin * 60000 // 0 = don't check on stopped riders
  const checkinMs = TEST_CHECKIN_MS || rules.checkinMin * 60000

  const setActive = useCallback((next) => {
    activeRef.current = next
    saveActiveTrip(next)
    setActiveState(next)
  }, [])

  const notify = useCallback((t) => setToast({ id: `${Date.now()}${Math.random()}`, ...t }), [])

  // Every alert: in-app toast + sound/vibration; a system notification when the phone is in a pocket.
  const pushAlert = useCallback(
    (a, { toast: showToast = true, sound = true } = {}) => {
      const alert = makeAlert(a)
      setAlerts((list) => [alert, ...list].slice(0, 80))
      // Kinds of alerts switched off in Settings → Alerts still land in the list, just without a pop-up or sound.
      // Anything dangerous always alerts.
      if (a.cat && a.level !== 'danger' && getSettings().notify?.[a.cat] === false) return
      if (showToast) notify(alert)
      if (sound) {
        if (a.kind === 'sos' || a.kind === 'accident') {
          playSiren(6)
          haptic('danger')
        } else if (a.level === 'danger') {
          chime('warn')
          haptic('danger')
        } else if (a.level === 'warn') {
          chime('warn')
          haptic('warn')
        } else chime('info')
      }
      if (appInBackground() && a.level !== 'ok') systemNotify(a.title, a.body, a.level === 'danger' ? 'urgent' : 'trip')
      if (sound && (a.level === 'danger' || a.level === 'warn' || a.kind === 'trip' || a.kind === 'regroup')) speak(a.title)
    },
    [notify],
  )

  useEffect(() => {
    if (!toast) return
    const id = setTimeout(() => setToast(null), toast.level === 'danger' ? 8000 : 4500)
    return () => clearTimeout(id)
  }, [toast])

  // Only when a trip starts or ends, not on every status change (that would re-ask for permission).
  const inTrip = !!active
  useEffect(() => {
    onActiveChange?.(inTrip)
    if (inTrip) askNotificationPermission()
  }, [inTrip, onActiveChange])

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 5000)
    return () => clearInterval(id)
  }, [])

  // Apply a newer version of the trip (destination changed, regroup pin, playlist…).
  const adoptMeta = useCallback(
    (meta, fromName) => {
      const cur = activeRef.current
      if (!cur || !meta || meta.code !== cur.code || (meta.rev || 0) <= (cur.meta?.rev || 0)) return
      const old = cur.meta
      setActive({ ...cur, meta })
      if (old?.dest?.name !== meta.dest?.name || old?.dest?.latlng?.join() !== meta.dest?.latlng?.join()) {
        pushAlert({ level: 'info', kind: 'trip', Icon: MapPinned, title: `New destination: ${meta.dest?.name}`, body: `${fromName || meta.updatedBy || 'The leader'} changed where you're heading. Route updated.` })
      }
      if (meta.regroup && meta.regroup.at !== old?.regroup?.at) {
        const kind = PLACE_KINDS[meta.regroup.kind]
        pushAlert(
          kind
            ? { level: 'info', kind: 'regroup', Icon: kind[0], title: `Stop at ${meta.regroup.name}`, body: `${meta.regroup.byName} picked this ${kind[2].toLowerCase()} for the group.`, action: 'Show on map', regroup: true }
            : { level: 'info', kind: 'regroup', Icon: Flag, title: `Regroup at ${meta.regroup.name}`, body: `${meta.regroup.byName} set a meeting point on the map.`, action: 'Show on map', regroup: true },
        )
      } else if (!meta.regroup && old?.regroup) {
        pushAlert({ level: 'ok', Icon: Flag, title: 'Regroup point cleared', body: 'Continue on the route.' }, { sound: false })
      }
      if (old && JSON.stringify(meta.rules || null) !== JSON.stringify(old.rules || null)) {
        pushAlert({ level: 'info', Icon: Settings2, title: 'Convoy rules updated', body: `${meta.updatedBy || 'The leader'} changed when the group counts as together, behind or off route.` }, { sound: false })
      }
      if (meta.playlist && meta.playlist !== old?.playlist) {
        pushAlert({ level: 'info', Icon: Music2, title: 'Trip playlist added', body: `${meta.updatedBy || 'A friend'} shared music for the ride.` }, { sound: false })
      }
    },
    [pushAlert, setActive],
  )

  // ---- Channel: everyone's live presence + events ----
  useEffect(() => {
    if (!active?.code || !profile?.id || active.endedBy) return
    joinedAt.current = Date.now()
    flags.current = {}
    arrivedRef.current = new Set()
    departed.current = {}
    setRoster({})
    // Riders who tapped Leave: their last position updates can still arrive for a few seconds.
    const gone = (id) => Date.now() - (departed.current[id] || 0) < LEFT_GRACE
    // Where a friend is, relative to me: "840 m from you".
    const where = (p) => {
      const mine = fixRef.current?.latlng
      return mine && p.lat != null && p.lng != null ? fromYou(haversine(mine, [p.lat, p.lng])) : null
    }
    const ch = joinChannel(active.code, profile.id, {
      onStatus: setConn,
      onSync: (all) => {
        const t = Date.now()
        const prev = rosterRef.current
        const next = {}
        for (const [id, payload] of Object.entries(all)) {
          if (id === profile.id || gone(id)) continue
          if (payload.trip) adoptMeta(payload.trip, payload.name)
          const before = prev[id]
          next[id] = { payload, online: true, lastSeen: t }
          const oldStatus = before?.payload?.status
          const st = payload.status
          const w = where(payload)
          if (!before && t - joinedAt.current > 4000) {
            pushAlert({ level: 'info', cat: 'members', memberId: id, title: `${payload.name} joined the trip`, body: w ? `Sharing live location, ${w}.` : 'Now sharing live location.' })
          } else if (before && oldStatus !== st && Date.now() - (repliedAt.current[id] || 0) < 15000 && st !== 'sos') {
            // Status came from a check-in answer: that reply already told everyone.
          } else if (before && oldStatus !== st) {
            if (st === 'sos') {
              pushAlert({ level: 'danger', kind: 'sos', memberId: id, title: `${payload.name} sent an SOS`, body: `${w ? `${cap(w)}. ` : ''}Check on them now.`, action: `Navigate to ${payload.name}` })
            } else if (oldStatus === 'sos') {
              pushAlert({ level: 'ok', memberId: id, title: `${payload.name} cancelled SOS`, body: 'They marked themselves safe.' })
            } else if (st === 'riding') {
              pushAlert({ level: 'ok', cat: 'stops', memberId: id, title: `${payload.name} is back on the road`, body: 'Riding again.' }, { sound: false })
            } else if (STATUS[st]) {
              const lv = STATUS[st].level
              pushAlert({
                level: lv,
                kind: st,
                cat: 'stops', // dangerous ones (vehicle problem, accident) alert regardless
                memberId: id,
                title: `${payload.name}: ${STATUS[st].label}`,
                body: lv === 'danger' ? `${w ? `${cap(w)}. ` : ''}Check on them now.` : w ? `Stopped ${w}.` : 'Their stop is shown on your map.',
                action: lv === 'danger' ? `Navigate to ${payload.name}` : undefined,
              })
            }
          }
          if (!stats.current.riders.includes(payload.name)) stats.current.riders.push(payload.name)
        }
        // Keep people who dropped out, marked offline, so their last spot stays on the map.
        for (const [id, m] of Object.entries(prev)) if (!next[id] && !gone(id)) next[id] = { ...m, online: false }
        setRoster(next)
      },
      onEvent: (evt) => {
        if (evt.type === 'ping' && evt.to === profile.id) {
          pushAlert({ level: 'info', memberId: evt.from, title: `${evt.fromName} is asking where you are`, body: 'Your live location is already shared.' })
        } else if (evt.type === 'trip') {
          adoptMeta(evt.meta, evt.byName)
        } else if (evt.type === 'left' && evt.by !== profile.id) {
          // Left on purpose: take them off the map instead of showing them as "offline" forever.
          departed.current[evt.by] = Date.now()
          const without = (o) => {
            if (!o[evt.by]) return o
            const next = { ...o }
            delete next[evt.by]
            return next
          }
          setRoster(without)
          setCheckins(without) // a pending "Are you OK?" must not turn into an emergency
          setNoReply(without)
          delete still.current[evt.by]
          pushAlert({ level: 'info', cat: 'members', Icon: UserMinus, memberId: evt.by, title: `${evt.byName} left the trip`, body: 'They stopped sharing their location.' }, { sound: false })
        } else if (evt.type === 'msg' && evt.msg?.from !== profile.id) {
          // Stamp arrival with this phone's clock: the sender's clock may be off.
          const msg = { ...evt.msg, rcv: Date.now() }
          setMessages((list) => {
            if (list.some((m) => m.id === msg.id)) return list
            const next = [...list, msg].slice(-150)
            saveChat(active.code, next)
            return next
          })
          if (getSettings().chatSounds) {
            chime('msg')
            speak(`${evt.msg.name} says: ${evt.msg.text}`)
            if (appInBackground()) systemNotify(evt.msg.name, evt.msg.text, 'chat')
          }
        } else if (evt.type === 'checkin') {
          if (evt.to === profile.id) {
            setCheckinRequest({ id: evt.id, fromName: evt.fromName, receivedAt: Date.now() })
            playSiren(2)
            haptic('danger')
            speak(`${evt.fromName} is checking on you. Are you OK?`)
            systemNotify(`${evt.fromName} is checking on you`, 'You haven’t moved for a while. Tap to answer, or an SOS is sent in 2 minutes.', 'urgent')
          } else {
            setCheckins((c) => ({ ...c, [evt.to]: { id: evt.id, askedAt: evt.at, byName: evt.fromName, byMe: false } }))
          }
        } else if (evt.type === 'checkin-reply') {
          repliedAt.current[evt.from] = Date.now()
          setCheckins((c) => {
            const next = { ...c }
            delete next[evt.from]
            return next
          })
          setNoReply((n) => {
            const next = { ...n }
            delete next[evt.from]
            return next
          })
          if (evt.from !== profile.id) {
            const opt = CHECKIN_OPTIONS.find((o) => o.key === evt.answer)
            pushAlert({
              level: evt.answer === 'timeout' ? 'danger' : opt?.level || 'info',
              memberId: evt.from,
              title: `${evt.fromName}: ${evt.label}`,
              body: evt.answer === 'timeout' ? 'They didn’t answer the check-in. Their phone sent an SOS.' : 'Replied to “Are you OK?”',
              action: evt.answer === 'ok' || evt.answer === 'stop' ? undefined : `Navigate to ${evt.fromName}`,
            }, { sound: evt.answer !== 'timeout' })
          }
        } else if (evt.type === 'checkin-timeout' && evt.member !== profile.id) {
          setNoReply((n) => ({ ...n, [evt.member]: true }))
          setCheckins((c) => {
            const next = { ...c }
            delete next[evt.member]
            return next
          })
          pushAlert({ level: 'danger', kind: 'sos', memberId: evt.member, title: `${evt.memberName} isn’t responding`, body: 'No reply to “Are you OK?” and their phone may be off. Treat it as an emergency.', action: `Navigate to ${evt.memberName}` })
        } else if (evt.type === 'end' && evt.by !== profile.id) {
          // Stop sharing immediately (this effect's cleanup leaves the channel once endedBy is set);
          // the screen then confirms and returns home. It's saved with the trip, so a phone that
          // restarts doesn't rejoin a finished trip.
          channel.current = null
          if (activeRef.current) setActive({ ...activeRef.current, endedBy: evt.byName })
          setEnded({ by: evt.byName })
          pushAlert({ level: 'info', Icon: Flag, title: 'Trip ended', body: `${evt.byName} ended the trip.` }, { toast: false })
        }
      },
    })
    channel.current = ch
    return () => {
      ch.leave()
      channel.current = null
      setConn('idle')
    }
  }, [active?.code, active?.endedBy, profile?.id, pushAlert, adoptMeta])

  // ---- Route between the trip's start and destination ----
  const routeKey = active?.meta ? `${active.meta.start?.latlng}|${active.meta.dest?.latlng}` : ''
  useEffect(() => {
    setRoute(null)
    setRouteError(null)
    const m = activeRef.current?.meta
    if (!m?.start?.latlng || !m?.dest?.latlng) return
    let alive = true
    let timer = null
    // Weak signal at the start of a ride is common: keep retrying until the route loads.
    const load = (attempt) =>
      getRoute(m.start.latlng, m.dest.latlng)
        .then((r) => alive && setRoute(r))
        .catch((e) => {
          if (!alive) return
          setRouteError(e.message)
          timer = setTimeout(() => load(attempt + 1), Math.min(30000, 3000 * 2 ** attempt))
        })
    load(0)
    return () => {
      alive = false
      clearTimeout(timer)
    }
  }, [routeKey])

  // ---- My trip stats (distance, top speed) ----
  useEffect(() => {
    if (!active || !fix) return
    const s = stats.current
    if (fix.accuracy && fix.accuracy > 60) return
    if (s.last) {
      const d = haversine(s.last.latlng, fix.latlng)
      const dt = (fix.at - s.last.at) / 1000
      // Ignore GPS jumps (faster than 250 km/h) and jitter under 5 m.
      if (d > 5 && dt > 0 && (d / dt) * 3.6 < 250) {
        s.distance += d
        s.last = fix
      } else if (d > 5) s.last = fix
    } else s.last = fix
    if (fix.speed > s.maxSpeed && fix.speed < 250) s.maxSpeed = fix.speed
    // Breadcrumbs every ~30 m, drawn as "your route" on the trip summary. A point that would mean
    // moving faster than 250 km/h is a GPS glitch, not a ride: leave it out so the drawing has no spikes.
    const track = s.track || (s.track = [])
    const lastPoint = track[track.length - 1]
    const step = lastPoint ? haversine(lastPoint, fix.latlng) : Infinity
    const secs = Math.max(1, (fix.at - (s.trackAt || 0)) / 1000)
    if (!lastPoint || (step > 30 && step / secs < 70)) {
      track.push([+fix.latlng[0].toFixed(5), +fix.latlng[1].toFixed(5)])
      s.trackAt = fix.at
      if (track.length > 600) s.track = thin(track, 400)
    }
    // Rode on after a fuel/food/rest stop without tapping "Back on Road": do it for them.
    if (RESUMABLE.has(myStatus)) {
      if (!stopAnchor.current) stopAnchor.current = fix.latlng
      else if (haversine(stopAnchor.current, fix.latlng) > AUTO_RESUME) {
        stopAnchor.current = null
        setMyStatusState('riding')
        if (activeRef.current) setActive({ ...activeRef.current, status: 'riding' })
        notify({ level: 'ok', title: 'Back on the road', body: 'Your status switched to Riding automatically.' })
      }
    } else stopAnchor.current = null
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fix, active])

  useEffect(() => {
    if (!active) return
    const id = setInterval(() => {
      const cur = activeRef.current
      if (cur) saveActiveTrip({ ...cur, stats: { ...stats.current, last: null } })
    }, 20000)
    return () => clearInterval(id)
  }, [active])

  // ---- Share my position ----
  const myPayload = useCallback(
    () => ({
      id: profile.id,
      name: profile.name,
      photo: profile.useAvatar ? null : profile.photo || null,
      avatar: profile.avatar || null,
      role: activeRef.current?.role || 'member',
      lat: fix?.latlng?.[0] ?? null,
      lng: fix?.latlng?.[1] ?? null,
      acc: fix?.accuracy ?? null,
      speed: fix?.speed ?? 0,
      heading: fix?.heading ?? 0,
      battery: getSettings().shareBattery ? battery : null,
      status: myStatus,
      updatedAt: Date.now(),
      trip: activeRef.current?.meta,
    }),
    [profile, fix, battery, myStatus],
  )

  useEffect(() => {
    if (!channel.current) return
    const l = lastTrack.current
    const t = Date.now()
    const rev = active?.meta?.rev || 0
    const moved = fix && l.latlng ? haversine(fix.latlng, l.latlng) : Infinity
    const due = l.status !== myStatus || l.rev !== rev || (t - l.at > TRACK_EVERY && moved > 8) || t - l.at > HEARTBEAT
    if (!due) return
    lastTrack.current = { at: t, latlng: fix?.latlng || null, status: myStatus, rev }
    channel.current.track(myPayload())
  }, [fix, myStatus, myPayload, now, conn, active?.meta?.rev])

  // ---- Derived riders ----
  const members = useMemo(() => {
    const list = []
    if (profile && active) {
      list.push({
        id: profile.id,
        name: profile.name,
        photo: profile.useAvatar ? null : profile.photo || null,
        avatar: profile.avatar || null,
        you: true,
        role: active.role,
        latlng: fix?.latlng || null,
        accuracy: fix?.accuracy,
        speed: fix?.speed || 0,
        heading: fix?.heading || 0,
        battery,
        status: myStatus,
        updatedAt: fix?.at || now,
        online: conn === 'live',
      })
    }
    for (const [id, r] of Object.entries(roster)) {
      const p = r.payload
      list.push({
        id,
        name: p.name || 'Rider',
        photo: p.photo || null,
        avatar: p.avatar || null,
        role: p.role || 'member',
        latlng: p.lat != null && p.lng != null ? [p.lat, p.lng] : null,
        accuracy: p.acc,
        speed: p.speed || 0,
        heading: p.heading || 0,
        battery: p.battery,
        status: p.status || 'riding',
        updatedAt: p.updatedAt || r.lastSeen,
        online: r.online && now - (p.updatedAt || r.lastSeen) < OFFLINE_AFTER * 2,
        lastSeen: r.lastSeen,
      })
    }
    const isOffline = (m) => !m.you && (!m.online || now - m.updatedAt > OFFLINE_AFTER)
    const placed = list.filter((m) => m.latlng)
    const live = placed.filter((m) => !isOffline(m)) // a stale last-known spot shouldn't decide where the group is
    const near = {}
    for (const m of placed) near[m.id] = route ? nearestOnRoute(route, m.latlng) : null

    // Riders count as part of the convoy once they've reached the route or the group (the leader always has).
    // Until then they're "on the way": no off-route or falling-behind alarms while they ride over to meet everyone.
    const arrived = arrivedRef.current
    for (const m of live) if (m.role === 'leader' || (near[m.id] && near[m.id].off < ARRIVE_RADIUS)) arrived.add(m.id)
    let grew = true
    while (grew) {
      grew = false
      for (const m of live) {
        if (arrived.has(m.id)) continue
        if (live.some((o) => arrived.has(o.id) && haversine(o.latlng, m.latlng) <= rules.spread)) {
          arrived.add(m.id)
          grew = true
        }
      }
    }
    // No route and no leader to measure from yet: everyone counts.
    const anyArrived = live.some((m) => arrived.has(m.id))
    const counted = live.filter((m) => !anyArrived || arrived.has(m.id))

    // The group is the biggest cluster of riders chained within the trip's "together" distance of each other
    // (ties: the leader's cluster, then yours). It is never just "wherever you are".
    const clusters = []
    const taken = new Set()
    for (const m of counted) {
      if (taken.has(m.id)) continue
      const c = [m]
      taken.add(m.id)
      for (let i = 0; i < c.length; i++) {
        for (const o of counted) {
          if (!taken.has(o.id) && haversine(c[i].latlng, o.latlng) <= rules.spread) {
            taken.add(o.id)
            c.push(o)
          }
        }
      }
      clusters.push(c)
    }
    const weight = (c) => c.length * 4 + (c.some((m) => m.role === 'leader') ? 2 : 0) + (c.some((m) => m.you) ? 1 : 0)
    const pack = clusters.reduce((best, c) => (!best || weight(c) > weight(best) ? c : best), null) || []
    const inPack = new Set(pack.map((m) => m.id))
    const packAlong = pack.map((o) => near[o.id]?.along).filter((v) => v != null)
    const front = packAlong.length ? Math.max(...packAlong) : null

    const me = list.find((m) => m.you)
    return list.map((m) => {
      const isHere = !anyArrived || arrived.has(m.id)
      if (!m.latlng) return { ...m, state: m.online ? m.status : 'offline', gap: 0, inPack: false, arrived: isHere, fromMe: null }
      const gap = inPack.has(m.id) || !pack.length ? 0 : Math.min(...pack.map((o) => haversine(o.latlng, m.latlng)))
      const onRoute = near[m.id]
      const ahead = !inPack.has(m.id) && front != null && onRoute != null && onRoute.along > front
      const st = still.current[m.id]
      const stillFor = !m.you && st ? now - st.since : 0
      let state = m.status
      if (m.status === 'sos') state = 'sos'
      else if (noReply[m.id]) state = 'noreply'
      else if (isOffline(m)) state = 'offline'
      else if (m.status === 'riding') {
        if (stillMs && stillFor > stillMs) state = 'still'
        else if (!isHere) state = 'joining'
        else if (onRoute && onRoute.off > rules.offRoute) state = 'offroute'
        else if (gap > rules.behind) state = ahead ? 'ahead' : 'behind'
      }
      return {
        ...m,
        gap,
        inPack: inPack.has(m.id),
        arrived: isHere,
        ahead,
        fromMe: me?.latlng ? haversine(me.latlng, m.latlng) : null,
        off: onRoute?.off ?? null,
        along: onRoute?.along ?? null,
        stillFor,
        checkin: checkins[m.id] || null,
        state,
      }
    })
  }, [roster, profile, active, fix, battery, myStatus, conn, route, now, noReply, checkins, rules, stillMs])

  // ---- Rules that come from positions ----
  useEffect(() => {
    if (!active) return
    const t = Date.now()
    for (const m of members) {
      if (m.you) continue
      const f = flags.current
      // Not moving: re-anchor whenever they move more than GPS wobble.
      if (m.latlng) {
        const st = still.current[m.id]
        const moved = st && haversine(st.anchor, m.latlng) > STILL_RADIUS
        if (!st || moved || STATUS[m.status]?.stop) {
          still.current[m.id] = { anchor: m.latlng, since: t }
          f['still' + m.id] = false
          // Moving again after an unanswered check-in: clearly not stuck any more.
          if (moved && noReply[m.id]) {
            setNoReply((n) => {
              const next = { ...n }
              delete next[m.id]
              return next
            })
            pushAlert({ level: 'ok', memberId: m.id, title: `${m.name} is moving again`, body: 'Their location is updating normally.' })
          }
        } else if (stillMs && t - st.since > stillMs && m.state === 'still' && !f['still' + m.id] && !checkins[m.id] && !noReply[m.id]) {
          f['still' + m.id] = true
          const min = Math.round((t - st.since) / 60000)
          pushAlert({ level: 'warn', kind: 'still', checkin: true, memberId: m.id, title: `${m.name} hasn’t moved for ${min} min`, body: 'No stop was reported. Ask if everything is OK.', action: `Ask ${m.name} if OK` })
        }
      }
      if (m.state === 'offroute' && !f['off' + m.id]) {
        f['off' + m.id] = true
        pushAlert({ level: 'warn', cat: 'route', memberId: m.id, title: `${m.name} may have taken a different route`, body: `${m.name} is ${formatDistance(m.off)} away from the planned route.`, action: 'Check route' })
      } else if (m.off != null && m.off < rules.offRoute * 0.4 && f['off' + m.id]) {
        f['off' + m.id] = false
        pushAlert({ level: 'ok', cat: 'route', memberId: m.id, title: `${m.name} is back on route`, body: 'Rejoined the planned route.' }, { toast: false, sound: false })
      }
      if ((m.state === 'behind' || m.state === 'ahead') && !f['behind' + m.id]) {
        f['behind' + m.id] = true
        const km = formatKm(m.gap)
        pushAlert(
          m.state === 'ahead'
            ? { level: 'warn', cat: 'spread', memberId: m.id, title: `${m.name} is far ahead`, body: `${km} ahead of the group. Ask them to wait?`, action: `View ${m.name}` }
            : { level: 'warn', cat: 'spread', memberId: m.id, title: `${m.name} is falling behind`, body: `${km} behind the group.`, action: `View ${m.name}` },
        )
      } else if (m.gap < rules.behind * 0.66) f['behind' + m.id] = false
      // Joined from somewhere else and has now reached the convoy.
      if (m.state === 'joining') f['join' + m.id] = true
      else if (m.arrived && f['join' + m.id]) {
        f['join' + m.id] = false
        pushAlert({ level: 'ok', cat: 'spread', memberId: m.id, title: m.inPack ? `${m.name} reached the group` : `${m.name} is on the route now`, body: 'Riding with the convoy.' }, { sound: false })
      }
      if (m.battery != null && m.battery < 15 && !f['bat' + m.id]) {
        f['bat' + m.id] = true
        pushAlert({ level: 'info', cat: 'battery', memberId: m.id, title: `${m.name}'s battery is below 15%`, body: 'Their location may stop updating soon.' })
      }
      if (m.state === 'offline' && !f['offline' + m.id]) {
        f['offline' + m.id] = true
        pushAlert({ level: 'warn', cat: 'members', memberId: m.id, title: `${m.name} is offline`, body: 'Showing their last known location.' }, { sound: false })
      } else if (m.state !== 'offline' && f['offline' + m.id]) {
        f['offline' + m.id] = false
        pushAlert({ level: 'ok', cat: 'members', memberId: m.id, title: `${m.name} is back online`, body: 'Live location restored.' }, { toast: false, sound: false })
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [members, active, pushAlert, checkins])

  // A check-in I sent got no answer in time (their phone may be dead): alert everyone.
  useEffect(() => {
    for (const [memberId, c] of Object.entries(checkins)) {
      if (!c.byMe || now - c.askedAt < checkinMs + 15000) continue
      const name = members.find((m) => m.id === memberId)?.name || 'A rider'
      channel.current?.send({ type: 'checkin-timeout', id: c.id, member: memberId, memberName: name })
      setNoReply((n) => ({ ...n, [memberId]: true }))
      setCheckins((cs) => {
        const next = { ...cs }
        delete next[memberId]
        return next
      })
      pushAlert({ level: 'danger', kind: 'sos', memberId, title: `${name} isn’t responding`, body: 'No reply to “Are you OK?”. Treat it as an emergency: call or ride to them.', action: `Navigate to ${name}` })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [now, checkins])

  const me = members.find((m) => m.you) || null
  const friends = members.filter((m) => !m.you).sort((a, b) => (a.fromMe ?? Infinity) - (b.fromMe ?? Infinity))
  const health = useMemo(() => healthOf(members, rules), [members, rules])

  let progress = null
  if (route) {
    const along = me?.along ?? 0
    const remaining = Math.max(0, route.total - along)
    progress = { remaining, total: route.total, eta: Date.now() + (remaining / route.total) * route.duration * 1000, fraction: along / route.total }
  }

  // ---- Actions ----
  const start = useCallback(
    (code, role, meta) => {
      stats.current = freshStats()
      const next = { code, role, meta, status: 'riding', stats: { ...stats.current } }
      setActive(next)
      setAlerts([])
      setSeenAt(0)
      setMessages(loadChat(code))
      setChatSeenAt(Date.now())
      setEnded(null)
      setSummary(null)
      setMyStatusState('riding')
      lastTrack.current = { at: 0, latlng: null, status: null, rev: -1 }
    },
    [setActive],
  )

  const createTrip = useCallback(
    ({ name, type, dest, start: from, code: freeCode }) => {
      const code = freeCode || newTripCode()
      start(code, 'leader', { code, name, type, dest, start: from, rules: rulesFor(type), leaderId: profile.id, leaderName: profile.name, createdAt: Date.now(), rev: 1 })
      return code
    },
    [profile, start],
  )

  const joinTrip = useCallback((code, meta) => start(code, 'member', meta), [start])

  // Change the trip for everyone (newer `rev` wins on every phone).
  const updateTrip = useCallback(
    (patch) => {
      const cur = activeRef.current
      if (!cur) return
      const meta = { ...cur.meta, ...patch, rev: (cur.meta.rev || 0) + 1, updatedBy: profile.name, updatedAt: Date.now() }
      setActive({ ...cur, meta })
      channel.current?.send({ type: 'trip', meta, byName: profile.name })
    },
    [profile, setActive],
  )

  const updateRules = useCallback((patch) => updateTrip({ rules: { ...rules, ...patch } }), [rules, updateTrip])

  const finish = useCallback(() => {
    const cur = activeRef.current
    if (!cur) return
    const s = stats.current
    const entry = {
      id: `${cur.code}-${cur.meta?.createdAt || s.startedAt}`,
      code: cur.code,
      name: cur.meta?.name,
      from: cur.meta?.start?.name,
      to: cur.meta?.dest?.name,
      type: cur.meta?.type,
      startedAt: s.startedAt,
      endedAt: Date.now(),
      distance: Math.round(s.distance),
      maxSpeed: Math.round(s.maxSpeed),
      riders: [profile.name, ...s.riders.filter((n) => n !== profile.name)],
      alerts: alerts.length,
      messages: messages.length,
      track: thin(s.track || [], 250),
    }
    addHistory(entry)
    clearChat(cur.code)
    setSummary(entry)
    activeRef.current = null
    saveActiveTrip(null)
    setActiveState(null)
    setRoster({})
    setEnded(null)
    setToast(null)
    setMessages([])
  }, [profile, alerts.length, messages.length])

  // Tell the convoy you left on purpose (so you vanish from their map), then wrap up.
  const leaveTrip = useCallback(() => {
    if (!channel.current) return finish()
    channel.current.send({ type: 'left', by: profile.id, byName: profile.name })
    setTimeout(finish, 300)
  }, [profile, finish])

  const endTrip = useCallback(() => {
    channel.current?.send({ type: 'end', by: profile.id, byName: profile.name })
    setTimeout(finish, 300)
  }, [profile, finish])

  const setMyStatus = useCallback(
    (status) => {
      setMyStatusState(status)
      // Through setActive (state + ref + storage together): the 20-second save copies the trip state,
      // so editing only the ref let it put back the old status (an SOS lost, or a cancelled one back,
      // after the app restarts).
      if (activeRef.current) setActive({ ...activeRef.current, status })
    },
    [setActive],
  )

  const ping = useCallback(
    (to) => channel.current?.send({ type: 'ping', to, from: profile.id, fromName: profile.name }),
    [profile],
  )

  // Ask a stopped rider "Are you OK?" (multiple choice on their phone, auto-SOS if unanswered).
  const askCheckIn = useCallback(
    (memberId) => {
      const id = newId()
      const at = Date.now()
      channel.current?.send({ type: 'checkin', id, to: memberId, from: profile.id, fromName: profile.name, at })
      setCheckins((c) => ({ ...c, [memberId]: { id, askedAt: at, byName: profile.name, byMe: true } }))
      setNoReply((n) => {
        const next = { ...n }
        delete next[memberId]
        return next
      })
      const name = rosterRef.current[memberId]?.payload?.name || 'They'
      notify({ level: 'info', Icon: ShieldQuestion, title: `Asked ${name} if they’re OK`, body: `If there’s no answer in ${Math.max(1, Math.round(checkinMs / 60000))} min, the group gets an emergency alert.` })
    },
    [profile, notify, checkinMs],
  )

  const answerCheckIn = useCallback(
    (key) => {
      const req = checkinRequest
      setCheckinRequest(null)
      const timeout = key === 'timeout'
      const opt = CHECKIN_OPTIONS.find((o) => o.key === key)
      setMyStatus(timeout ? 'sos' : opt.status)
      channel.current?.send({
        type: 'checkin-reply',
        id: req?.id,
        from: profile.id,
        fromName: profile.name,
        answer: key,
        label: timeout ? 'No answer, automatic SOS' : opt.label,
      })
    },
    [checkinRequest, profile, setMyStatus],
  )

  const sendMessage = useCallback(
    (text) => {
      const cur = activeRef.current
      const t = String(text || '').trim().slice(0, 300)
      if (!cur || !t) return
      const msg = { id: newId(), from: profile.id, name: profile.name, photo: profile.useAvatar ? null : profile.photo || null, avatar: profile.avatar || null, text: t, at: Date.now() }
      setMessages((list) => {
        const next = [...list, msg].slice(-150)
        saveChat(cur.code, next)
        return next
      })
      channel.current?.send({ type: 'msg', msg })
    },
    [profile],
  )

  const value = {
    active,
    trip: active?.meta || null,
    code: active?.code || null,
    role: active?.role || null,
    conn,
    route,
    routeError,
    members,
    me,
    friends,
    health,
    progress,
    alerts,
    unread: alerts.filter((a) => a.at > seenAt).length,
    markSeen: () => setSeenAt(Date.now()),
    messages,
    unreadChat: messages.filter((m) => m.from !== profile?.id && (m.rcv || m.at) > chatSeenAt).length,
    markChatSeen: () => setChatSeenAt(Date.now()),
    toast,
    notify,
    addAlert: pushAlert,
    rules,
    checkinMs,
    updateRules,
    dismissToast: () => setToast(null),
    ended,
    summary,
    clearSummary: () => setSummary(null),
    stats: stats.current,
    now,
    createTrip,
    joinTrip,
    updateTrip,
    leaveTrip,
    endTrip,
    setMyStatus,
    ping,
    sendMessage,
    checkinRequest,
    askCheckIn,
    answerCheckIn,
  }
  return <TripCtx.Provider value={value}>{children}</TripCtx.Provider>
}
