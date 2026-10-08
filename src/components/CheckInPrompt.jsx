import { useEffect, useState } from 'react'
import { CircleCheck, Fuel, LifeBuoy, ShieldAlert, Wrench } from 'lucide-react'
import { CHECKIN_OPTIONS, LEVEL } from '../data/trip'
import { CHECKIN_MS } from '../state/TripContext'

const ICONS = { ok: CircleCheck, stop: Fuel, problem: Wrench, help: LifeBuoy }

// Shown on the phone of a rider who hasn't moved: one tap to answer, or an SOS goes out automatically.
export default function CheckInPrompt({ request, onAnswer }) {
  const [left, setLeft] = useState(CHECKIN_MS)
  useEffect(() => {
    const id = setInterval(() => {
      const remaining = CHECKIN_MS - (Date.now() - request.receivedAt)
      setLeft(Math.max(0, remaining))
      if (remaining <= 0) {
        clearInterval(id)
        onAnswer('timeout')
      }
    }, 250)
    return () => clearInterval(id)
  }, [request, onAnswer])

  const secs = Math.ceil(left / 1000)
  const pct = (left / CHECKIN_MS) * 100

  return (
    <div className="absolute inset-0 z-[1650] flex flex-col justify-end bg-black/55" role="alertdialog" aria-modal="true" aria-label="Are you OK?">
      <section className="animate-fade-up rounded-t-[28px] bg-white px-5 pb-safe pt-5">
        <div className="flex items-start gap-3.5">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-600">
            <ShieldAlert size={26} />
          </span>
          <div className="min-w-0">
            <h2 className="text-[22px] font-extrabold tracking-tight">Are you OK?</h2>
            <p className="mt-0.5 text-[14.5px] font-medium leading-5 text-ink-2">
              {request.fromName} is checking on you. You haven’t moved for a while.
            </p>
          </div>
        </div>

        <div className="mt-4">
          <div className="flex justify-between text-[13px] font-bold">
            <span className="text-danger">SOS is sent automatically in</span>
            <span className="tabular-nums text-danger">
              {Math.floor(secs / 60)}:{String(secs % 60).padStart(2, '0')}
            </span>
          </div>
          <div className="mt-1.5 h-2 rounded-full bg-red-100">
            <div className="h-2 rounded-full bg-danger transition-[width] duration-300" style={{ width: `${pct}%` }} />
          </div>
        </div>

        <div className="mt-5 grid gap-2.5 pb-2">
          {CHECKIN_OPTIONS.map((o) => {
            const Icon = ICONS[o.key]
            const lv = LEVEL[o.level]
            const strong = o.key === 'help'
            return (
              <button
                key={o.key}
                onClick={() => onAnswer(o.key)}
                className="flex h-14 items-center gap-3 rounded-2xl px-4 text-left text-[16px] font-bold active:scale-[0.98]"
                style={strong ? { background: lv.color, color: '#fff' } : { background: lv.soft, color: lv.text }}
              >
                <Icon size={22} /> {o.label}
              </button>
            )
          })}
        </div>
      </section>
    </div>
  )
}
