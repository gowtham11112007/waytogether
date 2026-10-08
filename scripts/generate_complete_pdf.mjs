import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer-core';

const BASE_DIR = '/Users/gowthamyuvaraj/Desktop/TRAVA';
const SCREENSHOT_DIR = path.join(BASE_DIR, 'promo-screenshots');
const OUTPUT_PDF_PATH = path.join(BASE_DIR, 'WayTogether_Complete_Documentation_and_Showcase.pdf');
const ARTIFACT_PDF_PATH = '/Users/gowthamyuvaraj/.gemini/antigravity/brain/6f66e3fc-c8a0-4ce3-9401-ecc0484aa116/WayTogether_Complete_Documentation_and_Showcase.pdf';

function getImageBase64(filename) {
  const filePath = path.join(SCREENSHOT_DIR, filename);
  if (!fs.existsSync(filePath)) {
    console.warn(`File not found: ${filePath}`);
    return '';
  }
  const buffer = fs.readFileSync(filePath);
  return `data:image/png;base64,${buffer.toString('base64')}`;
}

const images = {
  onboarding: getImageBase64('01_onboarding_welcome.png'),
  home: getImageBase64('02_home_dashboard.png'),
  route: getImageBase64('03_route_preview_create.png'),
  map2d: getImageBase64('04_live_convoy_navigation.png'),
  nav3d: getImageBase64('04_live_group_navigation_3d.png'),
  health: getImageBase64('05_convoy_health_sheet.png'),
  telemetry: getImageBase64('06_rider_telemetry_detail.png'),
  chat: getImageBase64('07_in_trip_group_chat.png'),
  music: getImageBase64('08_music_controls_playlist.png'),
  status: getImageBase64('09_status_quick_picker.png'),
  sos: getImageBase64('10_emergency_sos_screen.png'),
  summary: getImageBase64('11_trip_summary_analytics.png'),
  invite: getImageBase64('12_live_share_invite_modal.png'),
  menu: getImageBase64('13_trip_navigation_menu.png'),
};

const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>WayTogether (TRAVA) — Complete System & Product Documentation</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');

    @page {
      size: A4;
      margin: 15mm 14mm 15mm 14mm;
    }

    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    body {
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      color: #1e293b;
      background: #ffffff;
      line-height: 1.55;
      font-size: 9.5pt;
      margin: 0;
      padding: 0;
    }

    /* Page Breaks */
    .page-break {
      page-break-before: always;
      break-before: page;
    }
    .avoid-break {
      page-break-inside: avoid;
      break-inside: avoid;
    }

    /* Headings */
    h1, h2, h3, h4 {
      color: #0f172a;
      font-weight: 700;
      margin-top: 0;
    }
    h1 {
      font-size: 22pt;
      letter-spacing: -0.5px;
      margin-bottom: 8px;
    }
    h2 {
      font-size: 14pt;
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 6px;
      margin-top: 0;
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    h2 .section-num {
      background: #2563eb;
      color: white;
      font-size: 8.5pt;
      padding: 2px 7px;
      border-radius: 4px;
      font-weight: 700;
    }
    h3 {
      font-size: 11.5pt;
      margin-top: 12px;
      margin-bottom: 6px;
      color: #0f172a;
    }
    h4 {
      font-size: 10pt;
      margin-top: 8px;
      margin-bottom: 4px;
      color: #334155;
    }

    p {
      margin: 0 0 8px 0;
      color: #334155;
    }

    /* Badges & Pills */
    .badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 9999px;
      font-size: 7.5pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .badge-blue { background: #dbeafe; color: #1e40af; }
    .badge-green { background: #dcfce7; color: #166534; }
    .badge-amber { background: #fef3c7; color: #92400e; }
    .badge-red { background: #fee2e2; color: #991b1b; }
    .badge-purple { background: #f3e8ff; color: #6b21a8; }
    .badge-slate { background: #f1f5f9; color: #334155; }

    /* Cover Page */
    .cover-page {
      box-sizing: border-box;
      min-height: 255mm;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: 36px 30px;
      background: linear-gradient(145deg, #0b1120 0%, #1e293b 55%, #0f172a 100%);
      color: #ffffff;
      border-radius: 12px;
      position: relative;
      overflow: hidden;
    }
    .cover-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      position: relative;
      z-index: 2;
    }
    .brand-logo {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .logo-icon {
      width: 44px;
      height: 44px;
      background: linear-gradient(135deg, #2563eb, #06b6d4);
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 22px;
      font-weight: 800;
      color: white;
      box-shadow: 0 4px 14px rgba(37,99,235,0.4);
    }
    .brand-title {
      font-size: 19pt;
      font-weight: 800;
      letter-spacing: -0.5px;
      color: #ffffff;
      line-height: 1.1;
    }
    .brand-tag {
      font-size: 8.5pt;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 1.5px;
    }
    .cover-hero {
      position: relative;
      z-index: 2;
      margin: 16px 0;
    }
    .cover-hero-title {
      font-size: 26pt;
      font-weight: 800;
      line-height: 1.15;
      letter-spacing: -0.8px;
      margin-bottom: 10px;
      color: #ffffff;
      text-shadow: 0 2px 10px rgba(0,0,0,0.4);
    }
    .cover-hero-subtitle {
      font-size: 11.5pt;
      color: #cbd5e1;
      max-width: 640px;
      line-height: 1.45;
      margin-bottom: 20px;
    }
    .cover-mockups {
      display: flex;
      justify-content: center;
      gap: 16px;
      margin-top: 10px;
    }
    .cover-phone {
      width: 160px;
      border-radius: 18px;
      border: 3.5px solid rgba(255,255,255,0.25);
      box-shadow: 0 20px 40px -10px rgba(0, 0, 0, 0.8);
      overflow: hidden;
      background: #000;
    }
    .cover-phone img {
      width: 100%;
      height: auto;
      display: block;
    }
    .cover-footer {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      border-top: 1px solid rgba(255,255,255,0.15);
      padding-top: 14px;
      position: relative;
      z-index: 2;
    }
    .meta-item {
      font-size: 7.5pt;
      color: #94a3b8;
    }
    .meta-val {
      font-size: 9pt;
      font-weight: 600;
      color: #f8fafc;
    }

    /* Table of Contents */
    .toc-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 14px 18px;
      margin-bottom: 16px;
    }
    .toc-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px 24px;
    }
    .toc-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 8.5pt;
      border-bottom: 1px dotted #cbd5e1;
      padding-bottom: 3px;
    }
    .toc-item strong {
      color: #0f172a;
    }
    .toc-item span {
      color: #2563eb;
      font-weight: 600;
      font-family: 'JetBrains Mono', monospace;
    }

    /* Tables */
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 8px 0 14px 0;
      font-size: 8.5pt;
    }
    th {
      background: #f1f5f9;
      color: #0f172a;
      text-align: left;
      padding: 6px 10px;
      font-weight: 700;
      border: 1px solid #e2e8f0;
    }
    td {
      padding: 6px 10px;
      border: 1px solid #e2e8f0;
      color: #334155;
    }
    tr:nth-child(even) td {
      background: #f8fafc;
    }

    /* Cards & Callouts */
    .callout {
      border-left: 4px solid #2563eb;
      background: #eff6ff;
      padding: 10px 14px;
      border-radius: 0 6px 6px 0;
      margin: 10px 0 12px 0;
      font-size: 8.5pt;
    }
    .callout-title {
      font-weight: 700;
      color: #1e40af;
      margin-bottom: 2px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .callout-warn {
      border-left-color: #f59e0b;
      background: #fffbeb;
    }
    .callout-warn .callout-title {
      color: #b45309;
    }
    .callout-danger {
      border-left-color: #ef4444;
      background: #fef2f2;
    }
    .callout-danger .callout-title {
      color: #b91c1c;
    }

    /* Single Feature Showcase Layout */
    .feature-showcase-row {
      display: grid;
      grid-template-columns: 200px 1fr;
      gap: 20px;
      align-items: start;
      margin: 12px 0;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 14px;
      page-break-inside: avoid;
    }
    .mockup-frame {
      width: 100%;
      border-radius: 16px;
      border: 3.5px solid #0f172a;
      box-shadow: 0 10px 20px -3px rgba(0,0,0,0.15);
      overflow: hidden;
      background: #000;
    }
    .mockup-frame img {
      width: 100%;
      height: auto;
      display: block;
    }
    .feature-content h3 {
      margin-top: 0;
      color: #0f172a;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .feature-tagline {
      font-size: 9pt;
      font-style: italic;
      color: #2563eb;
      margin-bottom: 8px;
      font-weight: 600;
    }
    .feature-points {
      list-style: none;
      padding-left: 0;
      margin: 8px 0;
      font-size: 8.5pt;
    }
    .feature-points li {
      position: relative;
      padding-left: 16px;
      margin-bottom: 6px;
      color: #334155;
    }
    .feature-points li::before {
      content: '✓';
      position: absolute;
      left: 0;
      color: #10b981;
      font-weight: bold;
    }

    /* Screenshot Gallery Grid */
    .gallery-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
      margin: 10px 0;
    }
    .gallery-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 8px;
      text-align: center;
      page-break-inside: avoid;
    }
    .gallery-frame {
      width: 100%;
      border-radius: 10px;
      border: 2px solid #1e293b;
      overflow: hidden;
      margin-bottom: 6px;
    }
    .gallery-frame img {
      width: 100%;
      height: auto;
      display: block;
    }
    .gallery-title {
      font-size: 8.5pt;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 2px;
    }
    .gallery-sub {
      font-size: 7.5pt;
      color: #64748b;
      line-height: 1.25;
    }

    /* Code Blocks */
    pre {
      background: #0f172a;
      color: #f8fafc;
      font-family: 'JetBrains Mono', monospace;
      font-size: 7.5pt;
      padding: 10px 12px;
      border-radius: 6px;
      overflow-x: auto;
      line-height: 1.4;
      margin: 8px 0 12px 0;
      page-break-inside: avoid;
    }
    code {
      font-family: 'JetBrains Mono', monospace;
      background: #f1f5f9;
      color: #0f172a;
      padding: 1px 4px;
      border-radius: 3px;
      font-size: 8pt;
    }
    pre code {
      background: transparent;
      color: inherit;
      padding: 0;
    }

    /* Two column text */
    .columns-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }

    /* Stat Box */
    .stat-row {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      margin: 12px 0;
    }
    .stat-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 10px;
      text-align: center;
    }
    .stat-num {
      font-size: 16pt;
      font-weight: 800;
      color: #2563eb;
      font-family: 'JetBrains Mono', monospace;
    }
    .stat-label {
      font-size: 7.5pt;
      color: #64748b;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
  </style>
</head>
<body>

  <!-- ==================== COVER PAGE ==================== -->
  <div class="cover-page">
    <div class="cover-header">
      <div class="brand-logo">
        <div class="logo-icon">W</div>
        <div>
          <div class="brand-title">WayTogether</div>
          <div class="brand-tag">TRAVA Convoy Platform</div>
        </div>
      </div>
      <div>
        <span class="badge badge-blue" style="font-size:8.5pt; padding: 4px 10px;">Production Kit</span>
      </div>
    </div>

    <div class="cover-hero">
      <div class="cover-hero-title">Complete System Specification & Promotional Visual Kit</div>
      <div class="cover-hero-subtitle">
        Real-time telemetry, 3D heading-up group navigation, instant QR convoy sharing, and automated road safety for connected travel groups.
      </div>

      <div class="cover-mockups">
        <div class="cover-phone">
          <img src="${images.nav3d}" alt="3D Live Group Navigation">
        </div>
        <div class="cover-phone">
          <img src="${images.invite}" alt="Live Convoy Share & QR Join">
        </div>
        <div class="cover-phone">
          <img src="${images.menu}" alt="Trip Options & Anomaly Detection">
        </div>
      </div>
    </div>

    <div class="cover-footer">
      <div>
        <div class="meta-item">Application Identifier</div>
        <div class="meta-val">app.convoya.trip</div>
        <div class="meta-item" style="margin-top:4px;">Platforms</div>
        <div class="meta-val">Android Native (Capacitor 8) · Modern Web PWA</div>
      </div>
      <div>
        <div class="meta-item">Architecture</div>
        <div class="meta-val">Zero-DB Ephemeral Supabase Realtime</div>
        <div class="meta-item" style="margin-top:4px;">Map Engine</div>
        <div class="meta-val">MapLibre GL 3D (OpenFreeMap + Esri)</div>
      </div>
      <div style="text-align: right;">
        <div class="meta-item">Version</div>
        <div class="meta-val">v1.0.0 (Release-Ready)</div>
        <div class="meta-item" style="margin-top:4px;">Document Date</div>
        <div class="meta-val">October 2026</div>
      </div>
    </div>
  </div>

  <!-- ==================== TABLE OF CONTENTS & EXECUTIVE SUMMARY ==================== -->
  <div class="page-break"></div>

  <h2><span class="section-num">01</span> Executive Summary & Product Vision</h2>

  <div class="toc-card avoid-break">
    <div style="font-size: 9.5pt; font-weight: 700; color: #0f172a; margin-bottom: 6px;">Document Directory</div>
    <div class="toc-grid">
      <div class="toc-item"><strong>1. Executive Summary & Pillars</strong> <span>P. 02</span></div>
      <div class="toc-item"><strong>2. Flagship: 3D Live Navigation</strong> <span>P. 03</span></div>
      <div class="toc-item"><strong>3. Live Share & Convoy QR Join</strong> <span>P. 04</span></div>
      <div class="toc-item"><strong>4. Convoy Health & Heuristics</strong> <span>P. 05</span></div>
      <div class="toc-item"><strong>5. Automated Safety Matrix</strong> <span>P. 06</span></div>
      <div class="toc-item"><strong>6. Emergency SOS & Siren System</strong> <span>P. 07</span></div>
      <div class="toc-item"><strong>7. In-Ride Chat & Media Keys</strong> <span>P. 08</span></div>
      <div class="toc-item"><strong>8. Onboarding & Route Setup</strong> <span>P. 09</span></div>
      <div class="toc-item"><strong>9. Post-Trip Telemetry Logs</strong> <span>P. 10</span></div>
      <div class="toc-item"><strong>10. Architecture & Tech Matrix</strong> <span>P. 11</span></div>
      <div class="toc-item"><strong>11. Realtime Telemetry Schemas</strong> <span>P. 12</span></div>
      <div class="toc-item"><strong>12. Native Android Subsystem</strong> <span>P. 13</span></div>
      <div class="toc-item"><strong>13. Persistent Storage Contracts</strong> <span>P. 14</span></div>
      <div class="toc-item"><strong>14. Build, APK & OTA Releases</strong> <span>P. 15</span></div>
      <div class="toc-item"><strong>15. Promo Showcase (Part 1)</strong> <span>P. 16</span></div>
      <div class="toc-item"><strong>16. Promo Showcase (Part 2)</strong> <span>P. 18</span></div>
      <div class="toc-item"><strong>17. Promo Showcase (Part 3) & Specs</strong> <span>P. 20</span></div>
    </div>
  </div>

  <p>
    <strong>WayTogether (TRAVA)</strong> is a purpose-built real-time collaborative map and telemetry platform engineered specifically for groups traveling together — including motorcycle convoys, cycling clubs, car caravans, and overland exploration teams.
  </p>
  <p>
    Conventional turn-by-turn navigation applications (such as Google Maps, Apple Maps, or Waze) are fundamentally architected around isolated individuals navigating from Origin A to Destination B. They fail to solve the critical challenges of collective movement on open highways:
  </p>

  <div class="stat-row avoid-break">
    <div class="stat-box">
      <div class="stat-num">3s</div>
      <div class="stat-label">Telemetry Interval</div>
    </div>
    <div class="stat-box">
      <div class="stat-num">800m</div>
      <div class="stat-label">Pack Cluster Radius</div>
    </div>
    <div class="stat-box">
      <div class="stat-num">0 ms</div>
      <div class="stat-label">Server DB Latency</div>
    </div>
    <div class="stat-box">
      <div class="stat-num">55°</div>
      <div class="stat-label">3D Road Pitch Angle</div>
    </div>
  </div>

  <div class="columns-2 avoid-break" style="margin-top: 10px;">
    <div>
      <h3>The Group Coordination Breakdown</h3>
      <p style="font-size: 8.5pt;">
        When 4 to 20 riders embark on a highway trip, group cohesion naturally fragments. Riders get trapped behind heavy transport vehicles, take unexpected exits, or pull over due to mechanical failure or dehydration.
      </p>
      <p style="font-size: 8.5pt;">
        Today, convoys rely on messy WhatsApp location sharing (which throttles in the background, drains batteries, and lacks route context) or frantic roadside phone calls with riding gloves on.
      </p>
    </div>
    <div>
      <h3>The WayTogether Solution</h3>
      <p style="font-size: 8.5pt;">
        WayTogether eliminates cognitive load on the rider. It continuously calculates the spatial spread of the entire group, projects riders along the shared road route in 3D perspective, detects stranded riders automatically, and provides glove-friendly quick communications.
      </p>
      <p style="font-size: 8.5pt;">
        Best of all, it works ephemerally with zero database accounts required — just a 7-character trip code or QR scan.
      </p>
    </div>
  </div>

  <div class="callout avoid-break" style="margin-top: 10px;">
    <div class="callout-title">Core Product Pillars</div>
    <div style="font-size: 8.5pt; color: #334155;">
      <strong>1. Ephemeral Real-Time:</strong> Zero SQL tables. Live synchronization operates over WebSocket channels (Broadcast + Presence).<br>
      <strong>2. Background Endurance:</strong> Continuous GPS broadcasts even when the phone is locked inside a jacket pocket or tank bag.<br>
      <strong>3. Automated Convoy Health:</strong> Heuristic engine actively watches for fallen-behind riders, stalled bikes, and route deviations.<br>
      <strong>4. Distraction-Free Controls:</strong> Hardware headset volume/media key mapping, one-tap status broadcasts, and synthesized sound chimes.
    </div>
  </div>

  <!-- ==================== FLAGSHIP 1: 3D LIVE NAVIGATION ==================== -->
  <div class="page-break"></div>

  <h2><span class="section-num">02</span> Flagship Feature: 3D Live Group Navigation</h2>

  <p>
    The core cockpit experience unites real-time 3D camera tracking with continuous multi-rider road positioning.
  </p>

  <div class="feature-showcase-row">
    <div>
      <div class="mockup-frame">
        <img src="${images.nav3d}" alt="3D Live Group Navigation">
      </div>
    </div>
    <div class="feature-content">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <h3>3D Live Group Navigation (Heading-Up Mode)</h3>
        <span class="badge badge-blue">Cockpit Mode</span>
      </div>
      <div class="feature-tagline">"True 3D perspective tracking your entire convoy on the road ahead."</div>
      <p style="font-size: 8.5pt;">
        When riding at highway speeds, a 2D top-down map forces the rider to mentally translate rotations. WayTogether's cockpit mode tilts the MapLibre GL camera to a <strong>55° pitch</strong> and automatically rotates bearing to match device heading, positioning the user low on the display:
      </p>
      <ul class="feature-points">
        <li><strong>Real-Time Road Perspective:</strong> Convoy riders ahead appear physically further up the tilted highway route.</li>
        <li><strong>Floating Telemetry Badge:</strong> High-contrast HUD speedometer (e.g. <code>68 km/h</code>) calibrated from high-precision GPS fixes.</li>
        <li><strong>Dynamic Trip Header:</strong> Displays live remaining distance (<code>20 km</code>), ETA (<code>12:06</code>), and active rider count.</li>
        <li><strong>Convoy Proximity Pill:</strong> Live green status indicator (<em>"Everyone together · All 4 riders are within 800 m"</em>).</li>
        <li><strong>Instant Rider Distance Tags:</strong> Live distance badges directly below each avatar (<em>"Priya Nair 560 m"</em>, <em>"Vikram Das 1.1 km"</em>).</li>
        <li><strong>One-Tap SOS Access:</strong> High-visibility red emergency button positioned for immediate thumb activation.</li>
      </ul>
      <div class="callout" style="margin-top: 10px;">
        <div class="callout-title">Camera Mode Matrix</div>
        <div style="font-size: 8pt; color: #475569;">
          • <strong>'nav':</strong> 3D perspective, 55° pitch, heading-up rotation, offset [0, 110] for forward road preview.<br>
          • <strong>'group':</strong> Dynamic 2D bounding box auto-fitting all convoy members and the destination route.<br>
          • <strong>'me':</strong> Top-down locked tracking on user's current GPS position.<br>
          • <strong>'free':</strong> Unlocked pan and zoom gesture exploration.
        </div>
      </div>
    </div>
  </div>

  <!-- ==================== FLAGSHIP 2: LIVE SHARE & QR INVITE ==================== -->
  <div class="page-break"></div>

  <h2><span class="section-num">03</span> Flagship Feature: Live Share & Instant Convoy Invite</h2>

  <p>
    Joining a group trip must take seconds at a fuel pump or highway toll booth. WayTogether eliminates user account setup barriers and email invites.
  </p>

  <div class="feature-showcase-row">
    <div>
      <div class="mockup-frame">
        <img src="${images.invite}" alt="Live Share & QR Invite">
      </div>
    </div>
    <div class="feature-content">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <h3>Live Convoy Share & Scannable QR Code</h3>
        <span class="badge badge-green">Frictionless Join</span>
      </div>
      <div class="feature-tagline">"One tap to invite friends via scannable QR or memorable 7-character code."</div>
      <p style="font-size: 8.5pt;">
        Every trip generates a dedicated, ephemeral room code format formatted as <code>WAY-XXXX</code> (e.g. <code>WAY-7824</code>) backed by an in-memory WebSocket topic:
      </p>
      <ul class="feature-points">
        <li><strong>Prominent High-Contrast Code:</strong> Giant <code>WAY-7824</code> badge clearly readable from 3 meters away across parked motorcycles.</li>
        <li><strong>High-Resolution Vector QR Code:</strong> Friends open their app camera and join the room instantly without typing a single character.</li>
        <li><strong>Native App Share Sheet:</strong> One-tap Share button triggers Android's system share intent to send direct join links via WhatsApp, Telegram, or SMS.</li>
        <li><strong>Clipboard Copy Action:</strong> Quick copy button for posting to travel forums or chat channels.</li>
        <li><strong>Pre-Join Inspection (<code>lookupTrip</code>):</strong> Peeks into the channel before full subscription, displaying trip name, destination, and current rider count so joining users confirm legitimacy.</li>
      </ul>
      <div class="callout" style="margin-top: 10px;">
        <div class="callout-title">Ephemeral Security & Privacy</div>
        <div style="font-size: 8pt; color: #475569;">
          Trip codes exist exclusively for the duration of the journey. Once the trip leader taps "End Trip", the WebSocket channel disconnects, all location broadcasts cease immediately, and no residual location trails remain on external servers.
        </div>
      </div>
    </div>
  </div>

  <!-- ==================== CONVOY HEALTH ENGINE ==================== -->
  <div class="page-break"></div>

  <h2><span class="section-num">04</span> Convoy Health Engine & Group Heuristics</h2>

  <p>
    WayTogether replaces manual group check-ins with an intelligent mathematical spatial evaluation engine running client-side (<a href="#TripContext"><code>TripContext.jsx</code></a>).
  </p>

  <div class="feature-showcase-row">
    <div>
      <div class="mockup-frame">
        <img src="${images.health}" alt="Convoy Health Sheet">
      </div>
    </div>
    <div class="feature-content">
      <h3>Algorithmic Convoy Clustering</h3>
      <p style="font-size: 8.5pt;">
        Every incoming GPS coordinate fix is evaluated against the convoy's spatial cluster using the Haversine spherical formula and orthogonal route snapping:
      </p>
      <table style="margin: 8px 0;">
        <thead>
          <tr>
            <th>Status</th>
            <th>Condition</th>
            <th>Visual & Audio Feedback</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><span class="badge badge-green">OK</span> <strong>Together</strong></td>
            <td>All riders separated by ≤ 800m (or in groups ≥ 4, max 1 within 1.5km)</td>
            <td>Green pill: <em>"Everyone together"</em></td>
          </tr>
          <tr>
            <td><span class="badge badge-amber">WARN</span> <strong>Spreading</strong></td>
            <td>Any rider drifts between 1.5 km and 3.0 km from nearest member</td>
            <td>Amber banner + gentle chime alert</td>
          </tr>
          <tr>
            <td><span class="badge badge-red">DANGER</span> <strong>Split</strong></td>
            <td>Any rider falls &gt; 3.0 km behind the convoy</td>
            <td>High-priority red alert toast</td>
          </tr>
        </tbody>
      </table>
      <p style="font-size: 8.5pt;">
        <strong>Linear Convoy Strip:</strong> The bottom sheet projects all members onto a 1-dimensional route line, showing front-runners, the designated Sweep, and lagging riders with meter-precise gap indicators.
      </p>
    </div>
  </div>

  <div class="feature-showcase-row">
    <div>
      <div class="mockup-frame">
        <img src="${images.telemetry}" alt="Rider Telemetry Detail">
      </div>
    </div>
    <div class="feature-content">
      <h3>Individual Rider Telemetry & Direct Intercept</h3>
      <p style="font-size: 8.5pt;">
        Tapping any rider on the map or roster pulls up deep real-time diagnostic telemetry:
      </p>
      <ul class="feature-points">
        <li><strong>Tri-Metric Real-Time Readout:</strong> Distance from user (e.g. <code>460 m</code>), current speed (<code>62 km/h</code>), and phone battery level (<code>88%</code>).</li>
        <li><strong>Activity Status:</strong> Shows whether the friend is actively riding, stopped for fuel, having breakfast, or resting.</li>
        <li><strong>Direct Intercept Navigation:</strong> One-tap "Navigate in Google Maps" button opens driving directions straight to their current GPS coordinate.</li>
        <li><strong>Quick Ping:</strong> Sends an instant gentle vibration ping to their handlebars.</li>
      </ul>
    </div>
  </div>

  <!-- ==================== AUTOMATED SAFETY MATRIX ==================== -->
  <div class="page-break"></div>

  <h2><span class="section-num">05</span> Automated Safety & Anomaly Detection</h2>

  <p>
    The safety engine actively monitors individual telemetry streams to detect mechanical breakdowns, navigational mistakes, and dropped riders.
  </p>

  <div class="feature-showcase-row">
    <div>
      <div class="mockup-frame">
        <img src="${images.menu}" alt="Trip Options & Anomaly Detection">
      </div>
    </div>
    <div class="feature-content">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <h3>Dynamic Routing & Off-Route Detection</h3>
        <span class="badge badge-amber">Leader & Safety</span>
      </div>
      <div class="feature-tagline">"Proactive notifications the moment a rider takes a wrong highway fork."</div>
      <p style="font-size: 8.5pt;">
        Highway journeys are fluid. Leaders need to adjust plans, and the system must alert when a convoy member takes an accidental bypass:
      </p>
      <ul class="feature-points">
        <li><strong>Off-Route Anomaly Alert:</strong> Proactive notification banner (<em>"Vikram Das may have taken a different route — 390 m away"</em>) with a direct "View" camera snap button.</li>
        <li><strong>Mid-Trip Destination Change:</strong> Leader updates destination on the fly; all member phones recalculate routes instantly.</li>
        <li><strong>Regroup Meeting Pins:</strong> Drop a shared pin at a gas station or viewpoint visible to the entire group.</li>
        <li><strong>External Turn-by-Turn Handoff:</strong> One-tap deep link launches Google Maps turn-by-turn navigation directly to destination.</li>
      </ul>
    </div>
  </div>

  <h3>Comprehensive Anomaly Detection Matrix</h3>
  <table>
    <thead>
      <tr>
        <th>Trigger</th>
        <th>Threshold / Condition</th>
        <th>System Action</th>
        <th>Severity</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Not Moving (Still)</strong></td>
        <td>Rider moves &lt; 40m for &gt; 5 min without declaring stop</td>
        <td>Alerts group: <em>"Arjun hasn't moved for 5 min"</em>. Prompts check-in.</td>
        <td><span class="badge badge-amber">Warning</span></td>
      </tr>
      <tr>
        <td><strong>"Are You OK?" Check-In</strong></td>
        <td>Convoy member taps "Ask if OK"</td>
        <td>Dispatches priority dialog to stopped rider with 2-minute countdown.</td>
        <td><span class="badge badge-amber">Urgent</span></td>
      </tr>
      <tr>
        <td><strong>Check-In Timeout</strong></td>
        <td>Rider fails to answer within 120 seconds</td>
        <td>Auto-triggers SOS on their behalf; alerts all riders to navigate immediately.</td>
        <td><span class="badge badge-red">Emergency</span></td>
      </tr>
      <tr>
        <td><strong>Off-Route Deviation</strong></td>
        <td>Rider drifts &gt; 300m perpendicular to OSRM route</td>
        <td>Toasts group: <em>"Rider took a different route (390 m away)"</em>.</td>
        <td><span class="badge badge-amber">Warning</span></td>
      </tr>
      <tr>
        <td><strong>Low Battery Alert</strong></td>
        <td>Device battery level drops &lt; 15%</td>
        <td>Broadcasts low battery warning so convoy knows location may freeze.</td>
        <td><span class="badge badge-slate">Info</span></td>
      </tr>
      <tr>
        <td><strong>Auto-Resumption</strong></td>
        <td>Rider moves &gt; 500m from a declared stop</td>
        <td>Automatically switches user status from Fuel/Food back to <code>riding</code>.</td>
        <td><span class="badge badge-green">Success</span></td>
      </tr>
    </tbody>
  </table>

  <!-- ==================== EMERGENCY SOS SYSTEM ==================== -->
  <div class="page-break"></div>

  <h2><span class="section-num">06</span> Safety & Emergency SOS System</h2>

  <p>
    Safety is non-negotiable on long highway rides. WayTogether integrates an industrial-grade emergency response mechanism engineered to operate under high-stress conditions.
  </p>

  <div class="feature-showcase-row">
    <div>
      <div class="mockup-frame">
        <img src="${images.sos}" alt="Emergency SOS Screen">
      </div>
    </div>
    <div class="feature-content">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <h3>Deliberate 3-Second Hold Activation</h3>
        <span class="badge badge-red">Life Safety</span>
      </div>
      <div class="feature-tagline">"Prevents false triggers while enabling immediate emergency broadcasting."</div>
      <p style="font-size: 8.5pt;">
        Bumps and accidental screen touches in pockets must never fire emergency alarms. The SOS trigger requires a sustained <strong>3-second continuous hold</strong>:
      </p>
      <ul class="feature-points">
        <li><strong>Continuous Haptic Feedback:</strong> Phone vibrates with increasing intensity during the 3-second hold.</li>
        <li><strong>Animated SVG Progress Ring:</strong> Circular timer gives tactile and visual confirmation of arming.</li>
        <li><strong>Full-Screen High-Contrast Red Interface:</strong> Screen switches to high-visibility crimson (<code>#B3121F</code>) with elapsed emergency duration timer.</li>
        <li><strong>Synthesized Dual-Tone Siren:</strong> Browser Web AudioContext generates continuous <code>980 Hz / 660 Hz</code> square-wave siren audio without relying on external MP3 downloads.</li>
        <li><strong>Immediate Convoy Handoff:</strong> Every member receives an urgent notification. Tapping it opens direct turn-by-turn routing to the distressed rider's exact latitude/longitude coordinates.</li>
        <li><strong>One-Tap Emergency Services Dial:</strong> Quick button to instantly dial national emergency dispatch (<code>112</code>).</li>
      </ul>
    </div>
  </div>

  <div class="callout callout-danger avoid-break">
    <div class="callout-title">Automated Check-In Escalation Chain</div>
    <div style="font-size: 8.5pt;">
      If a motorcycle rider slides off the road into a ditch and is incapacitated, they cannot press the SOS button. WayTogether's automated check-in engine detects the absence of movement (&gt; 5 min), sends an <em>"Are You OK?"</em> push prompt with a 120-second audible countdown, and if unacknowledged, <strong>automatically fires the SOS broadcast on the rider's behalf</strong>, locking their coordinates and routing the group back to help.
    </div>
  </div>

  <!-- ==================== COMMUNICATION & MEDIA KEYS ==================== -->
  <div class="page-break"></div>

  <h2><span class="section-num">07</span> In-Ride Communication, Status & Hardware Controls</h2>

  <p>
    Operating a touchscreen while wearing riding gloves or driving is dangerous. WayTogether provides tactile, distraction-free coordination channels.
  </p>

  <!-- Chat & Status -->
  <div class="columns-2 avoid-break">
    <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px;">
      <div style="display:flex; gap: 12px; align-items: center; margin-bottom: 8px;">
        <div style="width: 90px;">
          <div class="mockup-frame">
            <img src="${images.chat}" alt="Convoy Chat">
          </div>
        </div>
        <div>
          <h4 style="margin: 0;">In-Convoy Chat</h4>
          <span class="badge badge-blue">Glove-Friendly</span>
          <p style="font-size: 7.5pt; margin-top: 4px; color: #64748b;">
            Ephemeral chat stored locally (up to 150 messages) without permanent servers.
          </p>
        </div>
      </div>
      <p style="font-size: 7.5pt; color: #334155; margin-bottom: 4px;">
        <strong>8 Quick Chips:</strong>
      </p>
      <div style="display:flex; flex-wrap: wrap; gap: 4px;">
        <span class="badge badge-slate">On my way</span>
        <span class="badge badge-slate">Slow down</span>
        <span class="badge badge-slate">Wait for me</span>
        <span class="badge badge-slate">Stopping soon</span>
        <span class="badge badge-slate">All good</span>
        <span class="badge badge-slate">Where are you?</span>
        <span class="badge badge-slate">Take next exit</span>
        <span class="badge badge-slate">Let's regroup</span>
      </div>
    </div>

    <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px;">
      <div style="display:flex; gap: 12px; align-items: center; margin-bottom: 8px;">
        <div style="width: 90px;">
          <div class="mockup-frame">
            <img src="${images.status}" alt="Status Picker">
          </div>
        </div>
        <div>
          <h4 style="margin: 0;">One-Tap Status Picker</h4>
          <span class="badge badge-purple">Broadcast</span>
          <p style="font-size: 7.5pt; margin-top: 4px; color: #64748b;">
            Instant broadcast of rider condition with visual map markers.
          </p>
        </div>
      </div>
      <p style="font-size: 7.5pt; color: #334155; margin-bottom: 4px;">
        <strong>8 Distinct High-Contrast States:</strong>
      </p>
      <ul style="font-size: 7.5pt; padding-left: 14px; margin: 0; color: #334155;">
        <li><code>Fuel Stop</code> (Orange badge & gas icon)</li>
        <li><code>Problem</code> (Amber warning with motorcycle icon)</li>
        <li><code>Food Stop</code> (Yellow fork/knife)</li>
        <li><code>Rest Break</code> (Teal coffee mug icon)</li>
        <li><code>Accident</code> (Red flashing alert icon)</li>
        <li><code>Regroup</code> (Indigo flag icon)</li>
      </ul>
    </div>
  </div>

  <!-- Music Controller -->
  <div class="feature-showcase-row" style="margin-top: 14px;">
    <div>
      <div class="mockup-frame">
        <img src="${images.music}" alt="Hardware Media Controls">
      </div>
    </div>
    <div class="feature-content">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <h3>Hardware Media Keys & Shared Spotify Playlist</h3>
        <span class="badge badge-blue">Native Android</span>
      </div>
      <div class="feature-tagline">"Control music via handlebar remotes and sync group road playlists."</div>
      <p style="font-size: 8.5pt;">
        Long distance touring requires great soundtracks. WayTogether connects directly to the phone's native media framework:
      </p>
      <ul class="feature-points">
        <li><strong>Native Android Media Bridge:</strong> Custom <code>MediaControlPlugin.java</code> dispatches hardware <code>KeyEvent</code> actions directly into Android's <code>AudioManager</code>.</li>
        <li><strong>Background Player Independence:</strong> Works seamlessly whether the rider is playing Spotify, YouTube Music, Apple Music, or local MP3 files.</li>
        <li><strong>Handlebar Bluetooth Remotes:</strong> Riders with Bluetooth handlebar buttons can trigger Play/Pause, Next Track, and Volume Adjust without leaving the navigation screen.</li>
        <li><strong>Synchronized Road Playlist:</strong> Leaders can paste any Spotify collaborative playlist link; all members get a synchronized one-tap launch shortcut.</li>
      </ul>
    </div>
  </div>

  <!-- ==================== ONBOARDING & SETUP ==================== -->
  <div class="page-break"></div>

  <h2><span class="section-num">08</span> Onboarding, Home Dashboard & Route Setup</h2>

  <p>
    WayTogether streamlines the pre-ride sequence so convoys hit the highway without bureaucratic delays.
  </p>

  <div class="gallery-grid avoid-break">
    <!-- Screen 1 -->
    <div class="gallery-card">
      <div class="gallery-frame">
        <img src="${images.onboarding}" alt="Onboarding Welcome">
      </div>
      <div class="gallery-title">1. Welcome & Onboarding</div>
      <div class="gallery-sub">Google One-Tap sign-in or quick guest nickname setup. Zero friction.</div>
    </div>

    <!-- Screen 2 -->
    <div class="gallery-card">
      <div class="gallery-frame">
        <img src="${images.home}" alt="Home Dashboard">
      </div>
      <div class="gallery-title">2. Home Dashboard</div>
      <div class="gallery-sub">Quick trip launcher, recent trip history, and "Where to?" search pill.</div>
    </div>

    <!-- Screen 3 -->
    <div class="gallery-card">
      <div class="gallery-frame">
        <img src="${images.route}" alt="Route Preview & Create">
      </div>
      <div class="gallery-title">3. Route & Convoy Setup</div>
      <div class="gallery-sub">OSRM driving route preview, ETA, distance, and Bike/Car convoy mode selector.</div>
    </div>
  </div>

  <div class="columns-2 avoid-break" style="margin-top: 14px;">
    <div>
      <h4>Instant Identity Setup</h4>
      <p style="font-size: 8.5pt;">
        Users can authenticate in one tap with Google (via <code>@capgo/capacitor-social-login</code>) or simply enter a nickname. DiceBear Notionists generates an instant, deterministic SVG avatar that syncs across all convoy phones.
      </p>
    </div>
    <div>
      <h4>Route Previews & Convoy Profiles</h4>
      <p style="font-size: 8.5pt;">
        Powered by Komoot Photon (OSM) search and Project OSRM driving calculations. Leaders select convoy type (<strong>Bike</strong>, <strong>Car</strong>, or <strong>Mixed</strong>) to calibrate speed limits and proximity calculations accordingly.
      </p>
    </div>
  </div>

  <!-- ==================== POST-TRIP ANALYTICS ==================== -->
  <div class="page-break"></div>

  <h2><span class="section-num">09</span> Post-Trip Summary & Telemetry Analytics</h2>

  <p>
    When the leader terminates a ride, all participants receive an interactive post-trip analytics dashboard celebrating their achievements.
  </p>

  <div class="feature-showcase-row">
    <div>
      <div class="mockup-frame">
        <img src="${images.summary}" alt="Post-Trip Summary Analytics">
      </div>
    </div>
    <div class="feature-content">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <h3>Trip Milestone Recap & Logs</h3>
        <span class="badge badge-green">Milestone Recap</span>
      </div>
      <div class="feature-tagline">"Celebrate the ride with comprehensive telemetry stats and rider logs."</div>
      <p style="font-size: 8.5pt;">
        Every ride logs key telemetry metrics locally in device storage:
      </p>
      <ul class="feature-points">
        <li><strong>Distance Ridden:</strong> Precise odometer tally (e.g. <code>84 km</code> you rode).</li>
        <li><strong>Saddle Time:</strong> Total active highway duration (e.g. <code>4h 0m on the road</code>).</li>
        <li><strong>Speed Telemetry:</strong> Safe top-speed record (e.g. <code>82 km/h top speed</code>).</li>
        <li><strong>Convoy Roster Log:</strong> Complete list of participants who completed the ride.</li>
        <li><strong>Event Counters:</strong> Total safety alerts, regroupings, and chat messages exchanged during the journey.</li>
        <li><strong>Local Persistence:</strong> Automatically saved in device history (up to last 30 trips) for offline bragging rights.</li>
      </ul>
    </div>
  </div>

  <!-- ==================== SYSTEM ARCHITECTURE ==================== -->
  <div class="page-break"></div>

  <h2><span class="section-num">10</span> High-Level Architecture & Tech Matrix</h2>

  <p>
    WayTogether is built on a modern, decoupled client-first stack combining Web Standards with Native Android integrations.
  </p>

  <pre><code>+-----------------------------------------------------------------------------------+
|                                  USER INTERFACE                                   |
|   React 19  |  Tailwind CSS v4  |  Lucide Icons  |  DiceBear Notionists Avatars   |
+-----------------------------------------------------------------------------------+
|                                CORE ENGINE & STATE                                |
|   TripContext (Telemetry, Convoy Health, Geofencing, Auto-Resumption, SOS Engine) |
+-----------------------------------------------------------------------------------+
|               SERVICES & LIBS              |              NATIVE BRIDGES          |
|  - Realtime: Supabase (Worker Heartbeats)  |  - Background Geolocation Service    |
|  - Geocoding: Komoot Photon (OSM)          |  - TripAlertsPlugin (Native Java)    |
|  - Routing: Project OSRM                   |  - MediaControlPlugin (Native Java)  |
|  - Renderer: MapLibre GL (Vector/Raster)   |  - SocialLogin (Google One-Tap)      |
|  - Audio: Web AudioContext Synthesizer     |  - Capgo Updater (OTA GitHub Releases)|
+-----------------------------------------------------------------------------------+</code></pre>

  <h3>Complete Technology Matrix</h3>
  <table>
    <thead>
      <tr>
        <th>Layer</th>
        <th>Technology</th>
        <th>Version</th>
        <th>Purpose & Technical Rationale</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Frontend Framework</strong></td>
        <td>React</td>
        <td><code>^19.3.0</code></td>
        <td>Concurrent rendering, modern hooks, zero-latency reactive state.</td>
      </tr>
      <tr>
        <td><strong>Build Tooling</strong></td>
        <td>Vite</td>
        <td><code>^8.3.3</code></td>
        <td>Lightning-fast ES-module bundling, instant HMR, minimal bundle footprint.</td>
      </tr>
      <tr>
        <td><strong>CSS Framework</strong></td>
        <td>Tailwind CSS</td>
        <td><code>^4.3.3</code></td>
        <td>Utility-first styles with full safe-area insets for notched mobile displays.</td>
      </tr>
      <tr>
        <td><strong>Map Rendering</strong></td>
        <td>MapLibre GL</td>
        <td><code>^6.13.0</code></td>
        <td>GPU-accelerated vector rendering with 3D camera pitch and custom markers.</td>
      </tr>
      <tr>
        <td><strong>Map Tiles</strong></td>
        <td>OpenFreeMap & Esri</td>
        <td>Free / Open</td>
        <td>Vector tiles (Liberty/Dark) & Satellite raster imagery with no API keys.</td>
      </tr>
      <tr>
        <td><strong>Routing Engine</strong></td>
        <td>Project OSRM</td>
        <td>Public API</td>
        <td>Turn-by-turn routing with speed, geometry, distance, and duration.</td>
      </tr>
      <tr>
        <td><strong>Geocoding & Search</strong></td>
        <td>Komoot Photon</td>
        <td>Public API</td>
        <td>OpenStreetMap-based forward search and reverse geocoding.</td>
      </tr>
      <tr>
        <td><strong>Realtime Messaging</strong></td>
        <td>Supabase JS</td>
        <td><code>^2.117.3</code></td>
        <td>Web Worker-backed WebSocket connection for Broadcast & Presence.</td>
      </tr>
      <tr>
        <td><strong>Native Runtime</strong></td>
        <td>Capacitor</td>
        <td><code>^8.5.3</code></td>
        <td>Modern, lightweight web-to-native Android runtime bridge.</td>
      </tr>
      <tr>
        <td><strong>Background GPS</strong></td>
        <td>Capacitor Geolocation</td>
        <td><code>^1.2.26</code></td>
        <td>Persistent Android foreground service tracking locked phones.</td>
      </tr>
      <tr>
        <td><strong>Keep Awake</strong></td>
        <td>Capacitor KeepAwake</td>
        <td><code>^8.0.1</code></td>
        <td>Prevents screen sleep while phone is mounted on motorcycle handlebars.</td>
      </tr>
      <tr>
        <td><strong>Social Auth</strong></td>
        <td>Capgo Social Login</td>
        <td><code>^8.5.12</code></td>
        <td>Native Google Identity sign-in with Web Client ID.</td>
      </tr>
      <tr>
        <td><strong>OTA Updates</strong></td>
        <td>Capgo Updater</td>
        <td><code>^8.52.1</code></td>
        <td>Instant GitHub Releases Over-the-Air bundle updater.</td>
      </tr>
    </tbody>
  </table>

  <!-- ==================== REALTIME PROTOCOL & SCHEMAS ==================== -->
  <div class="page-break"></div>

  <h2><span class="section-num">11</span> Real-Time Protocol & Telemetry Schemas</h2>

  <p>
    WayTogether operates with a <strong>Zero-Database Ephemeral Design</strong>. Trip state lives exclusively in memory across participating devices via Supabase Realtime Channels:
  </p>
  <pre><code>Channel Name: waytogether-trip-{TRIP_CODE} (e.g. waytogether-trip-WAY-7824)</code></pre>

  <div class="columns-2 avoid-break">
    <div>
      <h4>1. Broadcast Channel (High Frequency)</h4>
      <p style="font-size: 8pt; color: #475569;">
        Transmits GPS fixes every ~3 seconds, instant status broadcasts, chat chips, and emergency SOS packets. No database read/write bottlenecks.
      </p>
    </div>
    <div>
      <h4>2. Presence Channel (State Sync)</h4>
      <p style="font-size: 8pt; color: #475569;">
        Maintains active participant rosters and stores latest trip metadata (revision counter, destination, leader identity) for newly joining riders.
      </p>
    </div>
  </div>

  <h3>Location Packet Schema (<code>event: 'loc'</code>)</h3>
  <pre><code>{
  "id": "usr_9b1deb4d3b7d4",
  "name": "Priya Nair",
  "photo": "https://api.dicebear.com/9.x/notionists/svg?seed=Priya",
  "role": "leader",
  "lat": 12.825120,
  "lng": 80.241510,
  "acc": 6,
  "speed": 68,
  "heading": 175,
  "battery": 92,
  "status": "riding",
  "updatedAt": 1775626800000,
  "trip": {
    "code": "WAY-7824",
    "name": "Mahabalipuram Shore Temple Ride",
    "type": "Bike",
    "rev": 1,
    "dest": {
      "name": "Mahabalipuram Shore Temple",
      "latlng": [12.6166, 80.1994]
    }
  }
}</code></pre>

  <h3>Event Packet Schema (<code>event: 'evt'</code>)</h3>
  <pre><code>// 1. Group Chat Message
{ "type": "msg", "msg": { "id": "m1", "from": "usr_1", "name": "Priya", "text": "Fuel stop in 2 km", "at": 1775626815000 } }

// 2. Check-In Prompt & Reply
{ "type": "checkin", "id": "chk_01", "to": "usr_2", "from": "usr_1", "fromName": "Priya" }
{ "type": "checkin-reply", "id": "chk_01", "from": "usr_2", "fromName": "Arjun", "answer": "stop", "label": "Fuel stop" }

// 3. Regroup Point Broadcast
{ "type": "regroup", "latlng": [12.7541, 80.2215], "label": "Coffee Day Highway Regroup" }

// 4. Trip Termination (Leader Only)
{ "type": "end", "by": "usr_1", "byName": "Priya Nair" }</code></pre>

  <!-- ==================== NATIVE ANDROID SUBSYSTEM ==================== -->
  <div class="page-break"></div>

  <h2><span class="section-num">12</span> Native Android Subsystem & Background Location</h2>

  <p>
    To guarantee continuous tracking when phones are locked inside motorcycle jackets, WayTogether integrates deep Android OS services via Capacitor.
  </p>

  <div class="feature-showcase-row">
    <div>
      <div class="mockup-frame">
        <img src="${images.map2d}" alt="Convoy 2D Overview">
      </div>
    </div>
    <div class="feature-content">
      <h3>Foreground Location Service</h3>
      <p style="font-size: 8.5pt;">
        Android terminates normal background background apps after minutes to save battery. WayTogether launches an official <strong>Android Foreground Service</strong> (<a href="#Capacitor"><code>@capacitor-community/background-geolocation</code></a>):
      </p>
      <ul class="feature-points">
        <li><strong>Persistent Status Bar Notification:</strong> Displays <em>"Sharing your live location · Your convoy can see where you are"</em> with zero dismissal risk.</li>
        <li><strong>5-Meter Distance Filter:</strong> Batches coordinate fixes dynamically to balance meter-accuracy with multi-hour battery longevity.</li>
        <li><strong>Web Worker WebSocket Heartbeats:</strong> Supabase client is initialized with <code>{ realtime: { worker: true } }</code> so WebSocket pings execute uninterrupted in a dedicated thread.</li>
      </ul>
    </div>
  </div>

  <h3>Custom Native Android Plugins</h3>
  <table>
    <thead>
      <tr>
        <th>Native Plugin</th>
        <th>Source Location</th>
        <th>Responsibilities & Implementation Details</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><code>TripAlertsPlugin.java</code></td>
        <td><code>android/app/.../TripAlertsPlugin.java</code></td>
        <td>
          Direct <code>NotificationManagerCompat</code> wrapper bypassing Android 14+ exact alarm blocks.<br>
          • <strong>urgent channel:</strong> High importance, alarm category, custom vibration pattern <code>[0, 400, 200, 400, 200, 800]</code>.<br>
          • <strong>trip channel:</strong> High importance, message category for off-route alerts.<br>
          • <strong>chat channel:</strong> Default importance for group chat notifications.
        </td>
      </tr>
      <tr>
        <td><code>MediaControlPlugin.java</code></td>
        <td><code>android/app/.../MediaControlPlugin.java</code></td>
        <td>
          Accesses Android <code>AudioManager</code> to dispatch native <code>KeyEvent</code> actions (<code>KEYCODE_MEDIA_PLAY_PAUSE</code>, <code>KEYCODE_MEDIA_NEXT</code>, <code>KEYCODE_MEDIA_PREVIOUS</code>) into active background media players.
        </td>
      </tr>
    </tbody>
  </table>

  <!-- ==================== PERSISTENT STORAGE CONTRACTS ==================== -->
  <div class="page-break"></div>

  <h2><span class="section-num">13</span> Persistent Storage Contracts & State Lifecycle</h2>

  <p>
    All client-side state is strictly namespaced under <code>convoya.*</code> to ensure modular cleanup and conflict avoidance:
  </p>

  <table>
    <thead>
      <tr>
        <th>Storage Key</th>
        <th>Format</th>
        <th>Retention</th>
        <th>Purpose & State Schema</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><code>convoya.profile</code></td>
        <td>JSON Object</td>
        <td>Permanent</td>
        <td>User identity: <code>{ id, name, photo, email, google: true }</code>.</td>
      </tr>
      <tr>
        <td><code>convoya.trip</code></td>
        <td>JSON Object</td>
        <td>Active Trip</td>
        <td>Active trip state: <code>{ code, role, meta, status, stats }</code>. Allows resumption if app restarts.</td>
      </tr>
      <tr>
        <td><code>convoya.chat.&lt;CODE&gt;</code></td>
        <td>JSON Array</td>
        <td>Active Trip</td>
        <td>Local message history up to 150 items: <code>[{ id, from, name, text, at }]</code>.</td>
      </tr>
      <tr>
        <td><code>convoya.history</code></td>
        <td>JSON Array</td>
        <td>Permanent</td>
        <td>Last 30 completed trip summaries with distance, duration, top speed, and rider lists.</td>
      </tr>
      <tr>
        <td><code>convoya.settings</code></td>
        <td>JSON Object</td>
        <td>Permanent</td>
        <td>Preferences: <code>{ mapStyle: 'default'|'night'|'satellite', sounds: true, keepAwake: true }</code>.</td>
      </tr>
      <tr>
        <td><code>convoya.update</code></td>
        <td>JSON Object</td>
        <td>Ephemeral</td>
        <td>Metadata for pending Over-The-Air bundle: <code>{ build, bundleId }</code>.</td>
      </tr>
    </tbody>
  </table>

  <h3>Crash Resumption Protocol</h3>
  <p style="font-size: 8.5pt;">
    If a rider's phone restarts, experiences an Android OS kill, or the battery dies and recharges, WayTogether performs an automatic zero-click session restore:
  </p>
  <ul style="font-size: 8.5pt; color: #334155; padding-left: 20px;">
    <li>Inspects <code>convoya.trip</code> on boot. If an active trip exists, immediately bypasses Home and reconnects to <code>waytogether-trip-{CODE}</code>.</li>
    <li>Restarts the Background Geolocation foreground service without prompting the user.</li>
    <li>Broadcasts a re-announcement <code>loc</code> packet so other riders see the user reappear online without missing a beat.</li>
  </ul>

  <!-- ==================== BUILD & OTA RELEASES ==================== -->
  <div class="page-break"></div>

  <h2><span class="section-num">14</span> Build, Deployment & OTA Update Architecture</h2>

  <p>
    WayTogether features a dual-tier release pipeline separating agile frontend updates from native APK releases.
  </p>

  <div class="columns-2 avoid-break">
    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px;">
      <h4 style="margin: 0 0 6px 0; color: #2563eb;">1. Web Bundle OTA Updates</h4>
      <p style="font-size: 8pt; color: #475569;">
        UI features, map styles, and logic changes deploy Over-the-Air without requiring users to reinstall the APK:
      </p>
      <pre><code># 1. Push code to main branch
git push origin main

# 2. GitHub Actions runs publish-update.yml:
# - Builds Vite production bundle
# - Computes SHA-256 hash
# - Generates update.json manifest
# - Creates GitHub Release with bundle.zip</code></pre>
      <p style="font-size: 7.5pt; color: #64748b;">
        App polls manifest every 5 minutes in background and prompts restart on Home screen.
      </p>
    </div>

    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px;">
      <h4 style="margin: 0 0 6px 0; color: #059669;">2. Native APK Build (Android Studio)</h4>
      <p style="font-size: 8pt; color: #475569;">
        Required only when adding new native Capacitor plugins, permissions, or Java code:
      </p>
      <pre><code># 1. Build Vite web bundle
npm run build

# 2. Sync to Android project
npx cap sync android

# 3. Compile APK with JDK 21
cd android
JAVA_HOME=/path/to/jdk-21 ./gradlew assembleDebug

# Output: android/app/build/outputs/apk/debug/app-debug.apk</code></pre>
    </div>
  </div>

  <h3>Local Convoy Multi-Rider Testing</h3>
  <p style="font-size: 8.5pt;">
    Developers can simulate an entire 4-rider convoy on a single development machine without real GPS movement:
  </p>
  <pre><code># Leader:
http://localhost:5173/?mock=12.9830,80.2594&heading=180&speed=45&local=1

# Member 1 (Trailing by 500m):
http://127.0.0.1:5173/?mock=12.9875,80.2590&heading=180&speed=42&local=1

# Member 2 (Off-Route Simulation):
http://localhost:5173/?mock=12.9840,80.2650&heading=140&speed=35&local=1

# Rapid Anomaly Testing Overrides:
?stillMin=0.5     # Accelerates "Not Moving" alert from 5 min to 30 sec
?checkinSec=20    # Accelerates "Are You OK?" timeout from 120s to 20s</code></pre>

  <!-- ==================== PROMO SUITE GALLERY 1 ==================== -->
  <div class="page-break"></div>

  <h2><span class="section-num">15</span> Complete 14-Screen Promotional Showcase (1/3)</h2>

  <p>
    All screenshots are rendered at <strong>1236 × 2676 px</strong> (3× Retina mobile density) and preserved in lossless 24-bit PNG format at <code>TRAVA/promo-screenshots/</code>:
  </p>

  <div class="gallery-grid">
    <div class="gallery-card">
      <div class="gallery-frame"><img src="${images.nav3d}" alt="3D Navigation"></div>
      <div class="gallery-title">04 · 3D Cockpit Navigation</div>
      <div class="gallery-sub">55° heading-up view with live speed badge & distance tags.</div>
    </div>
    <div class="gallery-card">
      <div class="gallery-frame"><img src="${images.invite}" alt="Convoy Invite"></div>
      <div class="gallery-title">12 · Live Share & QR Code</div>
      <div class="gallery-sub">Prominent 7-char code with sharp scannable QR sheet.</div>
    </div>
    <div class="gallery-card">
      <div class="gallery-frame"><img src="${images.menu}" alt="Trip Menu"></div>
      <div class="gallery-title">13 · Route Controls & Anomaly</div>
      <div class="gallery-sub">Off-route toast notification & regroup meeting pins.</div>
    </div>
    <div class="gallery-card">
      <div class="gallery-frame"><img src="${images.map2d}" alt="Overview Map"></div>
      <div class="gallery-title">04b · Convoy 2D Overview</div>
      <div class="gallery-sub">Auto-bounding group frame with smooth marker gliding.</div>
    </div>
    <div class="gallery-card">
      <div class="gallery-frame"><img src="${images.health}" alt="Convoy Health"></div>
      <div class="gallery-title">05 · Convoy Health Sheet</div>
      <div class="gallery-sub">Linear route projection with leader, sweep & pack gaps.</div>
    </div>
    <div class="gallery-card">
      <div class="gallery-frame"><img src="${images.telemetry}" alt="Rider Telemetry"></div>
      <div class="gallery-title">06 · Rider Telemetry Card</div>
      <div class="gallery-sub">Distance, live speed, battery % and direct Google Maps.</div>
    </div>
  </div>

  <!-- ==================== PROMO SUITE GALLERY 2 ==================== -->
  <div class="page-break"></div>

  <h2><span class="section-num">16</span> Complete Promotional Showcase (2/3)</h2>

  <div class="gallery-grid">
    <div class="gallery-card">
      <div class="gallery-frame"><img src="${images.chat}" alt="Convoy Chat"></div>
      <div class="gallery-title">07 · In-Trip Convoy Chat</div>
      <div class="gallery-sub">8 glove-friendly quick-response chips & timestamped messages.</div>
    </div>
    <div class="gallery-card">
      <div class="gallery-frame"><img src="${images.music}" alt="Music Controls"></div>
      <div class="gallery-title">08 · Hardware Media & Playlist</div>
      <div class="gallery-sub">Android media keys & collaborative Spotify trip playlist.</div>
    </div>
    <div class="gallery-card">
      <div class="gallery-frame"><img src="${images.status}" alt="Status Picker"></div>
      <div class="gallery-title">09 · One-Tap Status Picker</div>
      <div class="gallery-sub">Fuel, mechanical problem, food, rest & accident states.</div>
    </div>
    <div class="gallery-card">
      <div class="gallery-frame"><img src="${images.sos}" alt="Emergency SOS"></div>
      <div class="gallery-title">10 · Emergency SOS System</div>
      <div class="gallery-sub">3s hold activation, Web Audio siren & coordinated broadcast.</div>
    </div>
    <div class="gallery-card">
      <div class="gallery-frame"><img src="${images.summary}" alt="Trip Analytics"></div>
      <div class="gallery-title">11 · Post-Trip Analytics</div>
      <div class="gallery-sub">Distance ridden, saddle time, top speed & member log.</div>
    </div>
    <div class="gallery-card">
      <div class="gallery-frame"><img src="${images.onboarding}" alt="Onboarding"></div>
      <div class="gallery-title">01 · Welcome & Onboarding</div>
      <div class="gallery-sub">Clean brand identity with Google One-Tap & guest sign-in.</div>
    </div>
  </div>

  <!-- ==================== PROMO SUITE GALLERY 3 & SPECS ==================== -->
  <div class="page-break"></div>

  <h2><span class="section-num">17</span> Complete Promotional Showcase (3/3) & Specs</h2>

  <div class="gallery-grid" style="grid-template-columns: repeat(2, 1fr); max-width: 500px; margin: 10px auto;">
    <div class="gallery-card">
      <div class="gallery-frame"><img src="${images.home}" alt="Home Dashboard"></div>
      <div class="gallery-title">02 · Home Dashboard</div>
      <div class="gallery-sub">Minimalist search, recent route log, and quick trip launcher.</div>
    </div>
    <div class="gallery-card">
      <div class="gallery-frame"><img src="${images.route}" alt="Route Setup"></div>
      <div class="gallery-title">03 · Route Setup & Vehicle Mode</div>
      <div class="gallery-sub">OSRM driving route preview with bike, car, and mixed presets.</div>
    </div>
  </div>

  <div class="callout avoid-break" style="margin-top: 14px;">
    <div class="callout-title">Asset Specifications & Campaign Applications</div>
    <table style="margin: 8px 0 4px 0;">
      <thead>
        <tr>
          <th>Specification</th>
          <th>Metric / Value</th>
          <th>Recommended Marketing Channel</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>Pixel Dimensions</strong></td>
          <td>1236 × 2676 px</td>
          <td>Google Play Store Feature Carousel & Apple App Store 6.7" Mockups</td>
        </tr>
        <tr>
          <td><strong>Pixel Density</strong></td>
          <td>3× Retina Scale</td>
          <td>High-DPI Investor Pitch Decks & Printed Brochures</td>
        </tr>
        <tr>
          <td><strong>Aspect Ratio</strong></td>
          <td>~9:19.5 (Flagship Mobile)</td>
          <td>Instagram / TikTok Video Reels & Product One-Pagers</td>
        </tr>
        <tr>
          <td><strong>Color Profile</strong></td>
          <td>sRGB (Lossless 24-bit PNG)</td>
          <td>Web Landing Page Hero Sections & Interactive Product Tours</td>
        </tr>
      </tbody>
    </table>
  </div>

</body>
</html>
`;

async function generatePDF() {
  console.log('Writing temporary HTML file...');
  const tempHtmlPath = path.join(BASE_DIR, 'scripts', 'temp_doc_for_pdf.html');
  fs.writeFileSync(tempHtmlPath, htmlContent);

  console.log('Launching Puppeteer Chrome...');
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  console.log('Loading document HTML into headless page...');
  await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

  console.log('Printing high-fidelity PDF with clean headers and footers...');
  await page.pdf({
    path: OUTPUT_PDF_PATH,
    format: 'A4',
    printBackground: true,
    margin: {
      top: '14mm',
      bottom: '14mm',
      left: '12mm',
      right: '12mm'
    },
    displayHeaderFooter: true,
    headerTemplate: `
      <div style="font-size: 7.5pt; color: #94a3b8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; width: 100%; display: flex; justify-content: flex-end; padding: 0 14mm; box-sizing: border-box;">
        <span>WayTogether (TRAVA) — Complete System Specification</span>
      </div>
    `,
    footerTemplate: `
      <div style="font-size: 7.5pt; color: #64748b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; width: 100%; display: flex; justify-content: space-between; align-items: center; padding: 0 14mm; box-sizing: border-box;">
        <span>Confidential · All Rights Reserved</span>
        <span>Page&nbsp;<span class="pageNumber" style="font-weight:700; color:#0f172a;"></span>&nbsp;of&nbsp;<span class="totalPages"></span></span>
      </div>
    `
  });

  await browser.close();
  console.log('PDF generated successfully at:', OUTPUT_PDF_PATH);

  // Copy to Artifact directory
  console.log('Copying PDF to artifact directory:', ARTIFACT_PDF_PATH);
  fs.copyFileSync(OUTPUT_PDF_PATH, ARTIFACT_PDF_PATH);

  // Clean up temp HTML
  if (fs.existsSync(tempHtmlPath)) {
    fs.unlinkSync(tempHtmlPath);
  }

  const stats = fs.statSync(OUTPUT_PDF_PATH);
  console.log(`Final PDF File Size: ${(stats.size / (1024 * 1024)).toFixed(2)} MB`);
}

generatePDF().catch(err => {
  console.error('Error generating PDF:', err);
  process.exit(1);
});
