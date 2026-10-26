// Renders the website's icons and link-preview image into public/ (run: node scripts/generate_web_assets.mjs).
// Uses the local Chrome through puppeteer-core, like the promo screenshot scripts.
import puppeteer from 'puppeteer-core'
import fs from 'fs'
import path from 'path'

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const OUT = path.resolve('public')
const SHOT = path.resolve('promo-screenshots/04_live_convoy_navigation.png')
fs.mkdirSync(OUT, { recursive: true })

// The app logo (same drawing as <Logo /> in src/components/ui.jsx).
const glyph = `<path d="M5 18 C 8 12, 12 9, 19 6" stroke="#fff" stroke-opacity="0.5" stroke-width="2" stroke-linecap="round"/>
  <circle cx="6" cy="17" r="2.3" fill="#fff" fill-opacity="0.6"/>
  <circle cx="11.5" cy="11.4" r="2.7" fill="#fff" fill-opacity="0.85"/>
  <circle cx="18" cy="6.6" r="3.1" fill="#fff"/>`
const logo = (rx) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="${rx}" fill="#1A73E8"/>
  <g transform="translate(12.16 12.16) scale(1.6533)" fill="none">${glyph}</g>
</svg>`

// Rounded for browser tabs; square for home-screen icons (phones round them themselves).
fs.writeFileSync(path.join(OUT, 'favicon.svg'), logo(19))
const square = logo(0)

const shot = `data:image/png;base64,${fs.readFileSync(SHOT).toString('base64')}`
const og = `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;700;800&display=block" rel="stylesheet">
<style>
  body { margin: 0; width: 1200px; height: 630px; overflow: hidden; position: relative; font-family: 'Plus Jakarta Sans', sans-serif;
    background: radial-gradient(circle at 85% 20%, #DCEAFE 0, rgba(220,234,254,0) 45%), linear-gradient(135deg, #F5F9FF 0%, #FFFFFF 60%, #EEF4FF 100%); }
  .copy { position: absolute; left: 72px; top: 66px; width: 640px; }
  .brand { display: flex; align-items: center; gap: 16px; font-size: 32px; font-weight: 800; color: #111827; }
  .brand svg { width: 60px; height: 60px; }
  h1 { margin: 46px 0 0; font-size: 70px; line-height: 76px; font-weight: 800; letter-spacing: -0.03em; color: #111827; }
  p { margin: 24px 0 0; font-size: 27px; line-height: 38px; font-weight: 500; color: #4B5563; }
  .chips { display: flex; gap: 12px; margin-top: 36px; }
  .chip { display: flex; align-items: center; gap: 10px; padding: 12px 20px; border-radius: 999px; background: #fff; font-size: 21px; font-weight: 700; color: #111827; box-shadow: 0 4px 14px rgba(17,24,39,0.08); }
  .dot { width: 12px; height: 12px; border-radius: 50%; }
  .phone { position: absolute; right: 92px; top: 62px; width: 300px; height: 650px; border-radius: 48px; background: #111827; padding: 11px; box-sizing: border-box;
    box-shadow: 0 30px 70px rgba(17,24,39,0.28); }
  .phone img { width: 100%; display: block; border-radius: 38px; }
</style></head><body>
  <div class="copy">
    <div class="brand">${logo(19)} WayTogether</div>
    <h1>Keep the Journey Together.</h1>
    <p>A live map for group rides and road trips. See every friend, know who stopped or fell behind, and send an SOS in one hold.</p>
    <div class="chips">
      <span class="chip"><span class="dot" style="background:#16A34A"></span>Live group map</span>
      <span class="chip"><span class="dot" style="background:#F59E0B"></span>Smart alerts</span>
      <span class="chip"><span class="dot" style="background:#E5383B"></span>SOS</span>
    </div>
  </div>
  <div class="phone"><img src="${shot}" alt=""></div>
</body></html>`

const browser = await puppeteer.launch({ executablePath: CHROME_PATH, headless: true, args: ['--force-color-profile=srgb', '--hide-scrollbars'] })
try {
  const page = await browser.newPage()
  for (const [file, size] of [['icon-512.png', 512], ['icon-192.png', 192], ['apple-touch-icon.png', 180]]) {
    await page.setViewport({ width: size, height: size, deviceScaleFactor: 1 })
    await page.setContent(`<html><body style="margin:0">${square.replace('<svg ', `<svg width="${size}" height="${size}" `)}</body></html>`)
    await page.screenshot({ path: path.join(OUT, file), omitBackground: true })
  }
  await page.setViewport({ width: 1200, height: 630, deviceScaleFactor: 1 })
  await page.setContent(og, { waitUntil: 'networkidle0' })
  await page.evaluate(() => document.fonts.ready)
  await page.screenshot({ path: path.join(OUT, 'og-image.png') })
} finally {
  await browser.close()
}
console.log('Wrote favicon.svg, icon-192.png, icon-512.png, apple-touch-icon.png, og-image.png to public/')
