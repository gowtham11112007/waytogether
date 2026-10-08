import { createClient } from '@supabase/supabase-js'

// Live sharing runs on Supabase Realtime: each trip is a channel named after its code.
// Presence says who is in the trip (and carries the trip details for joiners); broadcast carries
// live positions every few seconds plus one-off events (ping, trip ended).
// No tables are needed. Without keys (local testing), browser tabs talk over BroadcastChannel.
const URL = import.meta.env.VITE_SUPABASE_URL
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY
const testLocal = typeof location !== 'undefined' && new URLSearchParams(location.search).get('local') === '1'
export const BACKEND = !testLocal && URL && KEY ? 'supabase' : 'local'

let client
// One client for auth (Google sign-in session is kept on the phone) and realtime.
export const supabase = () =>
  (client ||= createClient(URL, KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce' },
    // Heartbeats from a Web Worker: Android throttles page timers when the app is in the background,
    // which would otherwise let the live connection drop while the phone is in a pocket.
    realtime: { worker: true },
  }))

const topic = (code) => `waytogether-trip-${code}`

// presenceState(): { key: [meta, ...] } -> { key: latestMeta }
function flatten(state) {
  const out = {}
  for (const [key, metas] of Object.entries(state)) {
    const latest = metas.reduce((a, b) => ((b.updatedAt || 0) > (a.updatedAt || 0) ? b : a), metas[0])
    if (latest) out[key] = latest
  }
  return out
}

// supabase-js reuses a channel object when the topic matches, so a new channel for a trip must wait
// until any previous one (React remounts, lookup → join) has fully closed.
const closing = new Map()

const PRESENCE_MIN_GAP = 12000 // Supabase rate-limits presence updates; positions go over broadcast instead.
const BROADCAST_FRESH = 30000

function supabaseChannel(code, myId, { onSync, onEvent, onStatus }) {
  const name = topic(code)
  const key = myId || `viewer-${Math.random().toString(36).slice(2)}`
  let ch = null
  let ready = false
  let closed = false
  let last = null // my latest payload; re-sent after every (re)connect
  let retry = 0
  let retryTimer = null
  let presenceAt = 0
  let presenceTimer = null
  let present = {} // who is in the trip (presence)
  const moves = {} // latest positions (broadcast): id -> { payload, at }

  // Merge membership (presence) with the freshest positions (broadcast).
  const emit = () => {
    const now = Date.now()
    const out = { ...present }
    for (const [id, m] of Object.entries(moves)) {
      if (!out[id] && now - m.at > BROADCAST_FRESH) continue
      if (!out[id] || (m.payload.updatedAt || 0) >= (out[id].updatedAt || 0)) out[id] = { ...out[id], ...m.payload }
    }
    onSync?.(out)
  }

  const pushPresence = () => {
    if (!ready || !ch || !last) return
    const wait = PRESENCE_MIN_GAP - (Date.now() - presenceAt)
    if (wait > 0) {
      presenceTimer ||= setTimeout(() => {
        presenceTimer = null
        pushPresence()
      }, wait)
      return
    }
    presenceAt = Date.now()
    ch.track(last)
  }

  const open = async () => {
    await closing.get(name)
    if (closed) return
    const mine = supabase().channel(name, { config: { presence: { key }, broadcast: { self: false } } })
    ch = mine
    mine.on('presence', { event: 'sync' }, () => {
      if (mine !== ch) return
      present = flatten(mine.presenceState())
      emit()
    })
    mine.on('presence', { event: 'leave' }, ({ key: gone }) => {
      if (mine !== ch) return
      delete moves[gone]
    })
    mine.on('broadcast', { event: 'loc' }, ({ payload }) => {
      if (mine !== ch || !payload?.id) return
      moves[payload.id] = { payload, at: Date.now() }
      emit()
    })
    mine.on('broadcast', { event: 'evt' }, ({ payload }) => mine === ch && onEvent?.(payload))
    mine.subscribe((status) => {
      if (closed || mine !== ch) return
      ready = status === 'SUBSCRIBED'
      if (ready) {
        retry = 0
        onStatus?.('live')
        if (last) {
          presenceAt = 0
          pushPresence()
          mine.send({ type: 'broadcast', event: 'loc', payload: last })
        }
        return
      }
      onStatus?.('connecting')
      // Network drops, sleeping phones, server restarts: rebuild the channel with backoff.
      if (status === 'CLOSED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        ch = null
        clearTimeout(retryTimer)
        const wait = Math.min(15000, 1000 * 2 ** retry++)
        const done = supabase().removeChannel(mine).catch(() => {})
        closing.set(name, done)
        done.finally(() => closing.get(name) === done && closing.delete(name))
        retryTimer = setTimeout(open, wait)
      }
    })
  }
  const opened = open()

  return {
    track: (payload) => {
      last = payload
      if (ready && ch) ch.send({ type: 'broadcast', event: 'loc', payload })
      pushPresence()
    },
    send: (event) => ready && ch && ch.send({ type: 'broadcast', event: 'evt', payload: event }),
    leave: () => {
      closed = true
      clearTimeout(retryTimer)
      clearTimeout(presenceTimer)
      const done = (async () => {
        await opened
        const c = ch
        ch = null
        if (!c) return
        try {
          await c.untrack()
        } catch {
          /* already gone */
        }
        await supabase().removeChannel(c)
      })()
      closing.set(name, done)
      done.finally(() => closing.get(name) === done && closing.delete(name))
      return done
    },
  }
}

function localChannel(code, myId, { onSync, onEvent, onStatus }) {
  const bc = new BroadcastChannel('convoya-local')
  const peers = {}
  let mine = null
  const emit = () => {
    const all = {}
    for (const [k, v] of Object.entries(peers)) all[k] = v.payload
    if (mine && myId) all[myId] = mine
    onSync?.(all)
  }
  const announce = () => mine && bc.postMessage({ t: 'presence', code, key: myId, payload: mine })
  bc.onmessage = ({ data }) => {
    if (data.code !== code) return
    if (data.t === 'presence' && data.key !== myId) {
      peers[data.key] = { payload: data.payload, at: Date.now() }
      emit()
    } else if (data.t === 'hello') announce()
    else if (data.t === 'leave') {
      delete peers[data.key]
      emit()
    } else if (data.t === 'evt') onEvent?.(data.payload)
  }
  const beat = setInterval(() => {
    announce()
    let changed = false
    for (const [k, v] of Object.entries(peers)) {
      if (Date.now() - v.at > 8000) {
        delete peers[k]
        changed = true
      }
    }
    if (changed) emit()
  }, 2000)
  setTimeout(() => {
    onStatus?.('live')
    bc.postMessage({ t: 'hello', code })
    emit()
  }, 150)
  return {
    track: (payload) => {
      mine = payload
      announce()
      emit()
    },
    send: (event) => bc.postMessage({ t: 'evt', code, payload: event }),
    leave: () => {
      clearInterval(beat)
      if (myId) bc.postMessage({ t: 'leave', code, key: myId })
      bc.close()
    },
  }
}

export function joinChannel(code, myId, handlers) {
  return BACKEND === 'supabase' ? supabaseChannel(code, myId, handlers) : localChannel(code, myId, handlers)
}

// Look up a trip by code without joining it: anyone currently sharing carries the trip details.
// Concurrent lookups of the same code share one request (they'd otherwise share one channel anyway).
const lookups = new Map()
export function lookupTrip(code, timeout = 7000) {
  if (!lookups.has(code)) {
    const p = lookupOnce(code, timeout).finally(() => setTimeout(() => lookups.delete(code), 1500))
    lookups.set(code, p)
  }
  return lookups.get(code)
}

function lookupOnce(code, timeout) {
  return new Promise((resolve) => {
    let done = false
    let ch = null
    // Fully close the lookup before resolving, so joining the same trip right after gets a fresh channel.
    const finish = (result) => {
      if (done) return
      done = true
      clearTimeout(timer)
      setTimeout(async () => {
        try {
          await ch?.leave()
        } finally {
          resolve(result)
        }
      }, 0)
    }
    const timer = setTimeout(() => finish(null), timeout)
    ch = joinChannel(code, null, {
      onSync: (all) => {
        const riders = Object.values(all).filter((p) => p.trip)
        if (riders.length) {
          const leader = riders.find((p) => p.role === 'leader') || riders[0]
          finish({ trip: leader.trip, riders })
        }
      },
    })
  })
}
