# Express Luck Inventory (React Native)

Offline-first inventory recording app, rewritten with HeroUI Native, React Native, Expo, and Bun.

## Features

- Tabs: **Profile**, **Work**, **Queue**.
- Scan two QR codes (in any order) to establish a recording profile
  - API endpoint QR: `{"apiEndpoint":"<https://...>"}`
  - Recording info QR: `{"orderNo":"1234","recordingNo":1,"locationCode":"FG HU"}`
- Optional bearer token stored locally
- Scan or type package number
- Mark package as intact and adjust quantity when not intact
- Submit payload via HTTP POST
- Offline queue: failed requests are stored and can be synced later
- Full-screen camera scanner route (`/(modal)/scan`)
- Light + dark theme via HeroUI Native + Uniwind

## Tech Stack

- React Native + Expo (SDK 54) + Expo Router 6
- HeroUI Native (latest beta) + Uniwind (Tailwind v4 for RN)
- Bun (toolchain)
- AsyncStorage
- Expo Camera (barcode scanning)
- AsyncStorage Expo config plugin (adds Android local Maven repo)

## Run Locally

```bash
bun install
bun run start
```

Then open on a device/emulator, or run:

```bash
bun run android
```

## Build APK Locally (debug)

```bash
bun run prebuild:android
bun run build:android
```

APK output:

```
android/app/build/outputs/apk/debug/app-debug.apk
```

If the local build fails for environment reasons (missing Android SDK / NDK / `ANDROID_HOME`), the GitHub Actions workflow at `.github/workflows/android-apk.yml` is the fallback.

## Data & Privacy

All data is stored locally on the device using AsyncStorage. No sensitive information is committed to this repository.
