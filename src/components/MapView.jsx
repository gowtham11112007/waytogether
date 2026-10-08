import { useEffect, useRef } from 'react'
import * as maplibregl from 'maplibre-gl'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url'
import 'maplibre-gl/dist/maplibre-gl.css'
import { renderToStaticMarkup } from 'react-dom/server'
import { LEVEL, STATUS } from '../data/trip'
import { avatarFor } from '../lib/avatar'

// Vite can't follow MapLibre's dynamic worker path, so point it at the bundled file.
maplibregl.setWorkerUrl(workerUrl)

// Free map styles: OpenFreeMap (OpenStreetMap vector tiles) and Esri imagery. No API keys.
export const MAP_STYLES = {
  light: 'https://tiles.openfreemap.org/styles/liberty',
  dark: 'https://tiles.openfreemap.org/styles/dark',
  satellite: {
    version: 8,
    sources: {
      sat: {
        type: 'raster',
        tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
        tileSize: 256,
        maxzoom: 19,
        attribution: 'Imagery © Esri, Maxar, Earthstar Geographics',
      },
    },
    layers: [{ id: 'sat', type: 'raster', source: 'sat' }],
  },
}
const OSM_ATTRIBUTION = '<a href="https://openfreemap.org" target="_blank">OpenFreeMap</a> © <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>'
const INDIA = [78.9, 20.6]
const ll = (latlng) => [latlng[1], latlng[0]] // [lat,lng] → MapLibre [lng,lat]
const esc = (s) => String(s || '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])

// ---------- marker elements ----------
function friendHTML(m, selected) {
  const st = STATUS[m.state] || STATUS.riding
  const lv = LEVEL[st.level]
  const badge =
    m.state !== 'riding'
      ? `<span class="fm-badge" style="background:${lv.color}">${renderToStaticMarkup(<st.Icon size={12} strokeWidth={2.6} color="#fff" />)}</span>`
      : ''
  return `<div class="fm ${selected ? 'is-selected' : ''} ${st.level === 'danger' ? 'is-danger' : ''} ${m.state === 'offline' ? 'is-offline' : ''}" style="--ring:${lv.color}">
      <div class="fm-pin"><img src="${esc(avatarFor(m))}" alt="" referrerpolicy="no-referrer" draggable="false" /></div>
      ${badge}
      <div class="fm-name">${esc(m.name)}</div>
    </div>`
}
const pinHTML = (color, label, kind = 'dest') =>
  `<div class="place place-${kind}"><svg width="30" height="38" viewBox="0 0 28 36"><path d="M14 0C6.3 0 0 6.1 0 13.7 0 24 14 36 14 36s14-12 14-22.3C28 6.1 21.7 0 14 0z" fill="${color}"/>${
    kind === 'regroup' ? '<path d="M10 8v12M10 8h8l-2 3 2 3h-8" stroke="#fff" stroke-width="2" fill="none" stroke-linejoin="round"/>' : '<circle cx="14" cy="13.5" r="5" fill="#fff"/>'
  }</svg>${label ? `<span>${esc(label)}</span>` : ''}</div>`

function makeEl(html, className = '') {
  const el = document.createElement('div')
  el.className = `cv-mk ${className}`
  el.innerHTML = html
  return el
}

// Glide a marker to its new position instead of jumping (GPS arrives every few seconds).
function glide(marker, to, ms = 900) {
  const from = marker.getLngLat()
  const dx = to[0] - from.lng
  const dy = to[1] - from.lat
  if (Math.abs(dx) + Math.abs(dy) < 1e-7) return
  if (Math.abs(dx) + Math.abs(dy) > 0.05) {
    marker.setLngLat(to) // big jump (reconnect): no animation
    return
  }
  cancelAnimationFrame(marker._raf)
  const t0 = performance.now()
  const step = (t) => {
    const k = Math.min(1, (t - t0) / ms)
    const e = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2
    marker.setLngLat([from.lng + dx * e, from.lat + dy * e])
    if (k < 1) marker._raf = requestAnimationFrame(step)
  }
  marker._raf = requestAnimationFrame(step)
}

function circlePolygon(latlng, radius) {
  const pts = []
  const kx = 111320 * Math.cos((latlng[0] * Math.PI) / 180)
  for (let i = 0; i <= 48; i++) {
    const a = (i / 48) * Math.PI * 2
    pts.push([latlng[1] + (radius * Math.cos(a)) / kx, latlng[0] + (radius * Math.sin(a)) / 110540])
  }
  return { type: 'Feature', geometry: { type: 'Polygon', coordinates: [pts] } }
}
const line = (coords) => ({ type: 'Feature', geometry: { type: 'LineString', coordinates: coords.map(ll) } })
const EMPTY = { type: 'FeatureCollection', features: [] }

function boundsOf(points) {
  const b = new maplibregl.LngLatBounds()
  points.forEach((p) => b.extend(ll(p)))
  return b
}

/**
 * The map. Props:
 * - me {latlng, heading, accuracy, status}, friends [], route {coords, cum}, dest/start/regroup {latlng, name}
 * - mode: 'group' (keep everyone in view) | 'me' (follow) | 'nav' (3D heading-up) | 'free'
 * - focus: {type:'fit', points} | {type:'point', latlng, zoom}  (one-shot camera moves)
 * - padding: {top, bottom} screen space covered by UI
 */
export default function MapView({
  me, friends = [], route, dest, start, regroup, selectedId, onSelect, focus, mode = 'free',
  onUserMove, onCenterChange, padding = { top: 100, bottom: 260 }, styleKey = 'light', interactive = true,
}) {
  const box = useRef(null)
  const mapRef = useRef(null)
  const ready = useRef(false)
  const fitted = useRef(false)
  const friendMarkers = useRef(new Map())
  const meMarker = useRef(null)
  const placeMarkers = useRef({})
  const latest = useRef({})
  latest.current = { me, route, padding, onUserMove, onCenterChange, onSelect, mode }

  // ---- create the map once ----
  useEffect(() => {
    const map = new maplibregl.Map({
      container: box.current,
      style: MAP_STYLES[styleKey] || MAP_STYLES.light,
      center: me?.latlng ? ll(me.latlng) : INDIA,
      zoom: me?.latlng ? 15.5 : 4,
      attributionControl: false,
      interactive,
      fadeDuration: 0,
      maxPitch: 65,
      dragRotate: true,
      pitchWithRotate: true,
      refreshExpiredTiles: false,
    })
    map.addControl(new maplibregl.AttributionControl({ compact: true, customAttribution: styleKey === 'satellite' ? OSM_ATTRIBUTION : undefined }), 'bottom-left')
    // Start the credits collapsed to the small (i) button; tapping it shows them.
    map.once('load', () => box.current?.querySelector('.maplibregl-ctrl-attrib')?.classList.remove('maplibregl-compact-show'))
    // Any touch, drag, pinch or scroll on the map hands the camera to the user (like Google Maps).
    // Listening on the DOM catches gestures that start mid-animation, which MapLibre's movestart misses.
    const handBack = () => latest.current.onUserMove?.()
    const surface = map.getCanvasContainer()
    surface.addEventListener('pointerdown', handBack, { passive: true })
    surface.addEventListener('touchstart', handBack, { passive: true })
    surface.addEventListener('wheel', handBack, { passive: true })
    map.on('movestart', (e) => {
      if (e.originalEvent) handBack()
    })
    map.on('move', () => {
      const cb = latest.current.onCenterChange
      if (cb) {
        const c = map.getCenter()
        cb([c.lat, c.lng])
      }
    })
    map.on('style.load', () => {
      // Calm map: hide shop/POI clutter and one-way arrows.
      for (const l of map.getStyle().layers || []) {
        if (/poi|one_way|building-3d/.test(l.id)) map.setLayoutProperty(l.id, 'visibility', 'none')
      }
      map.addSource('accuracy', { type: 'geojson', data: EMPTY })
      map.addLayer({ id: 'accuracy-fill', type: 'fill', source: 'accuracy', paint: { 'fill-color': '#1A73E8', 'fill-opacity': 0.1 } })
      map.addLayer({ id: 'accuracy-line', type: 'line', source: 'accuracy', paint: { 'line-color': '#1A73E8', 'line-opacity': 0.35, 'line-width': 1 } })
      map.addSource('route-done', { type: 'geojson', data: EMPTY })
      map.addSource('route-ahead', { type: 'geojson', data: EMPTY })
      const round = { 'line-cap': 'round', 'line-join': 'round' }
      map.addLayer({ id: 'route-done-casing', type: 'line', source: 'route-done', layout: round, paint: { 'line-color': '#ffffff', 'line-width': 9 } })
      map.addLayer({ id: 'route-done', type: 'line', source: 'route-done', layout: round, paint: { 'line-color': '#9AA6B8', 'line-width': 5 } })
      map.addLayer({ id: 'route-ahead-casing', type: 'line', source: 'route-ahead', layout: round, paint: { 'line-color': '#ffffff', 'line-width': 10 } })
      map.addLayer({ id: 'route-ahead', type: 'line', source: 'route-ahead', layout: round, paint: { 'line-color': '#1A73E8', 'line-width': 6 } })
      ready.current = true
      map.fire('cv:ready')
    })
    const ro = new ResizeObserver(() => map.resize())
    ro.observe(box.current)
    mapRef.current = map
    return () => {
      ro.disconnect()
      friendMarkers.current.forEach((m) => m.remove())
      friendMarkers.current.clear()
      meMarker.current?.remove()
      meMarker.current = null
      Object.values(placeMarkers.current).forEach((m) => m?.remove())
      placeMarkers.current = {}
      fitted.current = false
      map.remove()
      mapRef.current = null
      ready.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ---- style switch (light / dark / satellite) ----
  const styleRef = useRef(styleKey)
  useEffect(() => {
    const map = mapRef.current
    if (!map || styleRef.current === styleKey) return
    styleRef.current = styleKey
    ready.current = false
    map.setStyle(MAP_STYLES[styleKey] || MAP_STYLES.light)
  }, [styleKey])

  // ---- route + accuracy (GeoJSON layers) ----
  const alongKey = me?.along == null ? -1 : Math.round(me.along / 60)
  const accKey = me?.latlng ? `${me.latlng[0].toFixed(5)},${me.latlng[1].toFixed(5)},${me.accuracy}` : ''
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const apply = () => {
      if (!ready.current) return
      const { route: r, me: m } = latest.current
      let done = []
      let ahead = []
      if (r) {
        if (m?.along == null) ahead = r.coords
        else {
          let i = r.cum.findIndex((c) => c >= m.along)
          if (i < 0) i = r.coords.length - 1
          done = r.coords.slice(0, i + 1)
          ahead = r.coords.slice(Math.max(0, i))
          if (m?.latlng && m.off != null && m.off < 60) {
            done = [...done, m.latlng]
            ahead = [m.latlng, ...ahead]
          }
        }
      }
      map.getSource('route-done')?.setData(done.length > 1 ? line(done) : EMPTY)
      map.getSource('route-ahead')?.setData(ahead.length > 1 ? line(ahead) : EMPTY)
      map.getSource('accuracy')?.setData(m?.latlng && m.accuracy > 20 ? circlePolygon(m.latlng, m.accuracy) : EMPTY)
    }
    apply()
    map.on('cv:ready', apply)
    return () => map.off('cv:ready', apply)
  }, [route, alongKey, accKey, styleKey])

  // ---- you: blue dot with heading cone ----
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    if (!me?.latlng) {
      meMarker.current?.remove()
      meMarker.current = null
      return
    }
    if (!meMarker.current) {
      const el = makeEl('<div class="me"><div class="me-cone"></div><div class="me-halo"></div><div class="me-dot"></div></div>', 'cv-me')
      meMarker.current = new maplibregl.Marker({ element: el, anchor: 'center', rotationAlignment: 'map', pitchAlignment: 'map' })
        .setLngLat(ll(me.latlng))
        .addTo(map)
    } else glide(meMarker.current, ll(me.latlng))
    meMarker.current.setRotation(me.heading || 0)
    meMarker.current.getElement().classList.toggle('is-sos', me.status === 'sos')
  }, [me?.latlng?.[0], me?.latlng?.[1], me?.heading, me?.status, me?.latlng])

  // ---- friends ----
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const seen = new Set()
    for (const f of friends) {
      if (!f.latlng) continue
      seen.add(f.id)
      const key = `${f.name}|${f.photo || ''}|${f.state}|${f.id === selectedId}`
      let mk = friendMarkers.current.get(f.id)
      if (!mk) {
        const el = makeEl(friendHTML(f, f.id === selectedId), 'cv-friend')
        el.addEventListener('click', (e) => {
          e.stopPropagation()
          latest.current.onSelect?.(f.id)
        })
        el.dataset.key = key
        mk = new maplibregl.Marker({ element: el, anchor: 'center' }).setLngLat(ll(f.latlng)).addTo(map)
        friendMarkers.current.set(f.id, mk)
      } else {
        const el = mk.getElement()
        if (el.dataset.key !== key) {
          el.innerHTML = friendHTML(f, f.id === selectedId)
          el.dataset.key = key
        }
        glide(mk, ll(f.latlng))
      }
      mk.getElement().style.zIndex = f.id === selectedId ? 30 : f.state === 'riding' ? 10 : 20
    }
    for (const [id, mk] of friendMarkers.current) {
      if (!seen.has(id)) {
        mk.remove()
        friendMarkers.current.delete(id)
      }
    }
  }, [friends, selectedId])

  // ---- destination / start / regroup pins ----
  const placeKey = JSON.stringify([dest?.latlng, dest?.name, start?.latlng, regroup?.latlng, regroup?.name])
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const set = (k, p, html, anchor) => {
      placeMarkers.current[k]?.remove()
      placeMarkers.current[k] = p?.latlng ? new maplibregl.Marker({ element: makeEl(html, 'cv-place'), anchor }).setLngLat(ll(p.latlng)).addTo(map) : null
    }
    set('dest', dest, pinHTML('#E5383B', dest?.name), 'bottom')
    set('start', start, '<div class="start-dot"></div>', 'center')
    set('regroup', regroup, pinHTML('#0284C7', regroup?.name || 'Regroup', 'regroup'), 'bottom')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placeKey])

  // ---- screen space covered by panels: kept as the map's own padding ----
  // MapLibre adds fit padding on top of this, so camera moves below only pass small margins.
  const padTop = padding.top
  const padBottom = padding.bottom
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    // Set instantly: an animated padding change would be cancelled by the next camera move and stay at 0.
    map.setPadding({ top: padTop, bottom: padBottom, left: 0, right: 0 })
  }, [padTop, padBottom])

  const MARGIN = { top: 28, bottom: 28, left: 44, right: 44 }

  // ---- one-shot camera moves ----
  useEffect(() => {
    const map = mapRef.current
    if (!map || !focus) return
    if (focus.padding) map.setPadding({ top: focus.padding.top, bottom: focus.padding.bottom, left: 0, right: 0 })
    if (focus.type === 'fit' && focus.points?.length > 1) {
      map.fitBounds(boundsOf(focus.points), { padding: MARGIN, maxZoom: 16, duration: 900, bearing: 0, pitch: 0 })
    } else {
      const p = focus.type === 'fit' ? focus.points?.[0] : focus.latlng
      if (p) map.easeTo({ center: ll(p), zoom: focus.zoom ?? Math.max(map.getZoom(), 15.5), bearing: 0, pitch: 0, duration: 900 })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus])

  // ---- continuous camera modes ----
  const pointsKey = [me?.latlng, ...friends.map((f) => f.latlng)].map((p) => (p ? `${p[0].toFixed(5)},${p[1].toFixed(5)}` : '')).join('|')
  useEffect(() => {
    const map = mapRef.current
    if (!map || mode === 'free') return
    const first = !fitted.current
    if ((mode === 'me' || mode === 'nav') && me?.latlng) {
      fitted.current = true
      const nav = mode === 'nav'
      map.easeTo({
        center: ll(me.latlng),
        zoom: nav ? Math.max(map.getZoom(), 16.5) : map.getZoom() < 13 ? 15.5 : map.getZoom(),
        bearing: nav ? me.heading || 0 : 0,
        pitch: nav ? 55 : 0,
        offset: nav ? [0, 110] : [0, 0], // in navigation view you sit low on screen, road ahead visible
        duration: first ? 0 : 1000,
      })
      return
    }
    if (mode === 'group') {
      const pts = [me?.latlng, ...friends.map((f) => f.latlng)].filter(Boolean)
      if (!pts.length) return
      fitted.current = true
      if (pts.length === 1) {
        map.easeTo({ center: ll(pts[0]), zoom: first ? 15.5 : map.getZoom(), bearing: 0, pitch: 0, duration: first ? 0 : 1000 })
        return
      }
      const b = boundsOf(pts)
      const cam = map.cameraForBounds(b, { padding: MARGIN, maxZoom: 16 })
      if (!cam) return
      const z = map.getZoom()
      // Zoom out as soon as someone would leave the screen; zoom in only with a full level to spare (no jitter).
      const zoom = first || cam.zoom < z || cam.zoom > z + 1 ? cam.zoom : z
      map.easeTo({ center: cam.center, zoom, bearing: 0, pitch: 0, duration: first ? 0 : 1000 })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, pointsKey, me?.heading, padTop, padBottom])

  return <div ref={box} className="cv-map h-full w-full" style={{ '--map-bottom': `${padding.bottom}px` }} />
}
