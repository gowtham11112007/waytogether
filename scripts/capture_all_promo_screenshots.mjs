import puppeteer from 'puppeteer-core'
import path from 'path'
import fs from 'fs'

const OUT_DIR = path.resolve('promo-screenshots')
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true })

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const BASE_URL = 'http://localhost:5173'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function captureAll() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-web-security',
      '--hide-scrollbars',
      '--disable-features=Translate',
      '--force-color-profile=srgb',
    ],
  })

  const page = await browser.newPage()
  await page.setViewport({
    width: 412,
    height: 892,
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
  })

  const now = Date.now()
  const profile = {
    id: 'usr_alex',
    name: 'Alex Carter',
    email: 'alex.carter@roadtrips.io',
    google: true,
  }

  const history = [
    {
      id: 'hist_1',
      code: 'WAY-4192',
      name: 'Nilgiri Ghat Pass Ride',
      from: 'Coimbatore Foothills',
      to: 'Ooty Viewpoint',
      type: 'Bike',
      startedAt: now - 86400000 * 2,
      endedAt: now - 86400000 * 2 + 14400000,
      distance: 84200,
      maxSpeed: 82,
      riders: ['Alex Carter', 'Arjun Sharma', 'Priya Nair'],
      alerts: 2,
      messages: 18,
    },
    {
      id: 'hist_2',
      code: 'WAY-3011',
      name: 'Weekend Coastal Highway',
      from: 'Chennai Marina',
      to: 'Pondicherry Beach',
      type: 'Car',
      startedAt: now - 86400000 * 5,
      endedAt: now - 86400000 * 5 + 18000000,
      distance: 142000,
      maxSpeed: 105,
      riders: ['Alex Carter', 'Rohan Gupta', 'Kavita Rao', 'Sameer'],
      alerts: 1,
      messages: 34,
    },
  ]

  const code = 'WAY-7824'
  const tripMeta = {
    code,
    name: 'Mahabalipuram Coastal Ride',
    type: 'Bike',
    start: { name: 'Chennai ECR Start', latlng: [12.9830, 80.2594] },
    dest: { name: 'Mahabalipuram Shore Temple', latlng: [12.6208, 80.1944] },
    leaderId: 'usr_alex',
    leaderName: 'Alex Carter',
    createdAt: now - 3600000,
    rev: 1,
    playlist: 'https://open.spotify.com/playlist/37i9dQZF1DXdLEN7aqioXM',
  }

  const tripState = {
    code,
    role: 'leader',
    status: 'riding',
    meta: tripMeta,
    stats: {
      startedAt: now - 3600000,
      distance: 32400,
      maxSpeed: 78,
      riders: ['Alex Carter', 'Arjun Sharma', 'Priya Nair', 'Vikram Das'],
    },
  }

  const chatMessages = [
    { id: 'm1', from: 'peer_arjun', name: 'Arjun Sharma', text: 'All clear at the back. Sweeping at 65 km/h.', at: now - 600000 },
    { id: 'm2', from: 'peer_priya', name: 'Priya Nair', text: 'Scenic stretch coming up on the left side!', at: now - 350000 },
    { id: 'm3', from: 'usr_alex', name: 'Alex Carter', text: 'Great pace everyone. Regrouping at the coastal café.', at: now - 180000 },
    { id: 'm4', from: 'peer_vikram', name: 'Vikram Das', text: 'Quick 2-min fuel stop at IndianOil.', at: now - 60000 },
    { id: 'm5', from: 'usr_alex', name: 'Alex Carter', text: 'Got it Vikram, we will slow down to 50.', at: now - 20000 },
  ]

  // ==========================================
  // SCREEN 1: Onboarding / Welcome
  // ==========================================
  console.log('Capturing Screen 1: Onboarding Welcome...')
  await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' })
  await page.evaluate(() => localStorage.clear())
  await page.reload({ waitUntil: 'networkidle2' })
  await sleep(1000)
  await page.screenshot({ path: path.join(OUT_DIR, '01_onboarding_welcome.png'), type: 'png' })
  console.log('✓ 01_onboarding_welcome.png')

  // ==========================================
  // SCREEN 2: Home Dashboard
  // ==========================================
  console.log('Capturing Screen 2: Home Dashboard...')
  await page.evaluate((p, h) => {
    localStorage.clear()
    localStorage.setItem('convoya.profile', JSON.stringify(p))
    localStorage.setItem('convoya.history', JSON.stringify(h))
    localStorage.setItem('convoya.settings', JSON.stringify({ mapStyle: 'light', sounds: true, keepAwake: true }))
  }, profile, history)

  await page.goto(`${BASE_URL}/?mock=12.9830,80.2594&heading=180&speed=0&local=1`, { waitUntil: 'networkidle2' })
  await sleep(3500)
  await page.screenshot({ path: path.join(OUT_DIR, '02_home_dashboard.png'), type: 'png' })
  console.log('✓ 02_home_dashboard.png')

  // ==========================================
  // SCREEN 3: Route Preview & Trip Creation
  // ==========================================
  console.log('Capturing Screen 3: Route Preview & Trip Creation...')
  const searchBtn = await page.$('button.flex.h-14') || await page.$('.truncate')
  if (searchBtn) {
    await searchBtn.click()
    await page.waitForSelector('input[aria-label="Search destination"]', { timeout: 3000 })
    const searchInput = await page.$('input[aria-label="Search destination"]')
    await searchInput.type('Mahabalipuram', { delay: 40 })
    await page.waitForSelector('ul li button', { timeout: 8000 })
    const item = await page.$('ul li button')
    await item.click()
    await sleep(3500)
    await page.screenshot({ path: path.join(OUT_DIR, '03_route_preview_create.png'), type: 'png' })
    console.log('✓ 03_route_preview_create.png')
  }

  // Helper function to launch Live Trip screen with peers and chat
  const setupTripPage = async () => {
    await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' })
    await page.evaluate((p, t, msgs, h) => {
      localStorage.clear()
      localStorage.setItem('convoya.profile', JSON.stringify(p))
      localStorage.setItem('convoya.trip', JSON.stringify(t))
      localStorage.setItem('convoya.history', JSON.stringify(h))
      localStorage.setItem(`convoya.chat.${t.code}`, JSON.stringify(msgs))
      localStorage.setItem('convoya.settings', JSON.stringify({ mapStyle: 'light', sounds: true, keepAwake: true }))
    }, profile, tripState, chatMessages, history)

    const mockLat = 12.7930
    const mockLng = 80.2450
    await page.goto(`${BASE_URL}/?mock=${mockLat},${mockLng}&heading=185&speed=64&local=1`, { waitUntil: 'networkidle2' })

    // Inject peers via BroadcastChannel
    await page.evaluate((meta, code) => {
      const bc = new BroadcastChannel('convoya-local')
      const peers = [
        {
          id: 'peer_arjun',
          name: 'Arjun Sharma',
          role: 'sweep',
          lat: 12.7965,
          lng: 80.2455,
          speed: 62,
          heading: 185,
          battery: 88,
          status: 'riding',
          updatedAt: Date.now(),
          trip: meta,
        },
        {
          id: 'peer_priya',
          name: 'Priya Nair',
          role: 'member',
          lat: 12.7905,
          lng: 80.2445,
          speed: 65,
          heading: 185,
          battery: 76,
          status: 'riding',
          updatedAt: Date.now(),
          trip: meta,
        },
        {
          id: 'peer_vikram',
          name: 'Vikram Das',
          role: 'member',
          lat: 12.7985,
          lng: 80.2460,
          speed: 0,
          heading: 185,
          battery: 64,
          status: 'fuel',
          updatedAt: Date.now(),
          trip: meta,
        },
      ]

      const broadcastAll = () => {
        peers.forEach((p) => {
          p.updatedAt = Date.now()
          bc.postMessage({ t: 'presence', code, key: p.id, payload: p })
        })
      }

      broadcastAll()
      if (window.__peerInterval) clearInterval(window.__peerInterval)
      window.__peerInterval = setInterval(broadcastAll, 1000)
    }, tripMeta, code)

    await sleep(3500)
  }

  // ==========================================
  // SCREEN 4: Live Convoy Navigation
  // ==========================================
  console.log('Capturing Screen 4: Live Convoy Navigation...')
  await setupTripPage()
  await page.screenshot({ path: path.join(OUT_DIR, '04_live_convoy_navigation.png'), type: 'png' })
  console.log('✓ 04_live_convoy_navigation.png')

  // ==========================================
  // SCREEN 5: Convoy Health & Group Roster Sheet
  // ==========================================
  console.log('Capturing Screen 5: Convoy Health Sheet...')
  const expandBtn = await page.$('button[aria-label="Open convoy sheet"]') || await page.$('.h-1\\.5.w-10') || await page.$('h2')
  if (expandBtn) {
    await expandBtn.click()
    await sleep(600)
  }
  await page.screenshot({ path: path.join(OUT_DIR, '05_convoy_health_sheet.png'), type: 'png' })
  console.log('✓ 05_convoy_health_sheet.png')

  // ==========================================
  // SCREEN 6: Rider Telemetry & Navigation Detail
  // ==========================================
  console.log('Capturing Screen 6: Rider Telemetry Detail...')
  await setupTripPage()
  const friendChip = await page.evaluateHandle(() => {
    const buttons = Array.from(document.querySelectorAll('button'))
    return buttons.find((b) => b.textContent.includes('Arjun'))
  })
  if (friendChip && friendChip.click) {
    await friendChip.click()
    await sleep(600)
  }
  await page.screenshot({ path: path.join(OUT_DIR, '06_rider_telemetry_detail.png'), type: 'png' })
  console.log('✓ 06_rider_telemetry_detail.png')

  // ==========================================
  // SCREEN 7: In-Trip Convoy Chat
  // ==========================================
  console.log('Capturing Screen 7: In-Trip Convoy Chat...')
  await setupTripPage()
  const chatBtn = await page.evaluateHandle(() => {
    const buttons = Array.from(document.querySelectorAll('button'))
    return buttons.find((b) => b.querySelector('svg.lucide-message-circle') || b.querySelector('svg.lucide-message-square') || b.getAttribute('aria-label') === 'Chat' || b.getAttribute('aria-label') === 'Messages')
  })
  if (chatBtn && chatBtn.click) {
    await chatBtn.click()
    await sleep(600)
  }
  await page.screenshot({ path: path.join(OUT_DIR, '07_in_trip_group_chat.png'), type: 'png' })
  console.log('✓ 07_in_trip_group_chat.png')

  // ==========================================
  // SCREEN 8: Music Controls & Playlist
  // ==========================================
  console.log('Capturing Screen 8: Music Controls & Playlist...')
  await setupTripPage()
  const musicBtn = await page.evaluateHandle(() => {
    const buttons = Array.from(document.querySelectorAll('button'))
    return buttons.find((b) => b.querySelector('svg.lucide-music') || b.querySelector('svg.lucide-music-2') || b.getAttribute('aria-label') === 'Music')
  })
  if (musicBtn && musicBtn.click) {
    await musicBtn.click()
    await sleep(600)
  }
  await page.screenshot({ path: path.join(OUT_DIR, '08_music_controls_playlist.png'), type: 'png' })
  console.log('✓ 08_music_controls_playlist.png')

  // ==========================================
  // SCREEN 9: Trip Status Quick Picker
  // ==========================================
  console.log('Capturing Screen 9: Status Quick Picker...')
  await setupTripPage()
  const statusBtn = await page.evaluateHandle(() => {
    const buttons = Array.from(document.querySelectorAll('button'))
    return buttons.find((b) => b.textContent.includes('Status'))
  })
  if (statusBtn && statusBtn.click) {
    await statusBtn.click()
    await sleep(600)
  }
  await page.screenshot({ path: path.join(OUT_DIR, '09_status_quick_picker.png'), type: 'png' })
  console.log('✓ 09_status_quick_picker.png')

  // ==========================================
  // SCREEN 10: Emergency SOS Screen
  // ==========================================
  console.log('Capturing Screen 10: Emergency SOS...')
  await setupTripPage()
  const sosBtn = await page.evaluateHandle(() => {
    const buttons = Array.from(document.querySelectorAll('button'))
    return buttons.find((b) => b.textContent.includes('SOS') || b.getAttribute('aria-label') === 'SOS')
  })
  if (sosBtn && sosBtn.click) {
    await sosBtn.click()
    await sleep(600)
  }
  await page.screenshot({ path: path.join(OUT_DIR, '10_emergency_sos_screen.png'), type: 'png' })
  console.log('✓ 10_emergency_sos_screen.png')

  // ==========================================
  // SCREEN 11: Trip Summary & Analytics
  // ==========================================
  console.log('Capturing Screen 11: Trip Summary / Analytics...')
  await page.goto(`${BASE_URL}/?mock=12.9830,80.2594&heading=180&speed=0&local=1`, { waitUntil: 'networkidle2' })
  await sleep(1500)
  const lastTripBtn = await page.evaluateHandle(() => {
    const buttons = Array.from(document.querySelectorAll('button'))
    return buttons.find((b) => b.textContent.includes('Last trip'))
  })
  if (lastTripBtn && lastTripBtn.click) {
    await lastTripBtn.click()
    await sleep(600)
    const tripItem = await page.$('ul li button')
    if (tripItem) {
      await tripItem.click()
      await sleep(800)
      await page.screenshot({ path: path.join(OUT_DIR, '11_trip_summary_analytics.png'), type: 'png' })
      console.log('✓ 11_trip_summary_analytics.png')
    }
  }

  await browser.close()
  console.log('All 11 promo screenshots captured and ready!')
}

captureAll().catch(console.error)
