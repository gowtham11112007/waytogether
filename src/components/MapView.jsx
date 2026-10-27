import { useEffect, useRef } from 'react'
import * as maplibregl from 'maplibre-gl'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url'
import 'maplibre-gl/dist/maplibre-gl.css'
import { renderToStaticMarkup } from 'react-dom/server'
import { PLACE_KINDS } from '../data/placeKinds'
import { LEVEL, STATUS } from '../data/trip'
import { avatarFor } from '../lib/avatar'
import { haversine } from '../lib/geo'

// Vite can't follow MapLibre's dynamic worker path, so point it at the bundled file.
maplibregl.setWorkerUrl(workerUrl)

// Free map styles, no API keys: OpenFreeMap (OpenStreetMap vector tiles) and Esri imagery.
// Night is "fiord": clearer roads and labels than the very dark "dark" style. Satellite is a hybrid:
// imagery with Esri's road and place-name overlays, plus OpenStreetMap data for the places layer.
const OFM = 'https://tiles.openfreemap.org'
const ESRI = 'https://server.arcgisonline.com/ArcGIS/rest/services'
export const MAP_STYLES = {
  light: `${OFM}/styles/liberty`,
  dark: `${OFM}/styles/fiord`,
  satellite: {
    version: 8,
    glyphs: `${OFM}/fonts/{fontstack}/{range}.pbf`,
    sprite: `${OFM}/sprites/ofm_f384/ofm`,
    sources: {
      sat: { type: 'raster', tiles: [`${ESRI}/World_Imagery/MapServer/tile/{z}/{y}/{x}`], tileSize: 256, maxzoom: 19, attribution: 'Imagery © Esri, Maxar, Earthstar Geographics' },
      satRoads: { type: 'raster', tiles: [`${ESRI}/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}`], tileSize: 256, maxzoom: 19 },
      satLabels: { type: 'raster', tiles: [`${ESRI}/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}`], tileSize: 256, maxzoom: 19 },
      openmaptiles: { type: 'vector', url: `${OFM}/planet` },
    },
    layers: [
      { id: 'sat', type: 'raster', source: 'sat' },
      { id: 'sat-roads', type: 'raster', source: 'satRoads' },
      { id: 'sat-labels', type: 'raster', source: 'satLabels' },
    ],
  },
}

// Places riders look for (PLACE_KINDS), on every map style: a coloured badge with a white icon from the app's
// own icon set. Petrol, hotels and hospitals show from zoom 13; food, pharmacies, doctors, banks, ATMs and car
// services from zoom 15. Badges that would overlap are left out.
const KEY_PLACES = ['fuel', 'lodging', 'hospital']
const MORE_PLACES = Object.keys(PLACE_KINDS).filter((c) => !KEY_PLACES.includes(c))
const isEssential = ['match', ['get', 'class'], Object.keys(PLACE_KINDS), true, false]
const PLACE_LAYERS = ['cv-places-key', 'cv-places-more']

// Badge images: drawn once on a canvas at 3x (sharp on any phone), then added to each style that loads.
const BADGE_PX = 26
const BADGE_RATIO = 3
let badgeCache = null
function shape(el) {
  const n = (k) => parseFloat(el.getAttribute(k)) || 0
  if (el.tagName === 'path') return new Path2D(el.getAttribute('d'))
  const p = new Path2D()
  if (el.tagName === 'circle') p.arc(n('cx'), n('cy'), n('r'), 0, Math.PI * 2)
  else if (el.tagName === 'rect') p.roundRect ? p.roundRect(n('x'), n('y'), n('width'), n('height'), n('rx')) : p.rect(n('x'), n('y'), n('width'), n('height'))
  return p
}
function badgeImages() {
  if (badgeCache) return badgeCache
  badgeCache = {}
  const size = BADGE_PX * BADGE_RATIO
  const r = size / 2
  for (const [cls, [Icon, color, , weight = 2.4]] of Object.entries(PLACE_KINDS)) {
    const ctx = Object.assign(document.createElement('canvas'), { width: size, height: size }).getContext('2d')
    ctx.beginPath()
    ctx.arc(r, r, r - BADGE_RATIO, 0, Math.PI * 2)
    ctx.fillStyle = color
    ctx.fill()
    ctx.lineWidth = 2 * BADGE_RATIO
    ctx.strokeStyle = '#fff'
    ctx.stroke()
    // The icon in white, 14 px across in the middle (Lucide icons are line drawings on a 24-unit grid).
    const icon = 14 * BADGE_RATIO
    ctx.translate(r - icon / 2, r - icon / 2)
    ctx.scale(icon / 24, icon / 24)
    Object.assign(ctx, { lineWidth: weight, lineCap: 'round', lineJoin: 'round' })
    const svg = new DOMParser().parseFromString(renderToStaticMarkup(<Icon />), 'image/svg+xml').documentElement
    for (const el of svg.children) ctx.stroke(shape(el))
    badgeCache[cls] = ctx.getImageData(0, 0, size, size)
  }
  return badgeCache
}

// Night map roads, brighter than the style's own: highways and main roads in a soft gold (like the Default map's yellow).
const NIGHT_ROADS = [
  ['highway_major_casing', 'line-color', 'hsl(225,28%,27%)'],
  ['highway_major_inner', 'line-color', ['match', ['get', 'class'], ['trunk', 'primary'], 'hsl(38,38%,47%)', 'hsl(224,20%,58%)']],
  ['highway_motorway_inner', 'line-color', 'hsl(36,45%,52%)'],
  ['highway_name_other', 'text-color', 'hsl(220,30%,80%)'],
]

function addBadges(map, id, classes, minzoom, night, beforeId) {
  if (map.getLayer(id)) return
  map.addLayer(
    {
      id,
      type: 'symbol',
      source: 'openmaptiles',
      'source-layer': 'poi',
      minzoom,
      filter: ['match', ['get', 'class'], classes, true, false],
      layout: {
        'icon-image': ['concat', 'cv-badge-', ['get', 'class']],
        'icon-size': ['interpolate', ['linear'], ['zoom'], 13, 0.8, 17, 1],
        'icon-padding': 1,
        'text-field': ['step', ['zoom'], '', 15, ['coalesce', ['get', 'name_en'], ['get', 'name']]],
        'text-font': ['Noto Sans Regular'],
        'text-size': 11.5,
        'text-anchor': 'top',
        'text-offset': [0, 1.1],
        'text-max-width': 8,
        'text-optional': true,
      },
      paint: { 'text-color': night ? '#E8EDF3' : '#2F3A48', 'text-halo-color': night ? 'rgba(8,12,20,0.92)' : 'rgba(255,255,255,0.96)', 'text-halo-width': 1.5 },
    },
    beforeId,
  )
}

// Our additions to whichever style loaded: place badges and clearer roads and labels.
function addMapExtras(map, night) {
  const layers = map.getStyle()?.layers || []
  const satellite = !!map.getLayer('sat')
  // Default map: woods and grass a little greener, so parks, woods and towns read apart.
  if (!night && !satellite) {
    if (map.getLayer('landcover_wood')) map.setPaintProperty('landcover_wood', 'fill-opacity', 0.6)
    if (map.getLayer('landcover_grass')) map.setPaintProperty('landcover_grass', 'fill-opacity', 0.45)
  }
  if (night) for (const [id, prop, value] of NIGHT_ROADS) if (map.getLayer(id)) map.setPaintProperty(id, prop, value)
  if (!map.getSource('openmaptiles')) return
  for (const [cls, img] of Object.entries(badgeImages())) {
    if (!map.hasImage(`cv-badge-${cls}`)) map.addImage(`cv-badge-${cls}`, img, { pixelRatio: BADGE_RATIO })
  }
  // Under town and village names (they keep priority when crowded), above road names and the style's own places.
  const placeNames = layers.find((l) => l.type === 'symbol' && l['source-layer'] === 'place')?.id
  addBadges(map, 'cv-places-more', MORE_PLACES, 15, night, placeNames)
  addBadges(map, 'cv-places-key', KEY_PLACES, 13, night, placeNames)
  for (const l of layers) {
    if (l.id.startsWith('cv-')) continue
    // Clearer names: a stronger halo, so labels read over roads, parks and buildings.
    if (l.type === 'symbol' && l.layout?.['text-field']) {
      map.setPaintProperty(l.id, 'text-halo-width', 1.6)
      map.setPaintProperty(l.id, 'text-halo-color', night ? 'rgba(10,14,22,0.92)' : 'rgba(255,255,255,0.95)')
    }
    // The style's own place icons leave the essentials to our badges (no doubles).
    if (l['source-layer'] === 'poi') map.setFilter(l.id, ['all', l.filter || true, ['!', isEssential]])
  }
}

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
const pinHTML = (color, label, kind = 'dest', icon = null) =>
  `<div class="place place-${kind}"><svg width="30" height="38" viewBox="0 0 28 36"><path d="M14 0C6.3 0 0 6.1 0 13.7 0 24 14 36 14 36s14-12 14-22.3C28 6.1 21.7 0 14 0z" fill="${color}"/>${
    icon || (kind === 'regroup' ? '<path d="M10 8v12M10 8h8l-2 3 2 3h-8" stroke="#fff" stroke-width="2" fill="none" stroke-linejoin="round"/>' : '<circle cx="14" cy="13.5" r="5" fill="#fff"/>')
  }</svg>${label ? `<span>${esc(label)}</span>` : ''}</div>`
// A stop the group picked from a place on the map (petrol, food…): its badge colour and icon.
function stopPin(regroup) {
  const [Icon, color] = PLACE_KINDS[regroup?.kind] || []
  if (!Icon) return pinHTML('#0284C7', regroup?.name || 'Regroup', 'regroup')
  return pinHTML(color, regroup.name, 'regroup', renderToStaticMarkup(<Icon x={7} y={6.5} width={14} height={14} color="#fff" strokeWidth={2.6} />))
}

// A calm map: one-way arrows always hidden ("road_one_way…" in Default, "road_oneway…" in Night);
// the style's own 3D buildings always hidden (a flat, clean map); places ("poi_…" and our badges) as switched in Settings.
// A Nearby category (e.g. petrol) shows only those badges, from further out, whatever the setting.
function applyLayers(map, { places, category }) {
  for (const l of map.getStyle()?.layers || []) {
    let show = null
    if (/one_?way/.test(l.id)) show = false
    else if (/^poi/.test(l.id)) show = !!places && !category
    else if (/^cv-places/.test(l.id)) show = !!places || !!category
    else if (/building-3d/.test(l.id)) show = false
    if (show != null) map.setLayoutProperty(l.id, 'visibility', show ? 'visible' : 'none')
  }
  if (!map.getLayer('cv-places-key')) return
  map.setFilter('cv-places-key', ['match', ['get', 'class'], category || KEY_PLACES, true, false])
  map.setLayerZoomRange('cv-places-key', category ? 11 : 13, 24)
  map.setLayoutProperty('cv-places-more', 'visibility', category ? 'none' : places ? 'visible' : 'none')
}

// Places of a Nearby category in the loaded map tiles, nearest first.
function nearbyPlaces(map, category, from) {
  const seen = new Set()
  const out = []
  for (const f of map.querySourceFeatures('openmaptiles', { sourceLayer: 'poi', filter: ['match', ['get', 'class'], category, true, false] })) {
    if (f.geometry.type !== 'Point') continue
    const [lng, lat] = f.geometry.coordinates
    const cls = f.properties.class
    const name = f.properties.name_en || f.properties.name || PLACE_KINDS[cls]?.[2] || 'Place'
    const key = f.id ?? `${name}${lat.toFixed(4)}${lng.toFixed(4)}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push({ id: `poi${key}`, name, kind: PLACE_KINDS[cls]?.[2] || '', cls, latlng: [lat, lng], dist: from ? haversine(from, [lat, lng]) : 0 })
  }
  return out.sort((a, b) => a.dist - b.dist).slice(0, 12)
}

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
  places = false, category = null, onPlaces, onPlaceClick,
}) {
  const box = useRef(null)
  const mapRef = useRef(null)
  const ready = useRef(false)
  const fitted = useRef(false)
  const friendMarkers = useRef(new Map())
  const meMarker = useRef(null)
  const placeMarkers = useRef({})
  const latest = useRef({})
  latest.current = { me, route, padding, onUserMove, onCenterChange, onSelect, mode, places, category, onPlaces, onPlaceClick, night: styleKey === 'dark' }

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
      dragRotate: true,
      pitchWithRotate: true,
      refreshExpiredTiles: false,
    })
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-left')
    // Start the credits collapsed to the small (i) button; tapping it shows them. MapLibre opens them once,
    // when the first credit arrives, so close them right then (not after loading, which takes a while in 3D).
    const attrib = box.current.querySelector('.maplibregl-ctrl-attrib')
    const creditEvents = ['styledata', 'sourcedata', 'terrain']
    const collapseCredits = () => {
      if (!attrib?.classList.contains('maplibregl-compact')) return
      attrib.classList.remove('maplibregl-compact-show')
      creditEvents.forEach((e) => map.off(e, collapseCredits))
    }
    creditEvents.forEach((e) => map.on(e, collapseCredits))
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
    // Tapping a place badge opens it (route preview on the home map).
    for (const id of PLACE_LAYERS) {
      map.on('click', id, (e) => {
        const f = e.features?.[0]
        const cb = latest.current.onPlaceClick
        if (!f || !cb) return
        const [lng, lat] = f.geometry.coordinates
        const cls = f.properties.class
        cb({ id: `poi${f.id ?? `${lat}${lng}`}`, name: f.properties.name_en || f.properties.name || PLACE_KINDS[cls]?.[2] || 'Place', area: PLACE_KINDS[cls]?.[2] || '', cls, latlng: [lat, lng] })
      })
      map.on('mouseenter', id, () => latest.current.onPlaceClick && (map.getCanvas().style.cursor = 'pointer'))
      map.on('mouseleave', id, () => (map.getCanvas().style.cursor = ''))
    }
    map.on('style.load', () => {
      addMapExtras(map, latest.current.night)
      applyLayers(map, latest.current)
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
    // A full rebuild (not a diff) so 'style.load' always fires and our route layers get added back.
    map.setStyle(MAP_STYLES[styleKey] || MAP_STYLES.light, { diff: false })
  }, [styleKey])

  // ---- places switched in Settings, or a Nearby category ----
  const categoryKey = category?.join(',') || ''
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    if (ready.current) applyLayers(map, { places, category })
    if (!category) return
    // List what's on the map around you once tiles settle, and again after every pan or zoom.
    let last = ''
    const report = () => {
      const list = nearbyPlaces(map, category, latest.current.me?.latlng)
      const ids = list.map((p) => p.id).join()
      if (ids !== last) {
        last = ids
        latest.current.onPlaces?.(list)
      }
    }
    map.on('idle', report)
    if (ready.current) report()
    return () => map.off('idle', report)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [places, categoryKey])

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
  const placeKey = JSON.stringify([dest?.latlng, dest?.name, start?.latlng, regroup?.latlng, regroup?.name, regroup?.kind])
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const set = (k, p, html, anchor) => {
      placeMarkers.current[k]?.remove()
      placeMarkers.current[k] = p?.latlng ? new maplibregl.Marker({ element: makeEl(html, 'cv-place'), anchor }).setLngLat(ll(p.latlng)).addTo(map) : null
    }
    set('dest', dest, pinHTML('#E5383B', dest?.name), 'bottom')
    set('start', start, '<div class="start-dot"></div>', 'center')
    set('regroup', regroup, stopPin(regroup), 'bottom')
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

  const MARGIN = { top: 28, bottom: 28, left: 44, right: 72 } // the right edge has the round map buttons

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
        pitch: nav ? 60 : 0,
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
      const cam = map.cameraForBounds(b, { padding: MARGIN, maxZoom: 16, pitch: 0 })
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
