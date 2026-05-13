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

Workflow: `.github/workflows/android-apk.yml`

- Runs on `push` and `pull_request`
- Prebuilds Android and builds a debug APK
- Uploads `app-debug.apk` as a CI artifact

## Data & Privacy

All data is stored locally on the device using AsyncStorage. No sensitive information is committed to this repository.
