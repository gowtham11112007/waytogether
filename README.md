# WayTogether

Keep the Journey Together. A live map for groups travelling together. Everyone in a trip shares their real GPS position, and each phone shows every friend, their status and their distance, plus alerts and SOS.

## How it works

- **Live sharing** uses Supabase Realtime only, with no database tables. Each trip is a channel named after its code (`waytogether-trip-WAY-1234`).
  - *Broadcast* carries everyone's position every ~3 s.
  - *Presence* tracks who is in the trip and holds the trip details for people joining. It's updated at most every 12 s, because Supabase rate-limits presence.
- **GPS** comes from `@capacitor/geolocation` on the home screen. During a trip, `@capacitor-community/background-geolocation` runs a foreground service with a notification, so sharing continues with the screen off.
- **Search and routes** use Photon (OpenStreetMap search) and OSRM routing. Both are free and need no key.
- **The map** is MapLibre GL (GPU-rendered, smooth like Google Maps) with OpenFreeMap vector tiles, Esri satellite imagery and Mapzen elevation (all free, no key).
  - *Styles*: Default, Night (brighter roads, highways in gold) and Satellite (imagery with road and place names on top).
  - *Places*: petrol, hotels and hospitals (from zoom 13), plus food, pharmacies, doctors, banks, ATMs and car service (from zoom 15) show as coloured badges on every style. Where they'd overlap, some are left out instead of piling up.
  - *Nearby*: chips under the search bar (Petrol, Food, Hotels, Hospitals, ATMs, Pharmacy, Repairs) show only those places and list the nearest ones; tap one, or any badge on the map, for the route.
  - *Stops*: during a trip, tap a place badge to make it the group's next stop (everyone's map and the family live view get a pin with its icon, plus an alert), ask in the chat, or open directions.
- **Trip features**: change destination mid-trip (leader), regroup pin anyone can drop, group chat with quick messages, music controls (media keys for Spotify or any player) + shared Spotify playlist, trip stats and history, Convoy Health, SOS with siren.
- **Invite links**: the invite's Share button and QR code carry `https://<site>/?join=WAY-1234`. Opening it (or scanning the QR with any phone camera) opens WayTogether straight into "Join trip" with the code filled in, even after a detour through Google sign-in. Before handing out a new code, the app checks that nobody is already riding on it.
- **Convoy Health**: "the group" is the biggest cluster of riders within 800 m of each other (ties go to the leader's cluster), so if *you* are the one behind, your phone says so instead of flagging everyone else. Friends who join from somewhere else show as *On the way* until they reach the route or the group, with no off-route or falling-behind alarms before that. Offline riders don't count towards the group. An SOS or unanswered check-in takes over the summary and pins a red banner with a one-tap **Go** (Google Maps directions) until the rider is safe.
- **Leaving**: a rider who taps Leave is removed from everyone's map with a "left the trip" alert, rather than lingering as offline.
- **Live view for family**: `https://<site>/?watch=WAY-1234` (Invite sheet or Trip options → *Live view for family*) opens a view-only map: riders, ETA, distance to go and SOS banners. No sign-in, no location of their own, and riders don't see watchers.
- **Weather** (Open-Meteo, free, no key): conditions and the chance of rain where you are and at the destination (Trip tab and route preview), plus a one-time "Rain likely at …" alert.
- **Spoken alerts** (Trip options → *Speak alerts*, where the phone has text-to-speech voices): reads out SOS, stops and chat messages.
- **Trip summary**: stats count up, your ride is drawn from breadcrumbs recorded every ~30 m (GPS jumps left out), and a finished trip gets confetti. The home screen shows your totals.
- **Motion**: animated welcome scene, a convoy panel you can drag with a finger, sliding tabs, sheets and toasts that animate in and out, markers that pop in. Phones set to *reduce motion* get a still app.
- **Settings** (tap your avatar on Home, or Trip options → *All settings*), saved on the phone:
  - *Profile*: name, a new generated face (or your Google photo), sign out.
  - *Appearance*: light / dark / system theme, map style (Auto follows the theme), places on the map (petrol, hotels, food, hospitals, ATMs), speed bubble.
  - *Units*: kilometres or miles, 12- or 24-hour time (used everywhere: distances, speeds, ETAs, chat times).
  - *Alerts*: sounds and volume, vibration, spoken alerts, chat sounds, and which kinds of alerts pop up (stops, off-route, behind/ahead, low battery, joins and leaves). SOS and other dangers always alert.
  - *Safety*: emergency number, an emergency contact (call or text them your location from the SOS screen), how long to hold SOS, keep screen on.
  - *Privacy*: share your battery level or not. *Trips and chat*: default trip type, your own quick replies. *Data*: clear history, reset settings.
- **Convoy rules** (Trip options → *Convoy rules*, or the Trip tab): the leader sets what counts as together, when someone is behind or off route, when to ask "Are you OK?" and how long before an automatic SOS. Saved in the trip, so every phone uses the same rules; bikes, cars and mixed trips start with sensible defaults.
- **Background**: a foreground location service keeps sharing with the screen off; realtime heartbeats run in a Web Worker so the connection survives; trip alerts (SOS, stops, chat) are posted by the app's own `TripAlerts` plugin so they arrive instantly even when the app is in the background.
- **Android-only plugins in this repo**: `android/app/src/main/java/app/convoya/trip/MediaControlPlugin.java` (music keys) and `TripAlertsPlugin.java` (notifications), registered in `MainActivity.java`.

## Configure

Put your Supabase project in `.env.local`:

```
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key>
```

Realtime must be on (it is by default). Without keys, the app falls back to local mode, where browser tabs on the same origin share with each other.

Optional: `VITE_PUBLIC_URL` is the website that invite links from the Android app point to (default `https://waytogether-azure.vercel.app`). On the web, links use the address the app is open on.

## Run

```bash
npm install
npm run dev
```

To test two "phones" in one browser, open them on different origins so each gets its own profile, and give each a fake GPS position:

- `http://localhost:5173/?mock=12.9830,80.2594&heading=180&speed=36`
- `http://127.0.0.1:5173/?mock=12.9875,80.2590&heading=180&speed=36`

## Build the Android APK

The build needs Java 21 and the Android SDK.

```bash
npm run build
npx cap sync android
cd android && JAVA_HOME=/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home ./gradlew assembleDebug
```

The APK is written to `android/app/build/outputs/apk/debug/app-debug.apk`.

## Website icons and link preview

`public/` holds the favicon, home-screen icons, web manifest and the 1200×630 image shown when an invite link is shared in WhatsApp and similar apps. They're rendered from the app logo and a promo screenshot with the local Chrome:

```bash
node scripts/generate_web_assets.mjs
```

## Where things live

- `src/lib/realtime.js`: trip channels, presence + broadcast, auto-reconnect, trip lookup by code.
- `src/lib/location.js`: GPS (foreground, background, mock) and battery.
- `src/lib/places.js`: place search and routing (requests give up after a timeout instead of hanging on weak signal).
- `src/lib/invite.js`: invite and live-view links, and opening the app from one.
- `src/screens/WatchScreen.jsx`: the view-only family live view.
- `src/lib/weather.js`, `src/components/Weather.jsx`: weather lookups and the weather chip/card.
- `src/lib/speech.js`: spoken alerts.
- `src/screens/SettingsScreen.jsx`, `src/lib/settings.js`: everything customisable, the theme and map-style hooks.
- `src/components/RulesSheet.jsx`, `DEFAULT_RULES` in `src/data/trip.js`: convoy rules.
- `src/index.css`: the dark theme lives in the `[data-theme='dark']` block.
- `src/state/TripContext.jsx`: the trip engine. Covers riders, distances, the route match, Convoy Health, alerts (stops, off-route, falling behind, offline, low battery, SOS) and actions.
- `src/screens/HomeScreen.jsx`: Google-Maps-style home, "Where to?" search, route preview, create trip, join by code or QR.
- `src/screens/TripScreen.jsx`: the live trip map, friend cards, status, invite, SOS, regroup pin, change destination, end trip.
- `src/components/MapView.jsx`: MapLibre map, map styles, place badges and Nearby lists, gliding friend markers, route, camera modes (group / follow / 3D nav).
- `src/components/TripMenu.jsx`, `ChatPanel.jsx`, `MusicSheet.jsx`: trip options, group chat, music.

## Google sign-in

Set `VITE_GOOGLE_WEB_CLIENT_ID` in `.env.local` to the **Web application** OAuth client ID (Google Cloud → Google Auth Platform → Clients), then rebuild. Until it's set, the Android app shows name-only sign-in.

## Updates

- **Web/UI changes (most changes):** push to `main`. The *Publish app update* workflow builds the app and publishes `bundle.zip` + `update.json` as the latest GitHub release. Installed apps check on launch and on resume (every 5 min), download in the background, and show **Update ready → Restart** on the home screen (never during a trip).
- **Native changes** (new Capacitor plugin, Android manifest/Java): bump `native` in `native-version.json`, build the APK and upload it to the release named in `apk`. Apps will show **New app version available → Download**.
- Repo secrets needed by the workflow: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_GOOGLE_WEB_CLIENT_ID`.
