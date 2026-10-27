import { createSign } from 'node:crypto'

// POST /api/notify { tokens: string[], title, body, kind: 'sos' | 'trip' }
// Sends a push alert to riders' phones through Firebase Cloud Messaging (free). The Firebase service account
// is the FCM_SERVICE_ACCOUNT environment variable on Vercel (the JSON key file's contents).
const account = (() => {
  try {
    return JSON.parse(process.env.FCM_SERVICE_ACCOUNT || '')
  } catch {
    return null
  }
})()

const b64 = (v) => Buffer.from(typeof v === 'string' ? v : JSON.stringify(v)).toString('base64url')
let cached = { token: null, until: 0 }

// A Google OAuth token for FCM, from a JWT signed with the service account key (cached for ~50 minutes).
async function accessToken() {
  if (cached.token && Date.now() < cached.until) return cached.token
  const now = Math.floor(Date.now() / 1000)
  const unsigned = `${b64({ alg: 'RS256', typ: 'JWT' })}.${b64({ iss: account.client_email, scope: 'https://www.googleapis.com/auth/firebase.messaging', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 })}`
  const signature = createSign('RSA-SHA256').update(unsigned).sign(account.private_key, 'base64url')
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${unsigned}.${signature}` }),
  })
  const data = await res.json()
  if (!data.access_token) throw new Error('Google sign-in failed')
  cached = { token: data.access_token, until: Date.now() + 50 * 60 * 1000 }
  return cached.token
}

const clip = (s, n) => String(s || '').slice(0, n)

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })
  if (!account) return res.status(503).json({ error: 'Push is not set up' })

  const { tokens, title, body, kind } = req.body || {}
  const list = Array.isArray(tokens) ? [...new Set(tokens.filter((t) => typeof t === 'string' && t.length < 400))].slice(0, 50) : []
  if (!list.length || !title) return res.status(400).json({ error: 'tokens and title are needed' })
  const urgent = kind === 'sos'

  try {
    const auth = await accessToken()
    const url = `https://fcm.googleapis.com/v1/projects/${account.project_id}/messages:send`
    const results = await Promise.all(
      list.map((token) =>
        fetch(url, {
          method: 'POST',
          headers: { Authorization: `Bearer ${auth}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: {
              token,
              notification: { title: clip(title, 120), body: clip(body, 300) },
              android: {
                priority: 'HIGH',
                ttl: urgent ? '3600s' : '900s',
                // The app's own channels (TripAlertsPlugin): "SOS & emergencies" is the loud one.
                notification: { channel_id: urgent ? 'urgent' : 'trip', default_sound: true },
              },
            },
          }),
        }).then((r) => r.ok),
      ),
    )
    return res.status(200).json({ sent: results.filter(Boolean).length, failed: results.filter((ok) => !ok).length })
  } catch (e) {
    return res.status(502).json({ error: clip(e.message, 200) })
  }
}
