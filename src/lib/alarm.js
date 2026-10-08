import { getSettings } from './settings'

// Sounds are synthesized (no audio files): an SOS siren and a short chime for updates.
let ctx = null
function audio() {
  try {
    ctx ||= new (window.AudioContext || window.webkitAudioContext)()
    if (ctx.state === 'suspended') ctx.resume()
    return ctx
  } catch {
    return null
  }
}
// Browsers only allow audio after a tap; unlock on the first one.
if (typeof window !== 'undefined') {
  const unlock = () => {
    audio()
    window.removeEventListener('pointerdown', unlock)
  }
  window.addEventListener('pointerdown', unlock)
}

export function playSiren(seconds = 6) {
  if (!getSettings().sounds) return
  const a = audio()
  if (!a) return
  const osc = a.createOscillator()
  const gain = a.createGain()
  osc.type = 'square'
  osc.connect(gain).connect(a.destination)
  const t = a.currentTime
  for (let i = 0; i < seconds * 2; i++) osc.frequency.setValueAtTime(i % 2 ? 980 : 660, t + i * 0.5)
  gain.gain.setValueAtTime(0.0001, t)
  gain.gain.exponentialRampToValueAtTime(0.25, t + 0.05)
  gain.gain.setValueAtTime(0.25, t + seconds - 0.15)
  gain.gain.exponentialRampToValueAtTime(0.0001, t + seconds)
  osc.start(t)
  osc.stop(t + seconds)
}

export function chime(kind = 'info') {
  if (!getSettings().sounds) return
  const a = audio()
  if (!a) return
  const notes = kind === 'warn' ? [740, 560] : kind === 'msg' ? [880, 1175] : [660, 880]
  notes.forEach((f, i) => {
    const osc = a.createOscillator()
    const gain = a.createGain()
    osc.type = 'sine'
    osc.frequency.value = f
    osc.connect(gain).connect(a.destination)
    const t = a.currentTime + i * 0.13
    gain.gain.setValueAtTime(0.0001, t)
    gain.gain.exponentialRampToValueAtTime(0.18, t + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.22)
    osc.start(t)
    osc.stop(t + 0.25)
  })
}
