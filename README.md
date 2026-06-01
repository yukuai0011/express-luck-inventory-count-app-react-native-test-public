# Express Luck Inventory (React Native)

Offline-first inventory recording app rebuilt with React Native, Expo, HeroUI Native, Expo Router, and Bun.

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
- Expo Router (tabs: Profile | Work | Outbox)
- HeroUI Native + Uniwind (Tailwind for RN)
- Bun (package manager + test runner)
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
```

`bun run start` uses Expo Go. If HeroUI Native native modules are not available in Expo Go, push the change and let CI verify the APK build. **Do not** run `expo prebuild` or `gradlew` locally.

## Tests

```bash
bun test
bun run typecheck
```

Unit tests cover `lib/profile`, `lib/storage`, `lib/outbox`, and `lib/uuid`.

## GitHub Actions

Workflows: `.github/workflows/android-apk.yml`, `.github/workflows/android-apk-release.yml`

- Run on `push` and `pull_request`
- Prebuild Android and build debug + release APKs
- Upload APKs as CI artifacts

## Data & Privacy

All data is stored locally on the device using AsyncStorage. No sensitive information is committed to this repository.
