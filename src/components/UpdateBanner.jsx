import { useEffect, useRef, useState } from 'react'
import { App as NativeApp } from '@capacitor/app'
import { Download, RefreshCw, X } from 'lucide-react'
import { openExternal } from '../lib/external'
import { applyUpdate, checkForUpdate, markAppReady } from '../lib/updates'

const CHECK_EVERY = 5 * 60 * 1000

// Checks GitHub for a newer version on launch and when the app comes back to the foreground.
export default function UpdateBanner({ inTrip }) {
  const [update, setUpdate] = useState(null)
  const [hidden, setHidden] = useState(false)
  const [busy, setBusy] = useState(false)
  const lastCheck = useRef(0)

  useEffect(() => {
    markAppReady()
    const check = async () => {
      if (Date.now() - lastCheck.current < CHECK_EVERY && lastCheck.current) return
      lastCheck.current = Date.now()
      const u = await checkForUpdate()
      if (u.state !== 'none') {
        setUpdate(u)
        setHidden(false)
      }
    }
    check()
    const sub = NativeApp.addListener('appStateChange', ({ isActive }) => isActive && check())
    return () => {
      sub.then((h) => h.remove())
    }
  }, [])

  // Never interrupt a ride: the banner waits until you're back on the home screen.
  if (!update || hidden || inTrip) return null
  const apk = update.state === 'apk'

  return (
    <div className="pointer-events-none absolute inset-x-3 top-0 z-[1450] pt-safe">
      <div className="animate-slide-down pointer-events-auto mt-16 flex items-center gap-3 rounded-2xl bg-ink p-3 pr-2 text-white shadow-[0_10px_30px_rgba(17,24,39,0.3)]" role="status">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/15">
          {apk ? <Download size={19} /> : <RefreshCw size={19} />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[14px] font-bold">{apk ? 'New app version available' : 'Update ready'}</div>
          <div className="truncate text-[12.5px] font-medium text-white/70">{update.notes || (apk ? 'Download and install the new APK.' : 'Restart to get the latest features.')}</div>
        </div>
        <button
          disabled={busy}
          onClick={async () => {
            if (apk) return openExternal(update.apk)
            setBusy(true)
            await applyUpdate(update.bundleId).catch(() => setBusy(false))
          }}
          className="shrink-0 rounded-full bg-white px-3.5 py-2 text-[13px] font-extrabold text-ink disabled:opacity-60"
        >
          {apk ? 'Download' : busy ? 'Updating…' : 'Restart'}
        </button>
        <button onClick={() => setHidden(true)} aria-label="Later" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white/70">
          <X size={18} />
        </button>
      </div>
    </div>
  )
}
