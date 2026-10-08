import { useEffect, useState } from 'react'
import { ListMusic, Pause, Play, SkipBack, SkipForward, Volume1, Volume2 } from 'lucide-react'
import { music, musicAvailable, openSpotify } from '../lib/external'
import { ModalSheet } from './ui'

const SPOTIFY_RE = /^https:\/\/open\.spotify\.com\/(playlist|album|track|artist)\/[A-Za-z0-9]+/

export default function MusicSheet({ open, onClose, playlist, onSetPlaylist }) {
  const [playing, setPlaying] = useState(false)
  const [link, setLink] = useState(playlist || '')
  useEffect(() => setLink(playlist || ''), [playlist, open])
  useEffect(() => {
    if (!open || !musicAvailable) return
    const read = () => music.status().then((s) => setPlaying(!!s?.playing))
    read()
    const id = setInterval(read, 1500)
    return () => clearInterval(id)
  }, [open])

  const tap = async (fn) => {
    await fn()
    setTimeout(() => music.status().then((s) => setPlaying(!!s?.playing)), 400)
  }
  const validLink = SPOTIFY_RE.test(link.trim())

  return (
    <ModalSheet open={open} onClose={onClose} title="Music" subtitle={musicAvailable ? 'Controls Spotify or whatever is playing on this phone.' : 'Music controls work in the Android app.'}>
      <div className="flex items-center justify-center gap-5 py-2">
        <button aria-label="Previous track" disabled={!musicAvailable} onClick={() => tap(music.previous)} className="flex h-14 w-14 items-center justify-center rounded-full bg-canvas text-ink disabled:opacity-40">
          <SkipBack size={24} fill="currentColor" />
        </button>
        <button aria-label={playing ? 'Pause' : 'Play'} disabled={!musicAvailable} onClick={() => tap(music.playPause)} className="flex h-20 w-20 items-center justify-center rounded-full bg-[#1DB954] text-white shadow-[0_8px_20px_rgba(29,185,84,0.35)] disabled:opacity-40">
          {playing ? <Pause size={32} fill="currentColor" /> : <Play size={32} fill="currentColor" className="ml-1" />}
        </button>
        <button aria-label="Next track" disabled={!musicAvailable} onClick={() => tap(music.next)} className="flex h-14 w-14 items-center justify-center rounded-full bg-canvas text-ink disabled:opacity-40">
          <SkipForward size={24} fill="currentColor" />
        </button>
      </div>
      <div className="mt-1 flex items-center justify-center gap-3">
        <button aria-label="Volume down" disabled={!musicAvailable} onClick={music.volumeDown} className="flex h-11 w-11 items-center justify-center rounded-full border border-line text-ink-2 disabled:opacity-40"><Volume1 size={20} /></button>
        <span className="text-[12.5px] font-bold text-ink-3">Volume</span>
        <button aria-label="Volume up" disabled={!musicAvailable} onClick={music.volumeUp} className="flex h-11 w-11 items-center justify-center rounded-full border border-line text-ink-2 disabled:opacity-40"><Volume2 size={20} /></button>
      </div>

      <div className="mt-5 rounded-2xl border border-line p-4">
        <div className="flex items-center gap-2 text-[15px] font-extrabold"><ListMusic size={18} className="text-[#1DB954]" /> Trip playlist</div>
        <p className="mt-0.5 text-[12.5px] font-medium text-ink-3">Paste a Spotify playlist link; everyone in the trip gets a play button.</p>
        <div className="mt-3 flex gap-2">
          <input
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="https://open.spotify.com/playlist/…"
            aria-label="Spotify playlist link"
            className="h-11 min-w-0 flex-1 rounded-xl border border-line px-3 text-[13.5px] font-medium outline-none focus:border-brand"
          />
          <button disabled={!validLink || link.trim() === playlist} onClick={() => onSetPlaylist(link.trim().split('?')[0])} className="h-11 rounded-xl bg-brand px-4 text-[14px] font-bold text-white disabled:opacity-40">
            Share
          </button>
        </div>
      </div>

      <button onClick={() => openSpotify(playlist)} className="mt-3 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#1DB954] text-[16px] font-bold text-white">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.52 17.34c-.24.36-.66.48-1.02.24-2.82-1.74-6.36-2.1-10.56-1.14-.42.12-.78-.18-.9-.54-.12-.42.18-.78.54-.9 4.56-1.02 8.52-.6 11.64 1.32.42.18.48.66.3 1.02zm1.44-3.3c-.3.42-.84.6-1.26.3-3.24-1.98-8.16-2.58-11.94-1.38-.48.12-1.02-.12-1.14-.6-.12-.48.12-1.02.6-1.14C9.6 9.9 15 10.56 18.72 12.84c.36.18.54.78.24 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.3c-.6.18-1.2-.18-1.38-.72-.18-.6.18-1.2.72-1.38 4.26-1.26 11.28-1.02 15.72 1.62.54.3.72 1.02.42 1.56-.3.42-1.02.6-1.56.3z" /></svg>
        {playlist ? 'Play trip playlist' : 'Open Spotify'}
      </button>
    </ModalSheet>
  )
}
