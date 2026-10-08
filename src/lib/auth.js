import { Capacitor } from '@capacitor/core'
import { SocialLogin } from '@capgo/capacitor-social-login'
import { App } from '@capacitor/app'
import { Browser } from '@capacitor/browser'
import { BACKEND, supabase } from './realtime'

const WEB_CLIENT_ID = import.meta.env.VITE_GOOGLE_WEB_CLIENT_ID
const native = Capacitor.isNativePlatform()

// Google sign-in needs Supabase; on Android it also needs the Web client ID from Google Cloud.
export const googleAvailable = BACKEND === 'supabase' && (!native || !!WEB_CLIENT_ID)

export function profileFromUser(user) {
  const m = user.user_metadata || {}
  const full = m.full_name || m.name || user.email?.split('@')[0] || 'Rider'
  return {
    id: user.id,
    name: full.split(/\s+/).slice(0, 2).join(' ').slice(0, 24),
    photo: m.avatar_url || m.picture || null,
    email: user.email || null,
    google: true,
  }
}

let initialized = false
export const APP_CALLBACK = 'app.convoya.trip://auth-callback'

// Google's normal web sign-in in a secure in-app browser (Custom Tab), returning to the app by deep link.
// Used when the phone's built-in Google account picker refuses (e.g. error [16]).
export function signInWithBrowser() {
  return new Promise((resolve, reject) => {
    let done = false
    let sub
    const finish = (fn) => {
      if (done) return
      done = true
      sub?.then((h) => h.remove())
      Browser.close().catch(() => {})
      fn()
    }
    sub = App.addListener('appUrlOpen', async ({ url }) => {
      if (!url?.startsWith(APP_CALLBACK)) return
      const u = new URL(url.replace(APP_CALLBACK, 'https://x/cb'))
      const params = new URLSearchParams(u.search || u.hash.slice(1))
      const code = params.get('code')
      const err = params.get('error_description') || params.get('error')
      if (err || !code) return finish(() => reject(new Error(err || 'Sign-in was cancelled.')))
      try {
        const { data, error } = await supabase().auth.exchangeCodeForSession(code)
        if (error) throw error
        finish(() => resolve(profileFromUser(data.user)))
      } catch (e) {
        finish(() => reject(e))
      }
    })
    supabase()
      .auth.signInWithOAuth({ provider: 'google', options: { redirectTo: APP_CALLBACK, skipBrowserRedirect: true } })
      .then(({ data, error }) => {
        if (error) throw error
        return Browser.open({ url: data.url, presentationStyle: 'popover' })
      })
      .catch((e) => finish(() => reject(e)))
    Browser.addListener('browserFinished', () => setTimeout(() => finish(() => reject(new Error('Sign-in was cancelled.'))), 1500))
  })
}

/** Android: native Google account picker → ID token → Supabase session; falls back to web sign-in. Web: redirect. */
export async function signInWithGoogle() {
  if (native) {
    try {
      if (!initialized) {
        await SocialLogin.initialize({ google: { webClientId: WEB_CLIENT_ID } })
        initialized = true
      }
      // Google's standard "Sign in with Google" screen, exactly once: the plugin's hidden automatic retry is switched off.
      // Basic sign-in already includes name, email and photo.
      const res = await SocialLogin.login({ provider: 'google', options: { style: 'standard' }, _googleReauthRetry: true })
      const idToken = res?.result?.idToken
      if (!idToken) throw new Error('Google didn’t return a sign-in token.')
      const { data, error } = await supabase().auth.signInWithIdToken({ provider: 'google', token: idToken })
      if (error) throw error
      return profileFromUser(data.user)
    } catch (e) {
      const msg = String(e?.message || e)
      if (/reauth|\[16\]/i.test(msg)) {
        const err = new Error('Google refused this account for WayTogether (error 16). The app owner must add it as a test user or publish the app in Google Cloud → Audience.')
        err.canUseBrowser = true
        throw err
      }
      if (!/cancel/i.test(msg)) e.canUseBrowser = true
      throw e
    }
  }
  const { error } = await supabase().auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${window.location.origin}${window.location.pathname}` },
  })
  if (error) throw error
  return null // the page navigates to Google and comes back signed in
}

export async function currentGoogleProfile() {
  if (BACKEND !== 'supabase') return null
  try {
    const { data } = await supabase().auth.getSession()
    return data.session ? profileFromUser(data.session.user) : null
  } catch {
    return null
  }
}

export async function signOut() {
  try {
    await supabase().auth.signOut()
  } catch {
    /* offline: the local session is cleared anyway */
  }
  if (native) {
    try {
      await SocialLogin.logout({ provider: 'google' })
    } catch {
      /* not signed in natively */
    }
  }
}
