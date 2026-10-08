import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { ShieldQuestion } from 'lucide-react'
import { CHECKIN_OPTIONS, STATUS } from '../data/trip'
import { chime, playSiren } from '../lib/alarm'
import { haversine, nearestOnRoute } from '../lib/geo'
import { appInBackground, askNotificationPermission, haptic, systemNotify } from '../lib/notify'
import { getRoute } from '../lib/places'
import { addHistory, clearChat, loadActiveTrip, loadChat, newId, newTripCode, saveActiveTrip, saveChat } from '../lib/profile'
import { joinChannel } from '../lib/realtime'

const PACK_GAP = 800 // riders within 800 m of each other count as "together"
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
export const STILL_MS = (testParam('stillMin') || 5) * 60000 // no movement for 5 min → ask the group
export const CHECKIN_MS = (testParam('checkinSec') || 120) * 1000 // 2 min to answer "Are you OK?" → SOS
const STILL_RADIUS = 40 // metres of GPS wobble that still counts as "not moving"
const AUTO_RESUME = 500 // riding 500 m away from a declared stop = back on the road
const RESUMABLE = new Set(['fuel', 'food', 'rest', 'waiting', 'regroup'])

const TripCtx = createContext(null)
export const useTrip = () => useContext(TripCtx)

let alertSeq = 0
const makeAlert = (a) => ({ id: `${Date.now()}-${++alertSeq}`, at: Date.now(), ...a })

function healthOf(members) {
  const placed = members.filter((m) => m.latlng)
  const n = placed.length
  const out = placed.filter((m) => !m.inPack).sort((a, b) => b.gap - a.gap)
  const together = n - out.length
  const km = (m) => (m.gap / 1000).toFixed(1)
  if (n <= 1) return { level: 'info', title: 'Waiting for friends', line: 'Share the trip code so friends can join.', together: n, n }
  if (out.length === 0) return { level: 'ok', title: 'Everyone together', line: `All ${n} riders are within 800 m.`, together, n }
  // In a bigger group one straggler under 1.5 km is still "together"; in a small group anyone away counts.
  if (n >= 4 && out.length === 1 && out[0].gap <= 1500) {
    return { level: 'ok', title: 'Everyone together', line: `${together} of ${n} riders are within 800 m.`, together, n }
  }
  if (out[0].gap > 3000) return { level: 'danger', title: 'Convoy split', line: `${out[0].name} is ${km(out[0])} km away from the group.`, together, n }
  const behind = out.filter((m) => m.gap > 1500)
  const line =
    out.length === 1
      ? `${out[0].name} is ${km(out[0])} km away from the group.`
      : behind.length
        ? `${behind.length} ${behind.length > 1 ? 'riders are' : 'rider is'} more than 1.5 km away.`
        : `${out.length} riders are drifting from the group.`
  return { level: 'warn', title: 'Convoy spreading', line, together, n }
}

const freshStats = () => ({ startedAt: Date.now(), distance: 0, maxSpeed: 0, last: null, riders: [] })

export function TripProvider({ profile, fix, battery, onActiveChange, children }) {
  const [active, setActiveState] = useState(loadActiveTrip) // { code, role, meta, status, stats }
  const [roster, setRoster] = useState({}) // id -> { payload, online, lastSeen }
  const [conn, setConn] = useState('idle')
  const [route, setRoute] = useState(null)
  const [routeError, setRouteError] = useState(null)
  const [alerts, setAlerts] = useState([])
  const [seen, setSeen] = useState(0)
  const [messages, setMessages] = useState(() => (loadActiveTrip()?.code ? loadChat(loadActiveTrip().code) : []))
  const [chatSeen, setChatSeen] = useState(() => (loadActiveTrip()?.code ? loadChat(loadActiveTrip().code).length : 0))
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

  const channel = useRef(null)
  const rosterRef = useRef(roster)
  rosterRef.current = roster
  const activeRef = useRef(active)
  activeRef.current = active
  const flags = useRef({})
  const joinedAt = useRef(0)
  const lastTrack = useRef({ at: 0, latlng: null, status: null, rev: -1 })
  const stats = useRef(active?.stats || freshStats())

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
    },
    [notify],
  )

  useEffect(() => {
    if (!toast) return
    const id = setTimeout(() => setToast(null), toast.level === 'danger' ? 8000 : 4500)
    return () => clearTimeout(id)
  }, [toast])

  useEffect(() => {
    onActiveChange?.(!!active)
    if (active) askNotificationPermission()
  }, [active, onActiveChange])

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
        pushAlert({ level: 'info', kind: 'trip', title: `New destination: ${meta.dest?.name}`, body: `${fromName || meta.updatedBy || 'The leader'} changed where you're heading. Route updated.` })
      }
      if (meta.regroup && meta.regroup.at !== old?.regroup?.at) {
        pushAlert({ level: 'info', kind: 'regroup', title: `Regroup at ${meta.regroup.name}`, body: `${meta.regroup.byName} set a meeting point on the map.`, action: 'Show on map', regroup: true })
      } else if (!meta.regroup && old?.regroup) {
        pushAlert({ level: 'ok', title: 'Regroup point cleared', body: 'Continue on the route.' }, { sound: false })
      }
      if (meta.playlist && meta.playlist !== old?.playlist) {
        pushAlert({ level: 'info', title: 'Trip playlist added', body: `${meta.updatedBy || 'A friend'} shared music for the ride.` }, { sound: false })
      }
    },
    [pushAlert, setActive],
  )

  // ---- Channel: everyone's live presence + events ----
  useEffect(() => {
    if (!active?.code || !profile?.id || active.endedBy) return
    joinedAt.current = Date.now()
    flags.current = {}
    setRoster({})
    const ch = joinChannel(active.code, profile.id, {
      onStatus: setConn,
      onSync: (all) => {
        const t = Date.now()
        const prev = rosterRef.current
        const next = {}
        for (const [id, payload] of Object.entries(all)) {
          if (id === profile.id) continue
          if (payload.trip) adoptMeta(payload.trip, payload.name)
          const before = prev[id]
          next[id] = { payload, online: true, lastSeen: t }
          const oldStatus = before?.payload?.status
          const st = payload.status
          if (!before && t - joinedAt.current > 4000) {
            pushAlert({ level: 'info', memberId: id, title: `${payload.name} joined the trip`, body: 'Now sharing live location.' })
          } else if (before && oldStatus !== st && Date.now() - (repliedAt.current[id] || 0) < 15000 && st !== 'sos') {
            // Status came from a check-in answer: that reply already told everyone.
          } else if (before && oldStatus !== st) {
            if (st === 'sos') {
              pushAlert({ level: 'danger', kind: 'sos', memberId: id, title: `${payload.name} sent an SOS`, body: 'Live location shared. Check on them now.', action: `Navigate to ${payload.name}` })
            } else if (oldStatus === 'sos') {
              pushAlert({ level: 'ok', memberId: id, title: `${payload.name} cancelled SOS`, body: 'They marked themselves safe.' })
            } else if (st === 'riding') {
              pushAlert({ level: 'ok', memberId: id, title: `${payload.name} is back on the road`, body: 'Riding again.' }, { sound: false })
            } else if (STATUS[st]) {
              const lv = STATUS[st].level
              pushAlert({
                level: lv,
                kind: st,
                memberId: id,
                title: `${payload.name}: ${STATUS[st].label}`,
                body: lv === 'danger' ? 'Location shared with the group.' : 'The group has been notified.',
                action: lv === 'danger' ? `Navigate to ${payload.name}` : undefined,
              })
            }
          }
          if (!stats.current.riders.includes(payload.name)) stats.current.riders.push(payload.name)
        }
        // Keep people who dropped out, marked offline, so their last spot stays on the map.
        for (const [id, m] of Object.entries(prev)) if (!next[id]) next[id] = { ...m, online: false }
        setRoster(next)
      },
      onEvent: (evt) => {
        if (evt.type === 'ping' && evt.to === profile.id) {
          pushAlert({ level: 'info', memberId: evt.from, title: `${evt.fromName} is asking where you are`, body: 'Your live location is already shared.' })
        } else if (evt.type === 'trip') {
          adoptMeta(evt.meta, evt.byName)
        } else if (evt.type === 'msg' && evt.msg?.from !== profile.id) {
          setMessages((list) => {
            if (list.some((m) => m.id === evt.msg.id)) return list
            const next = [...list, evt.msg].slice(-150)
            saveChat(active.code, next)
            return next
          })
          chime('msg')
          if (appInBackground()) systemNotify(evt.msg.name, evt.msg.text, 'chat')
        } else if (evt.type === 'checkin') {
          if (evt.to === profile.id) {
            setCheckinRequest({ id: evt.id, fromName: evt.fromName, receivedAt: Date.now() })
            playSiren(2)
            haptic('danger')
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
          // Stop sharing immediately; the screen then confirms and returns home.
          // Remember it, so a phone that restarts doesn't rejoin a finished trip.
          ch.leave()
          channel.current = null
          if (activeRef.current) {
            activeRef.current = { ...activeRef.current, endedBy: evt.byName }
            saveActiveTrip(activeRef.current)
          }
          setEnded({ by: evt.byName })
          pushAlert({ level: 'info', title: 'Trip ended', body: `${evt.byName} ended the trip.` }, { toast: false })
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
    // Rode on after a fuel/food/rest stop without tapping "Back on Road": do it for them.
    if (RESUMABLE.has(myStatus)) {
      if (!stopAnchor.current) stopAnchor.current = fix.latlng
      else if (haversine(stopAnchor.current, fix.latlng) > AUTO_RESUME) {
        stopAnchor.current = null
        setMyStatusState('riding')
        const cur = activeRef.current
        if (cur) {
          activeRef.current = { ...cur, status: 'riding' }
          saveActiveTrip(activeRef.current)
        }
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
      photo: profile.photo || null,
      role: activeRef.current?.role || 'member',
      lat: fix?.latlng?.[0] ?? null,
      lng: fix?.latlng?.[1] ?? null,
      acc: fix?.accuracy ?? null,
      speed: fix?.speed ?? 0,
      heading: fix?.heading ?? 0,
      battery,
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
        photo: profile.photo || null,
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
    const placed = list.filter((m) => m.latlng)
    const anchor = placed.find((m) => m.you) || placed.find((m) => m.role === 'leader') || placed[0]
    const inPack = new Set(anchor ? [anchor.id] : [])
    let grew = true
    while (grew) {
      grew = false
      for (const m of placed) {
        if (inPack.has(m.id)) continue
        if (placed.some((o) => inPack.has(o.id) && haversine(o.latlng, m.latlng) <= PACK_GAP)) {
          inPack.add(m.id)
          grew = true
        }
      }
    }
    const me = list.find((m) => m.you)
    return list.map((m) => {
      if (!m.latlng) return { ...m, state: m.online ? m.status : 'offline', gap: 0, inPack: false, fromMe: null }
      const gap = inPack.has(m.id) ? 0 : Math.min(...placed.filter((o) => inPack.has(o.id)).map((o) => haversine(o.latlng, m.latlng)))
      const onRoute = route ? nearestOnRoute(route, m.latlng) : null
      const offline = !m.you && (!m.online || now - m.updatedAt > OFFLINE_AFTER)
      const st = still.current[m.id]
      const stillFor = !m.you && st ? now - st.since : 0
      let state = m.status
      if (m.status === 'sos') state = 'sos'
      else if (noReply[m.id]) state = 'noreply'
      else if (offline) state = 'offline'
      else if (m.status === 'riding') {
        if (stillFor > STILL_MS) state = 'still'
        else if (onRoute && onRoute.off > 300) state = 'offroute'
        else if (gap > 1500) state = 'behind'
      }
      return {
        ...m,
        gap,
        inPack: inPack.has(m.id),
        fromMe: me?.latlng ? haversine(me.latlng, m.latlng) : null,
        off: onRoute?.off ?? null,
        along: onRoute?.along ?? null,
        stillFor,
        checkin: checkins[m.id] || null,
        state,
      }
    })
  }, [roster, profile, active, fix, battery, myStatus, conn, route, now, noReply, checkins])

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
        } else if (t - st.since > STILL_MS && m.state === 'still' && !f['still' + m.id] && !checkins[m.id] && !noReply[m.id]) {
          f['still' + m.id] = true
          const min = Math.round((t - st.since) / 60000)
          pushAlert({ level: 'warn', kind: 'still', checkin: true, memberId: m.id, title: `${m.name} hasn’t moved for ${min} min`, body: 'No stop was reported. Ask if everything is OK.', action: `Ask ${m.name} if OK` })
        }
      }
      if (m.state === 'offroute' && !f['off' + m.id]) {
        f['off' + m.id] = true
        pushAlert({ level: 'warn', memberId: m.id, title: `${m.name} may have taken a different route`, body: `${m.name} is ${Math.round(m.off / 10) * 10} m away from the planned route.`, action: 'Check route' })
      } else if (m.off != null && m.off < 120 && f['off' + m.id]) {
        f['off' + m.id] = false
        pushAlert({ level: 'ok', memberId: m.id, title: `${m.name} is back on route`, body: 'Rejoined the planned route.' }, { toast: false, sound: false })
      }
      if (m.gap > 1500 && !f['behind' + m.id]) {
        f['behind' + m.id] = true
        pushAlert({ level: 'warn', memberId: m.id, title: `${m.name} is falling behind`, body: `${m.name} is ${(m.gap / 1000).toFixed(1)} km away from the nearest group member.`, action: `View ${m.name}` })
      } else if (m.gap < 1000) f['behind' + m.id] = false
      if (m.battery != null && m.battery < 15 && !f['bat' + m.id]) {
        f['bat' + m.id] = true
        pushAlert({ level: 'info', memberId: m.id, title: `${m.name}'s battery is below 15%`, body: 'Their location may stop updating soon.' })
      }
      if (m.state === 'offline' && !f['offline' + m.id]) {
        f['offline' + m.id] = true
        pushAlert({ level: 'warn', memberId: m.id, title: `${m.name} is offline`, body: 'Showing their last known location.' }, { sound: false })
      } else if (m.state !== 'offline' && f['offline' + m.id]) {
        f['offline' + m.id] = false
        pushAlert({ level: 'ok', memberId: m.id, title: `${m.name} is back online`, body: 'Live location restored.' }, { toast: false, sound: false })
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [members, active, pushAlert, checkins])

  // A check-in I sent got no answer in time (their phone may be dead): alert everyone.
  useEffect(() => {
    for (const [memberId, c] of Object.entries(checkins)) {
      if (!c.byMe || now - c.askedAt < CHECKIN_MS + 15000) continue
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
  const health = useMemo(() => healthOf(members), [members])

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
      setSeen(0)
      setMessages(loadChat(code))
      setChatSeen(loadChat(code).length)
      setEnded(null)
      setSummary(null)
      setMyStatusState('riding')
      lastTrack.current = { at: 0, latlng: null, status: null, rev: -1 }
    },
    [setActive],
  )

  const createTrip = useCallback(
    ({ name, type, dest, start: from }) => {
      const code = newTripCode()
      start(code, 'leader', { code, name, type, dest, start: from, leaderId: profile.id, leaderName: profile.name, createdAt: Date.now(), rev: 1 })
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

  const leaveTrip = finish

  const endTrip = useCallback(() => {
    channel.current?.send({ type: 'end', by: profile.id, byName: profile.name })
    setTimeout(finish, 300)
  }, [profile, finish])

  const setMyStatus = useCallback(
    (status) => {
      setMyStatusState(status)
      const cur = activeRef.current
      if (cur) {
        // Keep the ref in sync too, so the periodic save can't overwrite an active SOS.
        activeRef.current = { ...cur, status }
        saveActiveTrip(activeRef.current)
      }
    },
    [],
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
      notify({ level: 'info', Icon: ShieldQuestion, title: `Asked ${name} if they’re OK`, body: `If there’s no answer in ${Math.round(CHECKIN_MS / 60000) || 1} min, the group gets an emergency alert.` })
    },
    [profile, notify],
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
      const msg = { id: newId(), from: profile.id, name: profile.name, photo: profile.photo || null, text: t, at: Date.now() }
      setMessages((list) => {
        const next = [...list, msg].slice(-150)
        saveChat(cur.code, next)
        return next
      })
      setChatSeen((n) => n + 1)
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
    unread: Math.max(0, alerts.length - seen),
    markSeen: () => setSeen(alerts.length),
    messages,
    unreadChat: Math.max(0, messages.length - chatSeen),
    markChatSeen: () => setChatSeen(messages.length),
    toast,
    notify,
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
