import { useState } from 'react'
import { Loader2, LocateFixed, ShieldCheck, Users } from 'lucide-react'
import { Logo, PrimaryButton } from '../components/ui'
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
    <div className="flex h-full flex-col bg-white px-6 pt-safe">
      <div className="mt-6 flex items-center gap-2.5">
        <Logo size={40} />
        <span className="text-[20px] font-extrabold tracking-tight">WayTogether</span>
      </div>
      <h1 className="mt-10 text-[34px] font-extrabold leading-[40px] tracking-tight">Keep the Journey Together.</h1>
      <p className="mt-3 text-[16px] font-medium leading-6 text-ink-2">Stay connected with your group. Track everyone, coordinate stops, and stay safer on every journey.</p>

      <ul className="mt-8 flex flex-col gap-4">
        {[
          [Users, 'See every friend live on one map'],
          [LocateFixed, 'Know who stopped, who’s behind, who took a wrong turn'],
          [ShieldCheck, 'Hold SOS to alert your whole convoy'],
        ].map(([Icon, text]) => (
          <li key={text} className="flex items-center gap-3 text-[15px] font-semibold text-ink-2">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-brand"><Icon size={19} /></span>
            {text}
          </li>
        ))}
      </ul>

      <div className="mt-auto pb-safe">
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
            <button onClick={() => setManual(true)} className="mt-3 h-12 w-full text-[14.5px] font-bold text-ink-3">
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
        <p className="mt-3 text-center text-[12px] font-medium text-ink-3">Next, allow location. It’s shared only with trips you join, until you leave.</p>
      </div>
    </div>
  )
}
