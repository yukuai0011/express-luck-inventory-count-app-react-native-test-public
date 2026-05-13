# Express Luck Inventory (React Native)

Offline-first inventory recording app rebuilt with React Native, Expo, Gluestack UI, and Bun.

## Features

- Scan two QR codes (in any order) to establish a recording profile
  - API endpoint QR: `{"apiEndpoint":"<https://...>"}`
  - Recording info QR: `{"orderNo":"1234","recordingNo":1,"locationCode":"FG HU"}`
- Optional bearer token stored locally
- Scan or type package number
- Mark package as intact and adjust quantity when not intact
- Submit payload via HTTP POST
- Offline queue: failed requests are stored and can be synced later

## Tech Stack

- React Native + Expo
- Gluestack UI
- Bun
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
bun run ios
bun run web
```

## Build Web Locally

```bash
bun run build:web
```

The build exports the Expo web app to `dist/` and adds PWA files (`manifest.webmanifest`, `sw.js`, `.nojekyll`, and app icons).

## Build APK Locally (debug)

```bash
bunx expo prebuild --platform android --non-interactive
cd android
./gradlew assembleDebug
```

APK output:

```
android/app/build/outputs/apk/debug/app-debug.apk
```

## GitHub Actions

Workflows:

- `.github/workflows/github-pages.yml`
  - Runs on `push` and `workflow_dispatch`
  - Installs dependencies with Bun
  - Builds the Expo web app and deploys `dist/` to GitHub Pages
  - Uses `/${repo}` as the Pages base path by default; set repository variable `EXPO_BASE_URL` to override it, for example `/` for a custom root domain
- `.github/workflows/android-apk.yml`
  - Runs on `push` and `pull_request`
  - Prebuilds Android and builds a debug APK
  - Uploads `app-debug.apk` as a CI artifact

## Data & Privacy

All data is stored locally on the device using AsyncStorage. No sensitive information is committed to this repository.
