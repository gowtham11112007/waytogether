import { getSettings } from './settings'

// Spoken alerts, so a rider with the phone on the handlebar doesn't have to read the screen.
// Uses the phone's built-in text-to-speech (Web Speech API); hidden where there are no voices.
const synth = typeof window !== 'undefined' ? window.speechSynthesis : null

export function voiceAvailable() {
  try {
    return !!synth && typeof window.SpeechSynthesisUtterance === 'function' && synth.getVoices().length > 0
  } catch {
    return false
  }
}

// Voices load asynchronously in some browsers: ask once early so the settings switch can appear.
if (synth) {
  try {
    synth.getVoices()
    synth.addEventListener?.('voiceschanged', () => synth.getVoices())
  } catch {
    /* not supported */
  }
}

export function speak(text) {
  if (!synth || !getSettings().voice) return
  try {
    synth.cancel() // the newest alert matters most
    const u = new window.SpeechSynthesisUtterance(text)
    u.rate = 1.05
    u.lang = navigator.language || 'en-IN'
    synth.speak(u)
  } catch {
    /* no voice */
  }
}
