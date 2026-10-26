import { useMemo, useState } from 'react'
import { Fuel, Loader2, LocateFixed, ShieldCheck, Users } from 'lucide-react'
import { Logo, PrimaryButton, reducedMotion } from '../components/ui'
import { avatarFor } from '../lib/avatar'
import { googleAvailable, signInWithBrowser, signInWithGoogle } from '../lib/auth'
import { newId } from '../lib/profile'

function GoogleMark() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  )
}

// The welcome scene: a little convoy riding along a route to the destination pin, over a stylised map.
const ROUTE = 'M -30 238 C 40 228, 66 168, 130 170 S 216 212, 262 158 S 318 92, 340 84'
const RIDERS = [
  { seed: 'demo-priya', ring: '#16A34A', begin: '0s', at: [203, 185] },
  { seed: 'demo-arjun', ring: '#16A34A', begin: '-0.75s', at: [178, 178] },
  { seed: 'demo-harish', ring: '#F59E0B', begin: '-1.5s', at: [156, 173] },
]

function ConvoyScene() {
  const still = useMemo(reducedMotion, [])
  return (
    <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full" aria-hidden="true">
      <defs>
        <pattern id="cv-grid" width="34" height="34" patternUnits="userSpaceOnUse">
          <path d="M34 0H0V34" fill="none" stroke="#fff" strokeOpacity="0.08" strokeWidth="1.2" />
        </pattern>
        <clipPath id="cv-av">
          <circle r="13" />
        </clipPath>
      </defs>
      <rect width="400" height="300" fill="url(#cv-grid)" />
      {/* city blocks and a river */}
      {[
        [24, 40, 70, 46],
        [112, 26, 54, 64],
        [190, 50, 86, 40],
        [40, 120, 60, 40],
        [300, 200, 80, 50],
        [214, 240, 56, 44],
      ].map(([x, y, w, h], i) => (
        <rect key={i} x={x} y={y} width={w} height={h} rx="8" fill="#fff" fillOpacity="0.06" />
      ))}
      <path d="M 300 -20 C 276 60, 352 118, 318 196 S 370 290, 350 330" fill="none" stroke="#fff" strokeOpacity="0.1" strokeWidth="30" strokeLinecap="round" />
      {/* the road and the planned route */}
      <path d={ROUTE} fill="none" stroke="#fff" strokeOpacity="0.22" strokeWidth="20" strokeLinecap="round" strokeLinejoin="round" />
      <path d={ROUTE} fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeDasharray="2 12" className={still ? '' : 'animate-dash'} />
      {/* destination */}
      <g transform="translate(340 84)">
        <circle r="16" fill="#fff" fillOpacity="0.25" className={still ? '' : 'animate-live'} />
        <g className={still ? '' : 'animate-bob'}>
          <path d="M0 -40 C -10 -40 -17 -32.6 -17 -23.6 C -17 -11 0 0 0 0 S 17 -11 17 -23.6 C 17 -32.6 10 -40 0 -40 Z" fill="#E5383B" stroke="#fff" strokeWidth="2.5" />
          <circle cy="-24" r="6" fill="#fff" />
        </g>
      </g>
      {/* the convoy */}
      {RIDERS.map((r) => (
        <g key={r.seed} transform={still ? `translate(${r.at[0]} ${r.at[1]})` : undefined}>
          {!still && (
            <>
              <animateMotion dur="9s" repeatCount="indefinite" begin={r.begin} path={ROUTE} rotate="0" />
              <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.08;0.88;1" dur="9s" repeatCount="indefinite" begin={r.begin} />
            </>
          )}
          <circle r="18" fill="#fff" />
          <circle r="16" fill="none" stroke={r.ring} strokeWidth="3" />
          <image href={avatarFor({ id: r.seed })} x="-13" y="-13" width="26" height="26" clipPath="url(#cv-av)" />
        </g>
      ))}
    </svg>
  )
}

function Chip({ children, className = '', style }) {
  return (
    <span className={`absolute flex items-center gap-2 rounded-full bg-white/95 px-3 py-1.5 text-[12.5px] font-bold text-ink shadow-[0_8px_20px_rgba(17,24,39,0.18)] ${className}`} style={style}>
      {children}
    </span>
  )
}

const after = (ms) => ({ animationDelay: `${ms}ms` })

// First launch: sign in with Google (name + photo) or just type a name.
export default function Setup({ onDone }) {
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [manual, setManual] = useState(!googleAvailable)
  const valid = name.trim().length >= 2

  const [browserOption, setBrowserOption] = useState(false)

  // One attempt per tap: the phone's Google picker first; if that fails, offer browser sign-in instead of chaining prompts.
  const google = async (viaBrowser = false) => {
    setBusy(true)
    setError(null)
    try {
      const profile = await (viaBrowser ? signInWithBrowser() : signInWithGoogle())
      if (profile) onDone(profile)
    } catch (e) {
      const msg = String(e?.message || e)
      setError(/cancel/i.test(msg) ? null : `Google sign-in didn’t work: ${msg}`)
      if (e?.canUseBrowser) setBrowserOption(true)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="no-scrollbar flex h-full flex-col overflow-y-auto bg-white">
      <div
        className="animate-fade-up relative h-[40%] min-h-[270px] shrink-0 overflow-hidden rounded-b-[34px]"
        style={{ background: 'linear-gradient(150deg, #1A73E8 0%, #3B8AF3 55%, #6CAEF9 100%)' }}
      >
        <ConvoyScene />
        <div className="relative flex items-center gap-2.5 px-6 pt-safe">
          <span className="mt-3 rounded-[30%] bg-white/25 p-[3px]">
            <Logo size={38} />
          </span>
          <span className="mt-3 text-[19px] font-extrabold tracking-tight text-white">WayTogether</span>
        </div>
        {/* Two live updates take turns, like the alerts you get on a ride. */}
        <Chip className="animate-chip-cycle left-6 top-[42%]">
          <span className="animate-live h-2.5 w-2.5 rounded-full bg-ok" /> Everyone together
        </Chip>
        <Chip className="animate-chip-cycle left-6 top-[42%]" style={{ animationDelay: '4s' }}>
          <Fuel size={14} className="text-amber-500" /> Harish: Fuel stop
        </Chip>
      </div>

      <div className="flex flex-1 flex-col px-6">
        <h1 className="animate-rise mt-6 text-[30px] font-extrabold leading-[36px] tracking-tight" style={after(120)}>
          Keep the Journey Together.
        </h1>
        <p className="animate-rise mt-2 text-[15px] font-medium leading-[22px] text-ink-2" style={after(190)}>
          Stay connected with your group. Track everyone, coordinate stops, and stay safer on every journey.
        </p>

        <ul className="mt-5 flex flex-col gap-3">
          {[
            [Users, 'See every friend live on one map'],
            [LocateFixed, 'Know who stopped, who’s behind, who took a wrong turn'],
            [ShieldCheck, 'Hold SOS to alert your whole convoy'],
          ].map(([Icon, text], i) => (
            <li key={text} className="animate-rise flex items-center gap-3 text-[14.5px] font-semibold text-ink-2" style={after(260 + i * 70)}>
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-brand">
                <Icon size={18} />
              </span>
              {text}
            </li>
          ))}
        </ul>

        <div className="animate-rise mt-auto pb-safe pt-6" style={after(480)}>
          {error && <p className="mb-3 rounded-xl bg-red-50 p-3 text-[13px] font-semibold text-danger">{error}</p>}
          {!manual ? (
            <>
              <button
                onClick={() => google(false)}
                disabled={busy}
                className="flex h-14 w-full items-center justify-center gap-3 rounded-2xl border border-line bg-white text-[16px] font-bold text-ink shadow-sm active:scale-[0.98] disabled:opacity-60"
              >
                {busy ? <Loader2 size={20} className="animate-spin" /> : <GoogleMark />} Continue with Google
              </button>
              {browserOption && (
                <button onClick={() => google(true)} disabled={busy} className="mt-2 h-12 w-full text-[14.5px] font-bold text-brand disabled:opacity-60">
                  Sign in with Google in the browser instead
                </button>
              )}
              <button onClick={() => setManual(true)} className="mt-2 h-12 w-full text-[14.5px] font-bold text-ink-3">
                Continue without an account
              </button>
            </>
          ) : (
            <>
              <label htmlFor="your-name" className="text-[13px] font-bold text-ink-3">Your name (friends see this)</label>
              <input
                id="your-name"
                value={name}
                onChange={(e) => setName(e.target.value.slice(0, 24))}
                onKeyDown={(e) => e.key === 'Enter' && valid && onDone({ id: newId(), name: name.trim() })}
                placeholder="e.g. Arjun"
                autoComplete="given-name"
                className="mt-2 h-14 w-full rounded-2xl border border-line px-4 text-[17px] font-semibold outline-none focus:border-brand focus:ring-4 focus:ring-blue-100"
              />
              <PrimaryButton className="mt-3" disabled={!valid} onClick={() => onDone({ id: newId(), name: name.trim() })}>
                Continue
              </PrimaryButton>
              {googleAvailable && (
                <button onClick={() => setManual(false)} className="mt-2 h-11 w-full text-[14px] font-bold text-brand">
                  Use Google instead
                </button>
              )}
            </>
          )}
          <p className="mt-2 text-center text-[12px] font-medium text-ink-3">Next, allow location. It’s shared only with trips you join, until you leave.</p>
        </div>
      </div>
    </div>
  )
}
