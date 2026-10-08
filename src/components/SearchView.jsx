import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, Loader2, MapPin, X } from 'lucide-react'
import { formatKm, haversine } from '../lib/geo'
import { searchPlaces } from '../lib/places'

// Full-screen place search (Photon / OpenStreetMap), like Google Maps' search page.
export default function SearchView({ near: liveNear, onPick, onClose, placeholder = 'Search destination', title }) {
  // Bias results to where you were when search opened; live GPS updates must not restart the search.
  const [near] = useState(liveNear)
  const [q, setQ] = useState('')
  const [results, setResults] = useState([])
  const [state, setState] = useState('idle')
  const input = useRef(null)
  useEffect(() => input.current?.focus(), [])
  useEffect(() => {
    if (q.trim().length < 2) {
      setResults([])
      setState('idle')
      return
    }
    const ctl = new AbortController()
    setState('loading')
    const id = setTimeout(() => {
      searchPlaces(q.trim(), near, ctl.signal)
        .then((r) => {
          setResults(r)
          setState(r.length ? 'done' : 'empty')
        })
        .catch((e) => e.name !== 'AbortError' && setState('error'))
    }, 280)
    return () => {
      clearTimeout(id)
      ctl.abort()
    }
  }, [q, near])

  return (
    <div className="animate-fade-up absolute inset-0 z-[1300] flex flex-col bg-white pt-safe">
      <div className="mx-3 flex h-14 items-center gap-1 rounded-full border border-line bg-white px-1 shadow-sm">
        <button onClick={onClose} aria-label="Back" className="flex h-11 w-11 items-center justify-center rounded-full text-ink-2">
          <ArrowLeft size={22} />
        </button>
        <input
          ref={input}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={placeholder}
          aria-label={placeholder}
          enterKeyHint="search"
          className="min-w-0 flex-1 bg-transparent text-[16px] font-semibold outline-none placeholder:font-medium placeholder:text-ink-3"
        />
        {q && (
          <button onClick={() => setQ('')} aria-label="Clear" className="flex h-11 w-11 items-center justify-center rounded-full text-ink-3">
            <X size={20} />
          </button>
        )}
      </div>

      {title && <div className="px-6 pt-3 text-[13px] font-bold uppercase tracking-wide text-ink-3">{title}</div>}
      <div className="no-scrollbar mt-2 flex-1 overflow-y-auto pb-safe">
        {state === 'loading' && results.length === 0 && (
          <div className="flex items-center gap-2 px-6 py-5 text-[14px] font-semibold text-ink-3">
            <Loader2 size={18} className="animate-spin" /> Searching…
          </div>
        )}
        {state === 'idle' && <p className="px-6 py-5 text-[14px] font-medium text-ink-3">Search a city, place or address to ride to.</p>}
        {state === 'empty' && <p className="px-6 py-5 text-[14px] font-medium text-ink-3">No places found for “{q}”.</p>}
        {state === 'error' && <p className="px-6 py-5 text-[14px] font-medium text-danger">Search needs an internet connection. Try again.</p>}
        <ul>
          {results.map((r) => (
            <li key={r.id}>
              <button onClick={() => onPick(r)} className="flex w-full items-center gap-4 px-5 py-3 text-left active:bg-canvas">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-canvas text-ink-2">
                  <MapPin size={20} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15.5px] font-bold">{r.name}</span>
                  <span className="block truncate text-[13px] font-medium text-ink-3">{r.area}</span>
                </span>
                {near && <span className="shrink-0 text-[12.5px] font-semibold text-ink-3">{formatKm(haversine(near, r.latlng))}</span>}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

