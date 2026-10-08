# WayTogether

Keep the Journey Together. A live map for groups travelling together. Everyone in a trip shares their real GPS position, and each phone shows every friend, their status and their distance, plus alerts and SOS.

## How it works

- **Live sharing** uses Supabase Realtime only, with no database tables. Each trip is a channel named after its code (`waytogether-trip-WAY-1234`).
  - *Broadcast* carries everyone's position every ~3 s.
  - *Presence* tracks who is in the trip and holds the trip details for people joining. It's updated at most every 12 s, because Supabase rate-limits presence.
- **GPS** comes from `@capacitor/geolocation` on the home screen. During a trip, `@capacitor-community/background-geolocation` runs a foreground service with a notification, so sharing continues with the screen off.
- **Search and routes** use Photon (OpenStreetMap search) and OSRM routing. Both are free and need no key.
- **The map** is MapLibre GL (GPU-rendered, smooth like Google Maps) with OpenFreeMap vector tiles and Esri satellite imagery (free, no key). Light / Night / Satellite styles; 3D heading-up navigation view.
- **Trip features**: change destination mid-trip (leader), regroup pin anyone can drop, group chat with quick messages, music controls (media keys for Spotify or any player) + shared Spotify playlist, trip stats and history, Convoy Health, SOS with siren.
- **Background**: a foreground location service keeps sharing with the screen off; realtime heartbeats run in a Web Worker so the connection survives; trip alerts (SOS, stops, chat) are posted by the app's own `TripAlerts` plugin so they arrive instantly even when the app is in the background.
- **Android-only plugins in this repo**: `android/app/src/main/java/app/convoya/trip/MediaControlPlugin.java` (music keys) and `TripAlertsPlugin.java` (notifications), registered in `MainActivity.java`.

## Configure

Put your Supabase project in `.env.local`:

```
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key>
```

Realtime must be on (it is by default). Without keys, the app falls back to local mode, where browser tabs on the same origin share with each other.

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

## Where things live

- `src/lib/realtime.js`: trip channels, presence + broadcast, auto-reconnect, trip lookup by code.
- `src/lib/location.js`: GPS (foreground, background, mock) and battery.
- `src/lib/places.js`: place search and routing.
- `src/state/TripContext.jsx`: the trip engine. Covers riders, distances, the route match, Convoy Health, alerts (stops, off-route, falling behind, offline, low battery, SOS) and actions.
- `src/screens/HomeScreen.jsx`: Google-Maps-style home, "Where to?" search, route preview, create trip, join by code or QR.
- `src/screens/TripScreen.jsx`: the live trip map, friend cards, status, invite, SOS, regroup pin, change destination, end trip.
- `src/components/MapView.jsx`: MapLibre map, gliding friend markers, route, camera modes (group / follow / 3D nav).
- `src/components/TripMenu.jsx`, `ChatPanel.jsx`, `MusicSheet.jsx`: trip options, group chat, music.

## Google sign-in

Set `VITE_GOOGLE_WEB_CLIENT_ID` in `.env.local` to the **Web application** OAuth client ID (Google Cloud → Google Auth Platform → Clients), then rebuild. Until it's set, the Android app shows name-only sign-in.
