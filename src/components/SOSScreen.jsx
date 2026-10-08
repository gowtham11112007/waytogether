import { useEffect, useMemo, useRef, useState } from 'react'
import { Clock, MapPin, Phone, Route, Share2, User, X } from 'lucide-react'
import { Avatar } from './ui'

const HOLD_MS = 3000
const R = 120
const C = 2 * Math.PI * R

function buzz(pattern) {
  try {
    navigator.vibrate?.(pattern)
  } catch {
    /* not supported */
  }
}

export default function SOSScreen({ me, tripName, friends, active, onSend, onCancel, onClose, onShare }) {
  const [progress, setProgress] = useState(0)
  const [holding, setHolding] = useState(false)
  const raf = useRef(0)
  const startedAt = useRef(0)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const sentAt = useMemo(() => new Date(), [active])
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => () => cancelAnimationFrame(raf.current), [])
  useEffect(() => {
    if (!active) return
    const id = setInterval(() => setElapsed((e) => e + 1), 1000)
    return () => clearInterval(id)
  }, [active])

  // A ref (not state) so a quick release always sees the latest value and cancels.
  const holdingRef = useRef(false)

  const begin = () => {
    if (active || holdingRef.current) return
    holdingRef.current = true
    setHolding(true)
    buzz(30)
    startedAt.current = performance.now()
    const tick = (t) => {
      const p = Math.min(1, (t - startedAt.current) / HOLD_MS)
      setProgress(p)
      if (!holdingRef.current) return
      if (p >= 1) {
        holdingRef.current = false
        setHolding(false)
        buzz([150, 80, 150])
        onSend()
        return
      }
      raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
  }
  const end = () => {
    if (!holdingRef.current) return
    holdingRef.current = false
    cancelAnimationFrame(raf.current)
    setHolding(false)
    setProgress(0)
  }

  const left = Math.ceil(3 - progress * 3)
  const coords = me.latlng ? `${me.latlng[0].toFixed(5)}, ${me.latlng[1].toFixed(5)}` : 'Waiting for GPS…'
  const helper = friends.filter((f) => f.fromMe != null && f.state !== 'offline').sort((a, b) => a.fromMe - b.fromMe)[0]

  if (active) {
    return (
      <div className="absolute inset-0 z-[1500] flex flex-col bg-[#B3121F] pt-safe text-white">
        <div className="flex items-center justify-between px-5">
          <span className="flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-[13px] font-extrabold tracking-wider">
            <span className="animate-live h-2 w-2 rounded-full bg-white" /> SOS ACTIVE
          </span>
          <span className="font-mono text-[15px] font-bold tabular-nums">
            {String(Math.floor(elapsed / 60)).padStart(2, '0')}:{String(elapsed % 60).padStart(2, '0')}
          </span>
        </div>

        <div className="mt-8 flex flex-col items-center px-6 text-center">
          <div className="relative flex h-28 w-28 items-center justify-center">
            <span className="absolute inset-0 animate-ping rounded-full bg-white/25" />
            <span className="relative flex h-24 w-24 items-center justify-center rounded-full bg-white text-[26px] font-extrabold text-[#B3121F]">SOS</span>
          </div>
          <h1 className="mt-6 text-[26px] font-extrabold leading-8 tracking-tight">Your convoy has been notified.</h1>
          <p className="mt-2 text-[15px] font-medium text-white/80">Your live location is being shared with everyone.</p>
        </div>

        <div className="mx-5 mt-6 divide-y divide-white/15 rounded-3xl bg-white/10">
          {[
            [MapPin, 'Location', coords],
            [User, 'Name', me.name],
            [Clock, 'Time', sentAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })],
            [Route, 'Trip', tripName],
          ].map(([Icon, k, v]) => (
            <div key={k} className="flex items-center gap-3 px-4 py-3">
              <Icon size={18} className="shrink-0 text-white/70" />
              <span className="w-20 text-[13px] font-semibold text-white/70">{k}</span>
              <span className="min-w-0 flex-1 truncate text-right text-[14px] font-bold">{v}</span>
            </div>
          ))}
        </div>

        {helper && (
          <div className="mx-5 mt-4 flex items-center gap-3 rounded-2xl bg-white/10 p-3">
            <Avatar member={helper} size={36} ring={false} badge={false} />
            <span className="flex-1 text-[14px] font-bold">{helper.name} is closest ({Math.round(helper.fromMe)} m) and has been alerted</span>
          </div>
        )}

        <div className="mt-auto flex flex-col gap-3 px-5 pb-safe">
          <a href="tel:112" className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-white text-[16px] font-extrabold text-[#B3121F]">
            <Phone size={20} /> Call Emergency Services · 112
          </a>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={onShare} className="flex h-13 items-center justify-center gap-2 rounded-2xl bg-white/15 text-[15px] font-bold">
              <Share2 size={18} /> Share Location
            </button>
            <button onClick={onCancel} className="h-13 rounded-2xl border border-white/40 text-[15px] font-bold">
              Cancel SOS
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="absolute inset-0 z-[1500] flex flex-col bg-white pt-safe">
      <div className="flex items-center justify-between px-4">
        <button onClick={onClose} aria-label="Close" className="flex h-11 w-11 items-center justify-center rounded-full bg-canvas text-ink-2">
          <X size={22} />
        </button>
      </div>
      <div className="mt-4 px-6 text-center">
        <h1 className="text-[26px] font-extrabold tracking-tight">Emergency Assistance</h1>
        <p className="mt-2 text-[15px] font-medium text-ink-3">
          {holding ? 'Keep holding. Release to cancel — nothing is sent yet.' : 'Press and hold for 3 seconds to alert your convoy.'}
        </p>
      </div>

      <div className="flex flex-1 items-center justify-center">
        <div className="relative h-[272px] w-[272px] select-none">
          <svg width="272" height="272" viewBox="0 0 272 272" className="absolute inset-0 -rotate-90">
            <circle cx="136" cy="136" r={R} fill="none" stroke="#FEE2E2" strokeWidth="10" />
            <circle cx="136" cy="136" r={R} fill="none" stroke="#E5383B" strokeWidth="10" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - progress)} />
          </svg>
          <button
            aria-label="Press and hold for 3 seconds to send SOS"
            onPointerDown={(e) => {
              e.preventDefault()
              begin()
            }}
            onPointerUp={end}
            onPointerLeave={end}
            onPointerCancel={end}
            onKeyDown={(e) => {
              if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) {
                e.preventDefault()
                begin()
              }
            }}
            onKeyUp={end}
            onContextMenu={(e) => e.preventDefault()}
            style={{ touchAction: 'none', transform: `scale(${holding ? 0.96 : 1})` }}
            className="absolute left-[26px] top-[26px] flex h-[220px] w-[220px] flex-col items-center justify-center rounded-full bg-danger text-white shadow-[0_20px_50px_rgba(229,56,59,0.45)] transition-transform"
          >
            <span className="text-[52px] font-extrabold leading-none tracking-wider">SOS</span>
            <span className="mt-2 text-[14px] font-bold text-white/85">{holding ? `Hold… ${left}` : 'Hold 3 sec'}</span>
          </button>
        </div>
      </div>

      <div className="px-6 pb-4 text-center text-[13px] font-semibold text-ink-3">{friends.length ? `Shares your location, name, time and trip with ${friends.length} ${friends.length === 1 ? 'friend' : 'friends'}.` : 'Shares your location, name, time and trip with everyone who joins.'}</div>
      <div className="px-5 pb-safe">
        <a href="tel:112" className="flex h-14 items-center justify-center gap-2 rounded-2xl border border-line text-[16px] font-bold text-ink">
          <Phone size={20} /> Call Emergency Services · 112
        </a>
      </div>
    </div>
  )
}
