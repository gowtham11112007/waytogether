import { Capacitor } from '@capacitor/core'
import { SocialLogin } from '@capgo/capacitor-social-login'
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

/** Android: native Google account picker → ID token → Supabase session. Web: redirect to Google. */
export async function signInWithGoogle() {
  if (native) {
    if (!initialized) {
      await SocialLogin.initialize({ google: { webClientId: WEB_CLIENT_ID } })
      initialized = true
    }
    const res = await SocialLogin.login({ provider: 'google', options: {} }) // basic sign-in already includes name, email, photo
    const idToken = res?.result?.idToken
    if (!idToken) throw new Error('Google didn’t return a sign-in token.')
    const { data, error } = await supabase().auth.signInWithIdToken({ provider: 'google', token: idToken })
    if (error) throw error
    return profileFromUser(data.user)
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
