import * as maplibregl from 'maplibre-gl'

// Offline maps, no account needed: every map file the phone loads (style, tiles, fonts, icons) is kept in the
// browser's Cache Storage, and used when there's no signal. A trip also saves the map along its whole route.
const CACHE = 'cv-map-v1'
const SCHEME = 'cvmap'
const HOSTS = /^https:\/\/(tiles\.openfreemap\.org|server\.arcgisonline\.com)\//
const MAX_ENTRIES = 12000 // the oldest half goes when it's full
const ok = typeof caches !== 'undefined' && typeof fetch !== 'undefined'
const TILEJSON = 'https://tiles.openfreemap.org/planet'

// OpenFreeMap puts tiles in a weekly folder (planet/20261025_080012_pt/…); the cache key leaves it out so saved
// tiles keep working after a data update.
const keyFor = (url) => url.replace(/\/planet\/[^/]+\/(\d+\/\d+\/\d+\.pbf)/, '/planet/v/$1')

const read = (res, type) => (type === 'json' ? res.json() : type === 'string' ? res.text() : res.arrayBuffer())

async function load(url, signal) {
  const cache = await caches.open(CACHE)
  const key = keyFor(url)
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    const hit = await cache.match(key)
    if (hit) return hit
  }
  try {
    const res = await fetch(url, { signal })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    cache.put(key, res.clone()).catch(() => {})
    return res
  } catch (e) {
    if (signal?.aborted) throw e
    const hit = await cache.match(key) // weak or no signal: use the saved copy
    if (hit) return hit
    throw e
  }
}

let ready = false
export function setupOfflineMap() {
  if (!ok || ready) return
  ready = true
  maplibregl.addProtocol(SCHEME, async (params, abort) => {
    const res = await load(`https://${params.url.slice(SCHEME.length + 3)}`, abort.signal)
    return { data: await read(res, params.type) }
  })
  trim()
}

// For the map's transformRequest: send map files through the cache.
export function cachedRequest(url) {
  if (ok && HOSTS.test(url)) return { url: `${SCHEME}://${url.slice(8)}` }
  return undefined
}

async function trim() {
  try {
    const cache = await caches.open(CACHE)
    const keys = await cache.keys()
    if (keys.length > MAX_ENTRIES) await Promise.all(keys.slice(0, keys.length / 2).map((k) => cache.delete(k)))
  } catch {
    /* storage unavailable */
  }
}

const tileOf = ([lat, lng], z) => {
  const n = 2 ** z
  const x = Math.floor(((lng + 180) / 360) * n)
  const r = (lat * Math.PI) / 180
  const y = Math.floor(((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * n)
  return [x, y]
}

// Save the map along a route (and a tile either side), zoom 6 to 14, so it works with no signal on the way.
// Vector tiles are small: a 100 km route is a few hundred tiles, 10–20 MB. Calls onProgress(done, total).
export async function saveRouteOffline(coords, onProgress) {
  if (!ok || !coords?.length) return 0
  const tj = await (await fetch(TILEJSON)).json()
  const template = tj.tiles[0]
  const want = new Set()
  for (const z of [6, 8, 10, 12, 13, 14]) {
    const pad = z >= 12 ? 1 : 0
    for (const p of coords) {
      const [x, y] = tileOf(p, z)
      for (let dx = -pad; dx <= pad; dx++) for (let dy = -pad; dy <= pad; dy++) want.add(`${z}/${x + dx}/${y + dy}`)
    }
  }
  const cache = await caches.open(CACHE)
  const urls = [...want].map((t) => template.replace('{z}/{x}/{y}', t))
  let done = 0
  const next = async () => {
    while (urls.length) {
      const url = urls.pop()
      try {
        if (!(await cache.match(keyFor(url)))) {
          const res = await fetch(url)
          if (res.ok) await cache.put(keyFor(url), res)
        }
      } catch {
        /* skip this tile */
      }
      onProgress?.(++done, want.size)
    }
  }
  await Promise.all(Array.from({ length: 6 }, next))
  return want.size
}
