import { buildRoute } from './geo'

// Photon (OpenStreetMap search, free, no key) and OSRM (free routing).
const PHOTON = 'https://photon.komoot.io'
const OSRM = 'https://router.project-osrm.org'

function label(p) {
  const name = p.name || [p.housenumber, p.street].filter(Boolean).join(' ') || p.city || p.county || 'Dropped pin'
  const area = [p.name && p.street && p.street !== p.name ? p.street : null, p.district, p.city !== p.name ? p.city : null, p.state, p.country]
    .filter(Boolean)
    .filter((v, i, a) => a.indexOf(v) === i)
    .slice(0, 3)
    .join(', ')
  return { name, area }
}

export async function searchPlaces(query, near, signal) {
  const u = new URL(`${PHOTON}/api/`)
  u.searchParams.set('q', query)
  u.searchParams.set('limit', '8')
  if (near) {
    u.searchParams.set('lat', String(near[0]))
    u.searchParams.set('lon', String(near[1]))
  }
  const res = await fetch(u, { signal })
  if (!res.ok) throw new Error('Search failed')
  const data = await res.json()
  return data.features.map((f) => {
    const { name, area } = label(f.properties)
    return {
      id: `${f.properties.osm_type}${f.properties.osm_id}`,
      name,
      area,
      latlng: [f.geometry.coordinates[1], f.geometry.coordinates[0]],
    }
  })
}

export async function placeName(latlng, signal) {
  try {
    const res = await fetch(`${PHOTON}/reverse?lat=${latlng[0]}&lon=${latlng[1]}&limit=1`, { signal })
    const data = await res.json()
    const p = data.features?.[0]?.properties
    if (!p) return 'Your location'
    return p.city || p.district || p.county || p.name || 'Your location'
  } catch {
    return 'Your location'
  }
}

const routeCache = new Map()

export async function getRoute(from, to) {
  const key = `${from.map((v) => v.toFixed(4))}|${to.map((v) => v.toFixed(4))}`
  if (routeCache.has(key)) return routeCache.get(key)
  const url = `${OSRM}/route/v1/driving/${from[1]},${from[0]};${to[1]},${to[0]}?overview=full&geometries=geojson`
  let res
  try {
    res = await fetch(url)
  } catch {
    await new Promise((r) => setTimeout(r, 1500))
    res = await fetch(url) // one quick retry for flaky mobile data
  }
  if (!res.ok) throw new Error('No route found')
  const data = await res.json()
  const r = data.routes?.[0]
  if (!r) throw new Error('No route found')
  const route = { ...buildRoute(r.geometry.coordinates.map(([lng, lat]) => [lat, lng])), duration: r.duration, distance: r.distance }
  routeCache.set(key, route)
  return route
}
