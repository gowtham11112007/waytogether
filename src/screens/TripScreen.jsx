import { useEffect, useRef, useState } from 'react'
import { App as NativeApp } from '@capacitor/app'
import { KeepAwake } from '@capacitor-community/keep-awake'
import { CircleCheck, CloudRain, Copy, Eye, Flag, LocateFixed, Menu, Music2, Navigation2, Share2, Siren, Users } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import MapView from '../components/MapView'
import CheckInPrompt from '../components/CheckInPrompt'
import ConvoySheet, { DETAIL_HEIGHT, PEEK_HEIGHT } from '../components/ConvoySheet'
import FriendDetail from '../components/FriendDetail'
import MusicSheet from '../components/MusicSheet'
import SearchView from '../components/SearchView'
import StatusSheet from '../components/StatusSheet'
import SOSScreen from '../components/SOSScreen'
import RulesSheet from '../components/RulesSheet'
import TripMenu from '../components/TripMenu'
import { Avatar, ConfirmDialog, ModalSheet, PrimaryButton, ToastSlot } from '../components/ui'
import { STATUS } from '../data/trip'
import { googleMapsDirections, openExternal } from '../lib/external'
import { formatClock, formatDistance, formatKm, speedUnit, speedValue, timeAgo } from '../lib/geo'
import { inviteText, inviteUrl, watchText } from '../lib/invite'
import { rainy, weatherAt } from '../lib/weather'
import { haptic } from '../lib/notify'
import { placeName } from '../lib/places'
import { setSetting, useMapStyle, useSettings } from '../lib/settings'
import { useTrip } from '../state/TripContext'

async function shareText(text, notify, copiedTitle) {
  try {
    if (navigator.share) {
      await navigator.share({ title: 'WayTogether', text })
      return
    }
  } catch (e) {
    if (e?.name === 'AbortError') return
  }
  try {
    await navigator.clipboard.writeText(text)
    notify({ level: 'ok', Icon: CircleCheck, title: copiedTitle, body: 'Paste it in WhatsApp or SMS.' })
  } catch {
    notify({ level: 'info', Icon: CircleCheck, title: text })
  }
}

function ConnPill({ conn }) {
  const map = {
    live: ['Live', 'text-ok', 'bg-ok'],
    connecting: ['Connecting', 'text-amber-600', 'bg-warn'],
    closed: ['Offline', 'text-ink-3', 'bg-gray-400'],
    idle: ['Offline', 'text-ink-3', 'bg-gray-400'],
  }
  const [label, text, dot] = map[conn] || map.connecting
  return (
    <span className={`flex shrink-0 items-center gap-1.5 text-[12.5px] font-bold ${text}`}>
      <span className={`h-2 w-2 rounded-full ${dot} ${conn === 'live' ? 'animate-live' : ''}`} /> {label}
    </span>
  )
}

const FloatBtn = ({ active, onClick, label, children, tone = 'ink' }) => (
  <button
    onClick={onClick}
    aria-label={label}
    className={`flex h-12 w-12 items-center justify-center rounded-full shadow-[0_4px_12px_rgba(17,24,39,0.18)] active:scale-95 ${active ? 'bg-brand text-white' : tone === 'brand' ? 'bg-white text-brand' : 'bg-white text-ink-2'}`}
  >
    {children}
  </button>
)

export default function TripScreen({ loc, onOpenSettings }) {
  const t = useTrip()
  const settings = useSettings()
  const mapStyle = useMapStyle()
  const [selectedId, setSelectedId] = useState(null)
  const [focus, setFocus] = useState(null)
  const [mode, setMode] = useState('group')
  const [expanded, setExpanded] = useState(false)
  const [tab, setTab] = useState('friends')
  const [statusOpen, setStatusOpen] = useState(false)
  const [sosOpen, setSosOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [musicOpen, setMusicOpen] = useState(false)
  const [inviteOpen, setInviteOpen] = useState(() => t.role === 'leader' && Date.now() - (t.trip?.createdAt || 0) < 15000)
  const [confirm, setConfirm] = useState(null) // { title, body, label, danger, run }
  const [searching, setSearching] = useState(false)
  const [dragging, setDragging] = useState(false) // the convoy panel is under a finger
  const [rulesOpen, setRulesOpen] = useState(false)
  const [pinMode, setPinMode] = useState(false)
  const [pinCenter, setPinCenter] = useState(null)
  const [pinName, setPinName] = useState('')

  const me = t.me
  const sosActive = me?.status === 'sos'
  const selected = t.members.find((m) => m.id === selectedId)
  const emergencies = t.friends.filter((f) => f.state === 'sos' || f.state === 'noreply')
  const sheetHeight = pinMode ? 190 : expanded ? 0 : selected ? DETAIL_HEIGHT : PEEK_HEIGHT
  // Keep riders clear of the SOS button and map controls that float above the sheet,
  // and of the emergency banners under the header.
  const controlsShown = !expanded && !pinMode
  const mapBottom = sheetHeight + (controlsShown ? 84 : 16)
  const mapTop = 96 + (pinMode ? 0 : Math.min(emergencies.length, 2) * 72)

  // Keep the screen on during the trip (setting).
  useEffect(() => {
    if (!settings.keepAwake) return
    KeepAwake.keepAwake().catch(() => {})
    return () => {
      KeepAwake.allowSleep().catch(() => {})
    }
  }, [settings.keepAwake])

  // Android back button: close the top-most layer first, then minimise (sharing keeps running).
  const layers = useRef({})
  layers.current = { sosOpen, statusOpen, selectedId, expanded, inviteOpen, sosActive, menuOpen, musicOpen, searching, pinMode, confirm }
  useEffect(() => {
    const onBack = () => {
      const l = layers.current
      if (l.confirm) setConfirm(null)
      else if (l.searching) setSearching(false)
      else if (l.pinMode) setPinMode(false)
      else if (l.inviteOpen) setInviteOpen(false)
      else if (l.menuOpen) setMenuOpen(false)
      else if (l.musicOpen) setMusicOpen(false)
      else if (l.sosOpen && !l.sosActive) setSosOpen(false)
      else if (l.statusOpen) setStatusOpen(false)
      else if (l.selectedId) setSelectedId(null)
      else if (l.expanded) setExpanded(false)
      else NativeApp.minimizeApp().catch(() => {})
    }
    window.addEventListener('convoya:back', onBack)
    return () => window.removeEventListener('convoya:back', onBack)
  }, [])

  // Name the spot under the regroup crosshair once the map settles.
  useEffect(() => {
    if (!pinMode || !pinCenter) return
    const ctl = new AbortController()
    const id = setTimeout(() => placeName(pinCenter, ctl.signal).then((n) => setPinName(n === 'Your location' ? 'Dropped pin' : n)), 500)
    return () => {
      clearTimeout(id)
      ctl.abort()
    }
  }, [pinMode, pinCenter])

  const focusFriend = (id) => {
    const m = t.members.find((x) => x.id === id)
    setSelectedId(id)
    setExpanded(false)
    if (m?.latlng) {
      setMode('free')
      setFocus({ type: 'point', latlng: m.latlng, zoom: 16, n: Date.now() })
    }
  }

  const ask = (c) => {
    setMenuOpen(false)
    setConfirm(c)
  }

  // An SOS already has its own banner up top; don't repeat it as a toast.
  const toastShown = t.toast && !(t.toast.kind === 'sos' && emergencies.some((e) => e.id === t.toast.memberId))
  const toast = toastShown && { ...t.toast, member: t.toast.memberId ? t.members.find((m) => m.id === t.toast.memberId) : null }
  const shareFamily = () => shareText(watchText(t.trip, t.code), t.notify, 'Live view link copied')

  // Rain on the way: warn the convoy once per trip (checked now, then every 20 minutes).
  const rainWarned = useRef(false)
  const destKey = t.trip.dest?.latlng?.join()
  useEffect(() => {
    rainWarned.current = false
    const dest = t.trip.dest
    if (!dest?.latlng) return
    let alive = true
    const check = () =>
      weatherAt(dest.latlng)
        .then((w) => {
          if (!alive || rainWarned.current || !(w.rain >= 60 || rainy(w))) return
          rainWarned.current = true
          t.addAlert({ level: 'info', kind: 'weather', Icon: CloudRain, title: `Rain likely at ${dest.name}`, body: `${w.rain}% chance in the next 3 hours. Pack rain gear.` }, { sound: false })
        })
        .catch(() => {})
    check()
    const id = setInterval(check, 20 * 60000)
    return () => {
      alive = false
      clearInterval(id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [destKey])
  const showRegroup = () => {
    if (!t.trip.regroup) return
    setMode('free')
    setFocus({ type: 'point', latlng: t.trip.regroup.latlng, zoom: 16, n: Date.now() })
  }

  return (
    <div className="relative h-full w-full overflow-hidden bg-canvas">
      <div className="absolute inset-0">
        <MapView
          me={me}
          friends={t.friends}
          route={t.route}
          dest={t.trip.dest}
          start={t.trip.start}
          regroup={t.trip.regroup}
          selectedId={selectedId}
          onSelect={focusFriend}
          focus={focus}
          mode={pinMode ? 'free' : mode}
          onUserMove={() => setMode('free')}
          onCenterChange={pinMode ? setPinCenter : undefined}
          padding={{ top: mapTop, bottom: mapBottom }}
          styleKey={mapStyle}
          places={settings.mapPlaces}
          buildings={settings.map3d}
        />
      </div>

      {/* Header: options · destination · connection. Lifted above open sheets while a friend needs help. */}
      <div className={`pointer-events-none absolute inset-x-3 top-0 flex flex-col gap-2 pt-safe ${emergencies.length ? 'z-[1250]' : 'z-[1100]'}`}>
        <div className="pointer-events-auto flex h-14 items-center gap-2 rounded-full bg-white pl-1.5 pr-4 shadow-[0_4px_16px_rgba(17,24,39,0.16)]">
          <button onClick={() => setMenuOpen(true)} aria-label="Trip options" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink-2 active:bg-canvas">
            <Menu size={22} />
          </button>
          <button onClick={() => setMenuOpen(true)} className="min-w-0 flex-1 text-left">
            <div className="truncate text-[15.5px] font-extrabold leading-5">To {t.trip.dest?.name}</div>
            <div className="truncate text-[12.5px] font-semibold text-ink-3">
              {t.progress
                ? `${formatKm(t.progress.remaining)} · ETA ${formatClock(t.progress.eta)} · ${t.members.length} ${t.members.length === 1 ? 'rider' : 'riders'}`
                : `${t.trip.name} · ${t.members.length} ${t.members.length === 1 ? 'rider' : 'riders'}`}
            </div>
          </button>
          <ConnPill conn={t.conn} />
        </div>
        {loc.status === 'denied' && (
          <div className="pointer-events-auto rounded-2xl bg-white p-3 text-[13px] font-semibold text-danger shadow-md">
            Location permission is off, so friends can’t see you. Allow location for WayTogether in Settings.
            <button onClick={loc.retry} className="ml-2 font-bold text-brand underline">Try again</button>
          </div>
        )}
        {/* A friend in trouble stays pinned here until they're safe. */}
        {!pinMode &&
          emergencies.slice(0, 2).map((f) => (
            <div key={f.id} role="alert" className="animate-slide-down pointer-events-auto flex items-center gap-3 rounded-2xl bg-[#B3121F] p-3 pr-2 text-white shadow-[0_10px_30px_rgba(179,18,31,0.4)]">
              <span className="relative flex shrink-0">
                <span className="absolute inset-0 animate-ping rounded-full bg-white/40" />
                <Avatar member={f} size={40} ring={false} badge={false} />
              </span>
              <button onClick={() => focusFriend(f.id)} className="min-w-0 flex-1 text-left">
                <span className="block truncate text-[14.5px] font-extrabold leading-5">{f.state === 'sos' ? `${f.name} needs help` : `${f.name} isn’t responding`}</span>
                <span className="block truncate text-[12.5px] font-semibold text-white/80">
                  {f.fromMe == null ? 'Last known spot on the map' : f.fromMe < 50 ? 'Right next to you' : `${formatDistance(f.fromMe)} away`} · {timeAgo(t.now - f.updatedAt)}
                </span>
              </button>
              {f.latlng && (
                <button onClick={() => openExternal(googleMapsDirections(f.latlng))} className="flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-[#fff] px-3.5 text-[13.5px] font-extrabold text-[#B3121F] active:scale-95">
                  <Navigation2 size={16} fill="currentColor" /> Go
                </button>
              )}
            </div>
          ))}
        <ToastSlot
          toast={pinMode ? null : toast}
          onClose={t.dismissToast}
          onAction={(shown) => {
            t.dismissToast()
            if (shown.regroup) showRegroup()
            else if (shown.checkin) t.askCheckIn(shown.memberId)
            else if (shown.memberId) focusFriend(shown.memberId)
          }}
        />
        {settings.showSpeed && !toast && !pinMode && !expanded && me?.speed >= 3 && (
          <div className="pointer-events-none flex h-12 w-12 flex-col items-center justify-center self-start rounded-full bg-white shadow-[0_4px_12px_rgba(17,24,39,0.16)]">
            <span className="text-[17px] font-extrabold leading-4 tabular-nums">{speedValue(me.speed)}</span>
            <span className="text-[9px] font-bold text-ink-3">{speedUnit()}</span>
          </div>
        )}
      </div>

      {/* Floating controls (fade away while the panel is being dragged) */}
      {!expanded && !pinMode && (
        <div
          className={`absolute inset-x-3 z-[1050] flex items-end justify-between transition-[bottom,opacity] duration-300 ${dragging ? 'pointer-events-none opacity-0' : 'opacity-100'}`}
          style={{ bottom: sheetHeight + 14 }}
        >
          <button
            onClick={() => setSosOpen(true)}
            aria-label="SOS: open emergency assistance"
            className={`flex h-14 items-center gap-2 rounded-full pl-4 pr-5 text-[16px] font-extrabold text-white shadow-[0_8px_20px_rgba(229,56,59,0.4)] active:scale-95 ${sosActive ? 'animate-pulse bg-[#B3121F]' : 'bg-danger'}`}
          >
            <Siren size={20} /> {sosActive ? 'SOS ON' : 'SOS'}
          </button>
          <div className="flex flex-col gap-2.5">
            <FloatBtn label={settings.map3d ? 'Flat map' : '3D map'} active={settings.map3d} onClick={() => setSetting('map3d', !settings.map3d)}>
              <span className="text-[14px] font-extrabold">3D</span>
            </FloatBtn>
            <FloatBtn label="Music" onClick={() => setMusicOpen(true)}>
              <Music2 size={20} />
            </FloatBtn>
            {t.trip.regroup && (
              <FloatBtn label="Show regroup point" onClick={showRegroup}>
                <Flag size={20} className="text-info" />
              </FloatBtn>
            )}
            <FloatBtn
              label="Keep everyone in view"
              active={mode === 'group'}
              onClick={() => {
                setSelectedId(null)
                setMode('group')
              }}
            >
              <Users size={21} />
            </FloatBtn>
            <FloatBtn
              label={mode === 'me' ? 'Navigation view' : 'Follow me'}
              active={mode === 'me' || mode === 'nav'}
              tone="brand"
              onClick={() => {
                setSelectedId(null)
                haptic()
                setMode(mode === 'me' ? 'nav' : 'me')
              }}
            >
              {mode === 'nav' ? <Navigation2 size={21} fill="currentColor" /> : <LocateFixed size={22} />}
            </FloatBtn>
          </div>
        </div>
      )}

      {!pinMode && (
        <ConvoySheet
          me={me}
          friends={t.friends}
          members={t.members}
          health={t.health}
          alerts={t.alerts}
          unread={t.unread}
          markSeen={t.markSeen}
          messages={t.messages}
          unreadChat={t.unreadChat}
          markChatSeen={t.markChatSeen}
          onSend={t.sendMessage}
          progress={t.progress}
          trip={t.trip}
          code={t.code}
          now={t.now}
          stats={t.stats}
          tab={tab}
          setTab={setTab}
          expanded={expanded}
          setExpanded={(v) => {
            setExpanded(v)
            if (v) setSelectedId(null)
          }}
          onSelectFriend={focusFriend}
          onOpenStatus={() => setStatusOpen(true)}
          onAlertAction={(a) => (a.regroup ? showRegroup() : a.checkin ? t.askCheckIn(a.memberId) : focusFriend(a.memberId))}
          onInvite={() => setInviteOpen(true)}
          onOptions={() => setMenuOpen(true)}
          onRules={() => setRulesOpen(true)}
          rules={t.rules}
          onDragChange={setDragging}
          detail={
            selected && !expanded ? (
              <FriendDetail
                friend={selected}
                now={t.now}
                onClose={() => {
                  setSelectedId(null)
                  setMode('group')
                }}
                onPing={() => {
                  t.ping(selected.id)
                  t.notify({ level: 'info', memberId: selected.id, title: `Asked ${selected.name} where they are`, body: 'They’ll see it right away.' })
                }}
                onCheckIn={() => t.askCheckIn(selected.id)}
              />
            ) : null
          }
        />
      )}

      {/* Regroup pin-drop mode (like Google Maps "drop a pin") */}
      {pinMode && (
        <>
          <div className="pointer-events-none absolute left-1/2 z-[1040] -translate-x-1/2 -translate-y-full" style={{ top: `calc(96px + (100% - 96px - ${sheetHeight + 16}px) / 2)` }}>
            <svg width="40" height="50" viewBox="0 0 28 36" className="drop-shadow-lg" aria-hidden="true">
              <path d="M14 0C6.3 0 0 6.1 0 13.7 0 24 14 36 14 36s14-12 14-22.3C28 6.1 21.7 0 14 0z" fill="#0284C7" />
              <path d="M10 8v12M10 8h8l-2 3 2 3h-8" stroke="#fff" strokeWidth="2" fill="none" strokeLinejoin="round" />
            </svg>
          </div>
          <section className="animate-fade-up absolute inset-x-0 bottom-0 z-[1100] rounded-t-[28px] bg-white px-5 pb-safe pt-4 shadow-[0_-8px_30px_rgba(17,24,39,0.16)]" style={{ minHeight: 190 }}>
            <div className="text-[18px] font-extrabold tracking-tight">Set a regroup point</div>
            <p className="mt-0.5 truncate text-[13.5px] font-medium text-ink-3">Move the map to place the pin · {pinName || 'Finding place…'}</p>
            <div className="mt-4 grid grid-cols-2 gap-2.5">
              <button onClick={() => setPinMode(false)} className="h-14 rounded-2xl border border-line text-[15px] font-bold">Cancel</button>
              <PrimaryButton
                disabled={!pinCenter}
                onClick={() => {
                  t.updateTrip({ regroup: { latlng: pinCenter, name: pinName || 'Regroup point', by: me?.id, byName: me?.name, at: Date.now() } })
                  setPinMode(false)
                  setMode('group')
                  haptic('ok')
                  t.notify({ level: 'ok', Icon: Flag, title: 'Regroup point set', body: 'Everyone sees it on their map.' })
                }}
              >
                <Flag size={18} /> Set here
              </PrimaryButton>
            </div>
          </section>
        </>
      )}

      <StatusSheet
        open={statusOpen}
        current={me?.status}
        onClose={() => setStatusOpen(false)}
        onPick={(o) => {
          setStatusOpen(false)
          if (o.key === 'accident') {
            setSosOpen(true)
            return
          }
          t.setMyStatus(o.key)
          haptic('ok')
          const st = STATUS[o.key]
          t.notify({ level: o.key === 'riding' ? 'ok' : st.level, Icon: o.Icon || st.Icon, title: `You marked: ${o.label}`, body: 'Your group has been notified.' })
        }}
      />

      <TripMenu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        role={t.role}
        trip={t.trip}
        onChangeDest={() => {
          setMenuOpen(false)
          setSearching(true)
        }}
        onDropPin={() => {
          setMenuOpen(false)
          setSelectedId(null)
          setExpanded(false)
          setPinName('')
          setPinCenter(null)
          setPinMode(true)
          setMode('free')
        }}
        onClearRegroup={() => {
          setMenuOpen(false)
          t.updateTrip({ regroup: null })
        }}
        onNavigate={() => {
          setMenuOpen(false)
          const target = t.trip.regroup?.latlng || t.trip.dest?.latlng
          if (target) openExternal(googleMapsDirections(target))
        }}
        onInvite={() => {
          setMenuOpen(false)
          setInviteOpen(true)
        }}
        onRules={() => {
          setMenuOpen(false)
          setRulesOpen(true)
        }}
        onSettings={() => {
          setMenuOpen(false)
          onOpenSettings?.()
        }}
        onFamily={() => {
          setMenuOpen(false)
          shareFamily()
        }}
        onMusic={() => {
          setMenuOpen(false)
          setMusicOpen(true)
        }}
        onLeave={() =>
          ask({
            title: t.role === 'leader' ? 'Leave this trip?' : 'Leave trip?',
            body: t.role === 'leader' ? 'You stop sharing your location. Friends can keep riding with the same code.' : 'You’ll stop sharing your location and stop seeing your friends.',
            label: 'Leave',
            danger: true,
            run: t.leaveTrip,
          })
        }
        onEnd={() =>
          ask({
            title: 'End trip for everyone?',
            body: 'Location sharing stops for all riders and the trip closes.',
            label: 'End trip',
            danger: true,
            run: t.endTrip,
          })
        }
      />

      <RulesSheet open={rulesOpen} onClose={() => setRulesOpen(false)} rules={t.rules} canEdit={t.role === 'leader'} leaderName={t.trip.leaderName} onSave={t.updateRules} />

      <MusicSheet open={musicOpen} onClose={() => setMusicOpen(false)} playlist={t.trip.playlist} onSetPlaylist={(url) => t.updateTrip({ playlist: url })} />

      <ModalSheet open={inviteOpen} onClose={() => setInviteOpen(false)} title="Invite your convoy" subtitle="Send the invite link, or let friends scan or type this code.">
        <div className="flex flex-col items-center pb-2">
          <div className="font-mono text-[40px] font-bold tracking-wider">{t.code}</div>
          <div className="mt-3 rounded-2xl bg-[#fff] p-2 ring-1 ring-line">
            <QRCodeSVG value={inviteUrl(t.code)} size={180} level="M" />
          </div>
          <p className="mt-2 text-center text-[12.5px] font-medium text-ink-3">Scanning with any phone camera opens the trip.</p>
          <div className="mt-4 grid w-full grid-cols-2 gap-2.5">
            <PrimaryButton onClick={() => shareText(inviteText(t.trip, t.code), t.notify, 'Invite link copied')}>
              <Share2 size={18} /> Share
            </PrimaryButton>
            <button onClick={() => shareText(t.code, t.notify, 'Code copied')} className="flex h-14 items-center justify-center gap-2 rounded-2xl border border-line text-[16px] font-bold">
              <Copy size={18} /> Copy code
            </button>
          </div>
          <button onClick={shareFamily} className="mt-3 flex w-full items-center gap-3 rounded-2xl bg-canvas px-3.5 py-3 text-left active:scale-[0.99]">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-brand">
              <Eye size={19} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[14.5px] font-bold">Live view for family</span>
              <span className="block truncate text-[12.5px] font-medium text-ink-3">A view-only link: they follow the ride, no app needed</span>
            </span>
            <Share2 size={17} className="shrink-0 text-ink-3" />
          </button>
        </div>
      </ModalSheet>

      {searching && (
        <SearchView
          near={me?.latlng}
          title="Change destination"
          placeholder="Search new destination"
          onClose={() => setSearching(false)}
          onPick={(p) => {
            setSearching(false)
            setConfirm({
              title: `Head to ${p.name}?`,
              body: 'The destination changes for everyone and the route is recalculated from where you are now.',
              label: 'Change',
              run: async () => {
                const startLatLng = me?.latlng || t.trip.start.latlng
                const startName = me?.latlng ? await placeName(me.latlng) : t.trip.start.name
                t.updateTrip({ dest: { name: p.name, area: p.area, latlng: p.latlng }, start: { name: startName, latlng: startLatLng } })
                setMode('group')
                setFocus({ type: 'fit', points: [startLatLng, p.latlng], n: Date.now() })
                t.notify({ level: 'ok', Icon: CircleCheck, title: `Destination: ${p.name}`, body: 'Everyone’s route is updating.' })
              },
            })
          }}
        />
      )}

      {t.checkinRequest && !sosActive && <CheckInPrompt request={t.checkinRequest} onAnswer={t.answerCheckIn} ms={t.checkinMs} />}

      {(sosOpen || sosActive) && me && (
        <SOSScreen
          me={me}
          tripName={t.trip.name}
          friends={t.friends}
          active={sosActive}
          onSend={() => t.setMyStatus('sos')}
          onCancel={() => {
            t.setMyStatus('riding')
            setSosOpen(false)
            t.notify({ level: 'ok', Icon: CircleCheck, title: 'SOS cancelled', body: 'Your convoy knows you’re safe.' })
          }}
          onClose={() => setSosOpen(false)}
          onShare={() =>
            me.latlng &&
            shareText(`SOS from ${me.name} (${t.trip.name}). Live location: https://maps.google.com/?q=${me.latlng[0].toFixed(6)},${me.latlng[1].toFixed(6)}`, t.notify, 'Location link copied')
          }
        />
      )}

      <ConfirmDialog
        open={!!confirm}
        title={confirm?.title}
        body={confirm?.body}
        confirmLabel={confirm?.label}
        danger={confirm?.danger}
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          const run = confirm?.run
          setConfirm(null)
          run?.()
        }}
      />

      {t.ended && (
        <div className="absolute inset-0 z-[1700] flex items-center justify-center bg-black/40 p-6">
          <div className="animate-pop w-full max-w-[340px] rounded-3xl bg-white p-6 text-center">
            <div className="text-[20px] font-extrabold">Trip ended</div>
            <p className="mt-1 text-[14px] font-medium text-ink-3">{t.ended.by} ended the trip. Location sharing has stopped.</p>
            <PrimaryButton className="mt-5" onClick={t.leaveTrip}>See trip summary</PrimaryButton>
          </div>
        </div>
      )}
    </div>
  )
}
