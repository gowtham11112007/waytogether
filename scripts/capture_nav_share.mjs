import puppeteer from 'puppeteer-core'
import path from 'path'

const OUT_DIR = path.resolve('promo-screenshots')
const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const BASE_URL = 'http://localhost:5173'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function captureNavAndShare() {
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

  const profile = {
    id: 'usr_alex',
    name: 'Alex Carter',
    email: 'alex.carter@roadtrips.io',
    google: true,
  }

  const setup = async () => {
    await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' })
    await page.evaluate((p, t) => {
      localStorage.clear()
      localStorage.setItem('convoya.profile', JSON.stringify(p))
      localStorage.setItem('convoya.trip', JSON.stringify(t))
      localStorage.setItem('convoya.settings', JSON.stringify({ mapStyle: 'light', sounds: true, keepAwake: true }))
    }, profile, tripState)

    // Position along ECR highway heading south (185 degrees)
    const mockLat = 12.7930
    const mockLng = 80.2450
    await page.goto(`${BASE_URL}/?mock=${mockLat},${mockLng}&heading=185&speed=68&local=1`, { waitUntil: 'networkidle2' })

    // Inject peers via BroadcastChannel
    await page.evaluate((meta, code) => {
      const bc = new BroadcastChannel('convoya-local')
      const peers = [
        {
          id: 'peer_priya',
          name: 'Priya Nair',
          role: 'member',
          lat: 12.7870,
          lng: 80.2440,
          speed: 68,
          heading: 185,
          battery: 76,
          status: 'riding',
          updatedAt: Date.now(),
          trip: meta,
        },
        {
          id: 'peer_arjun',
          name: 'Arjun Sharma',
          role: 'sweep',
          lat: 12.7985,
          lng: 80.2455,
          speed: 64,
          heading: 185,
          battery: 88,
          status: 'riding',
          updatedAt: Date.now(),
          trip: meta,
        },
        {
          id: 'peer_vikram',
          name: 'Vikram Das',
          role: 'member',
          lat: 12.8020,
          lng: 80.2460,
          speed: 55,
          heading: 185,
          battery: 64,
          status: 'riding',
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

  // 1. Capture 3D Heading-Up Live Navigation Mode
  console.log('Capturing 3D Live Navigation Mode...')
  await setup()
  // Tap the Navigation / Follow mode button twice to enter 3D 'nav' mode
  // The button has aria-label="Follow me" or "Navigation view"
  const navBtn = await page.evaluateHandle(() => {
    const buttons = Array.from(document.querySelectorAll('button'))
    return buttons.find((b) => b.getAttribute('aria-label') === 'Follow me' || b.getAttribute('aria-label') === 'Navigation view')
  })
  if (navBtn && navBtn.click) {
    // Click once to go to 'me'
    await navBtn.click()
    await sleep(600)
    // Click again to go to 'nav' (3D heading-up view)
    const navBtn2 = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll('button'))
      return buttons.find((b) => b.getAttribute('aria-label') === 'Navigation view' || b.getAttribute('aria-label') === 'Follow me')
    })
    if (navBtn2 && navBtn2.click) {
      await navBtn2.click()
      await sleep(1500)
    }
  }

  await page.screenshot({ path: path.join(OUT_DIR, '04_live_group_navigation_3d.png'), type: 'png' })
  console.log('✓ Saved 04_live_group_navigation_3d.png!')

  // 2. Capture the Live Share & Convoy Invite Modal
  console.log('Capturing Live Share / Invite Modal...')
  // Click on the "+ Invite" button in the bottom sheet
  const inviteBtn = await page.evaluateHandle(() => {
    const buttons = Array.from(document.querySelectorAll('button'))
    return buttons.find((b) => b.textContent.includes('Invite') || b.getAttribute('aria-label') === 'Invite friends')
  })
  if (inviteBtn && inviteBtn.click) {
    await inviteBtn.click()
    await sleep(800)
    await page.screenshot({ path: path.join(OUT_DIR, '12_live_share_invite_modal.png'), type: 'png' })
    console.log('✓ Saved 12_live_share_invite_modal.png!')
  }

  // 3. Capture Trip Options & External Turn-by-Turn Navigation Menu
  console.log('Capturing Trip Options & Navigation Menu...')
  await setup()
  // Click Menu button (top left hamburger menu)
  const menuBtn = await page.evaluateHandle(() => {
    const buttons = Array.from(document.querySelectorAll('button'))
    return buttons.find((b) => b.querySelector('svg.lucide-menu'))
  })
  if (menuBtn && menuBtn.click) {
    await menuBtn.click()
    await sleep(800)
    await page.screenshot({ path: path.join(OUT_DIR, '13_trip_navigation_menu.png'), type: 'png' })
    console.log('✓ Saved 13_trip_navigation_menu.png!')
  }

  await browser.close()
  console.log('Done capturing group navigation and live share features!')
}

captureNavAndShare().catch(console.error)
