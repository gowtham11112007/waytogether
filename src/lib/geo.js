const R = 6371000
const rad = (d) => (d * Math.PI) / 180

// Distance in metres between two [lat, lng] points.
export function haversine(a, b) {
  const dLat = rad(b[0] - a[0])
  const dLng = rad(b[1] - a[1])
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(s))
}

export function bearing(a, b) {
  const y = Math.sin(rad(b[1] - a[1])) * Math.cos(rad(b[0]))
  const x =
    Math.cos(rad(a[0])) * Math.sin(rad(b[0])) -
    Math.sin(rad(a[0])) * Math.cos(rad(b[0])) * Math.cos(rad(b[1] - a[1]))
  return (Math.atan2(y, x) * 180) / Math.PI
}

// Precomputes cumulative distances so we can place riders by "metres along the route".
export function buildRoute(coords) {
  const cum = [0]
  for (let i = 1; i < coords.length; i++) cum.push(cum[i - 1] + haversine(coords[i - 1], coords[i]))
  return { coords, cum, total: cum[cum.length - 1] }
}

export function pointAt(route, d) {
  const { coords, cum, total } = route
  const dist = Math.max(0, Math.min(total, d))
  let lo = 0
  let hi = cum.length - 1
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1
    if (cum[mid] <= dist) lo = mid
    else hi = mid
  }
  const seg = cum[hi] - cum[lo] || 1
  const t = (dist - cum[lo]) / seg
  const a = coords[lo]
  const b = coords[hi]
  return {
    latlng: [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t],
    heading: bearing(a, b),
    index: lo,
  }
}

// Moves a point sideways (perpendicular to the heading) — used for "off route" riders.
export function offsetSideways(latlng, heading, metres) {
  const h = rad(heading + 90)
  const dLat = (metres * Math.cos(h)) / 111320
  const dLng = (metres * Math.sin(h)) / (111320 * Math.cos(rad(latlng[0])))
  return [latlng[0] + dLat, latlng[1] + dLng]
}

export function formatDistance(m) {
  if (m < 50) return 'With you'
  if (m < 1000) return `${Math.round(m / 10) * 10} m`
  return `${(m / 1000).toFixed(1)} km`
}

export function timeAgo(ms) {
  const s = Math.max(0, Math.round(ms / 1000))
  if (s < 3) return 'now'
  if (s < 60) return `${s}s ago`
  if (s < 3600) return `${Math.floor(s / 60)} min ago`
  return `${Math.floor(s / 3600)} hr ago`
}

// Closest point on the route: how far off-route someone is, and how far along they are.
export function nearestOnRoute(route, latlng) {
  const { coords, cum } = route
  const kx = 111320 * Math.cos(rad(latlng[0]))
  const ky = 110540
  let best = { off: Infinity, along: 0 }
  for (let i = 0; i < coords.length - 1; i++) {
    const ax = (coords[i][1] - latlng[1]) * kx
    const ay = (coords[i][0] - latlng[0]) * ky
    const bx = (coords[i + 1][1] - latlng[1]) * kx
    const by = (coords[i + 1][0] - latlng[0]) * ky
    const dx = bx - ax
    const dy = by - ay
    const len2 = dx * dx + dy * dy || 1
    const t = Math.max(0, Math.min(1, -(ax * dx + ay * dy) / len2))
    const px = ax + dx * t
    const py = ay + dy * t
    const d = Math.hypot(px, py)
    if (d < best.off) best = { off: d, along: cum[i] + (cum[i + 1] - cum[i]) * t }
  }
  return best
}

export function formatDuration(sec) {
  const m = Math.max(1, Math.round(sec / 60))
  if (m < 60) return `${m} min`
  const h = Math.floor(m / 60)
  return `${h} hr ${m % 60} min`
}

export function formatKm(m) {
  return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(m < 10000 ? 1 : 0)} km`
}
