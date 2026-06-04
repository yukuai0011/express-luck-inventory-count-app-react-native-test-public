# Rewrite Inventory App with react-native-reusables + Uniwind

**Date:** 2026-06-04
**Status:** Approved (pending user review of written spec)

## Summary

Rewrite the existing `App.tsx` Gluestack-UI-based inventory recording app to use
[`react-native-reusables`](https://github.com/founded-labs/react-native-reusables)
with [Uniwind](https://docs.uniwind.dev) for Tailwind styling, and split the
single screen into a multi-screen expo-router tabs layout. Keep the business
logic, AsyncStorage persistence, and the GitHub Actions workflows exactly the
same. Do not build Android locally — Android is built only in CI.

## Goals

- Replace Gluestack UI primitives (`Box`, `Button`, `Input`, `Switch`,
  `Heading`, `Text`, `Toast`, …) with `react-native-reusables` components
  styled with Tailwind v4 classes via Uniwind.
- Move from a single `App.tsx` screen to a tabs-based multi-screen layout
  using `expo-router`.
- Add light / dark / system theme switching.
- Build a tiny custom toast layer on top of rnr primitives (no new
  dependencies).
- Use Bun for all package management and scripts.
- Keep web as the fast local feedback loop; Android is built only in CI.

## Non-goals

- No new business features. The app's recording profile, package submit, and
  offline-queue behaviour are preserved as-is.
- No new dependencies for toasts, forms, state management, or theme handling.
- No local Android builds. `./gradlew assembleDebug` runs only in the
  `android-apk.yml` GitHub Actions workflow.
- No rewrite of the offline queue algorithm; we keep the same
  try-once / retry-on-Sync flow.

## Tech stack

| Concern | Choice |
|---|---|
| Framework | Expo SDK 56 + React Native 0.85 (unchanged) |
| Package manager | Bun (1.3.x, matching CI) |
| Routing | `expo-router` v6 (new) |
| UI primitives | `react-native-reusables` (shadcn-style) |
| Styling | Uniwind + Tailwind v4 (new) |
| State | React `useState` + a single `AppStateContext` |
| Storage | `@react-native-async-storage/async-storage` (unchanged) |
| Camera | `expo-camera` (unchanged) |
| Icons | `@expo/vector-icons` (unchanged) |
| Build | Expo prebuild + `assembleDebug` (unchanged, only in CI) |

## Project structure

```
.
├── app/                          # expo-router file routes
│   ├── _layout.tsx               # Root: providers, theme toggle, toast provider
│   ├── (tabs)/_layout.tsx        # Tabs navigator (Profile / Work / Outbox)
│   ├── (tabs)/index.tsx          # Profile tab
│   ├── (tabs)/work.tsx           # Work tab
│   ├── (tabs)/outbox.tsx         # Outbox tab
│   └── scan.tsx                  # Modal route for camera scanning
├── components/
│   ├── ui/                       # rnr primitives (button, card, input, …)
│   ├── theme/
│   │   ├── theme-provider.tsx    # Reads persisted theme on mount
│   │   └── theme-toggle.tsx      # Light / Dark / System segmented control
│   ├── toast/
│   │   ├── toast.tsx             # rnr Toast wrapper + Animated.View
│   │   └── toast-provider.tsx    # useToast() hook + imperative API
│   ├── profile-card.tsx
│   ├── work-card.tsx
│   ├── outbox-card.tsx
│   ├── scan-modal.tsx
│   └── summary-text.tsx
├── lib/
│   ├── storage.ts                # AsyncStorage wrappers
│   ├── api.ts                    # submit + sync queue
│   ├── qr.ts                     # parseJson, parseRecordingInfo,
│   │                             # sanitizeEndpoint, uuidv4
│   └── utils.ts                  # cn() from rnr template
├── global.css                    # @import "tailwindcss" + @import "uniwind"
├── metro.config.js               # withUniwindConfig wrapper
├── app.json                      # name/slug preserved, web baseUrl preserved
└── package.json
```

## Routing layout

`expo-router` with a `(tabs)` group at the root. Three tabs:

- **`(tabs)/index.tsx`** — Profile card (QR scan, paste JSON, bearer token,
  save / clear).
- **`(tabs)/work.tsx`** — Work card (package no input, intact switch,
  quantity stepper, submit).
- **`(tabs)/outbox.tsx`** — Outbox card (pending count, sync, clear).

A separate stack route `scan.tsx` is presented as a modal from the Profile and
Work tabs. The route receives `mode` as a query param (`qr` | `barcode`) and
returns the scanned value via the standard expo-router return-value pattern.

## Components

| Component | rnr primitives | State | Notes |
|---|---|---|---|
| `ProfileCard` | Card, Button, Input, Textarea, Badge, Text | `scannedApi`, `scannedInfo`, `pasteJson`, `bearerToken` | Two readiness badges. Buttons: Scan QR (`router.push('/scan?mode=qr')`), Reset, Detect (paste-JSON), Save Profile, Clear Saved Profile. |
| `WorkCard` | Card, Input, Switch, Button, Text | `packageNo`, `intact`, `quantity` | Scan button pushes to `/scan?mode=barcode`. Submit calls `lib/api.submitPayload()`. |
| `OutboxCard` | Card, Button, Text | none — reads `outbox.length` | Sync now + Clear (with `Alert.alert` confirm). |
| `ScanModal` | `expo-camera` `CameraView`, Button | `handled` flag | Renders web-fallback message on `Platform.OS === 'web'`. |
| `ThemeToggle` | Pressable, Text | none | Three buttons calling `Uniwind.setTheme`. |
| `Toast` | rnr Toast primitives + `Animated.View` | global queue | Max 3 visible, 2s auto-dismiss. |

`SummaryText` is a small helper that renders a monospaced, bordered block for
JSON output (profile summary / submit response).

## State and data flow

```
AsyncStorage "inventory_profile"   ─load─▶  AppStateContext.profile
                                                  │
                                       ┌──────────┼──────────┐
                                       ▼          ▼          ▼
                                  ProfileCard  WorkCard  OutboxCard
                                       │          │
                            submit/sync (lib/api.ts)
                                                  │
                                                  ▼
                            AsyncStorage "inventory_outbox" ◀─setOutbox
```

- `AppStateContext` is a single context that exposes
  `{ profile, setProfile, outbox, setOutbox }`. It loads both keys on mount
  via `Promise.all([getItem('inventory_profile'), getItem('inventory_outbox')])`.
- `setProfile(next)` and `setOutbox(next)` both update state and write through
  to AsyncStorage.
- `lib/api.ts` is the only file that calls `fetch`. It exports
  `submitPayload(profile, payload)` and `syncOutbox(outbox, setOutbox)`.
  `submitPayload` returns `{ ok, status, body }`. On `fetch` throw it appends
  to the outbox via `setOutbox`.
- `lib/qr.ts` contains the pure helpers from the current `App.tsx`:
  `parseJson`, `parseRecordingInfo`, `sanitizeEndpoint`, `uuidv4`. These are
  unit-testable in isolation.

## Theming

- Uniwind pre-registers `light`, `dark`, `system` themes; we use them as-is
  with the `dark:` class variant.
- Root `_layout.tsx` wraps everything in the uniwind theme provider (provided
  by the rnr template).
- A `ThemeToggle` segmented control sits in the root header on all screens,
  exposing `Light / Dark / System` and calling `Uniwind.setTheme`.
- We persist the chosen theme in AsyncStorage under the key `@theme` and
  re-apply it on mount, so a user who picks `dark` doesn't get reset to
  `system` on next launch.

## Toast / feedback

A small custom layer with no new dependencies:

- `ToastProvider` renders nothing by default and exposes a `useToast()` hook
  returning `{ show(message) }`.
- Internal state: a queue of `{ id, message }` items, max 3 visible.
- Each item renders as a `<View>` with `bg-gray-900 dark:bg-gray-100` plus
  `text-white dark:text-gray-900` for the message text, animated with
  `react-native-reanimated` (already a dep of the rnr template) for slide-in
  / fade-out.
- Position: top of the screen, padded below the status bar.
- Auto-dismiss after 2000ms. `show()` deduplicates by message text.
- `useToast()` is used in `ProfileCard` (Detect / Save / Clear), `WorkCard`
  (Submit), `OutboxCard` (Sync / Clear), and `ScanModal` (invalid QR / no
  permission).

## CI / build workflows

- `.github/workflows/android-apk.yml` — unchanged. Still does
  `bun install` → `bunx expo prebuild --platform android --non-interactive` →
  `./gradlew assembleDebug` → upload `app-debug.apk`.
- `.github/workflows/android-apk-release.yml` — unchanged.
- `.github/workflows/web.yml` — unchanged. Picks up the new bundle
  automatically; the `baseUrl` in `app.json` stays
  `/express-luck-inventory-count-app-react-native-test-public`.

Local `package.json` scripts:

```
"start":      "expo start",
"android":    "expo start --android",
"ios":        "expo start --ios",
"web":        "expo start --web",
"web:export": "expo export --platform web",
"typecheck":  "tsc --noEmit"
```

We do not run `./gradlew assembleDebug` locally; the Android workflow is the
only place Android gets built.

## Web vs. native considerations

- **Camera:** `expo-camera`'s `CameraView` does not reliably render the live
  camera feed inside a web browser, and the barcode-scanning settings are
  unsupported on web. The `ScanModal` detects `Platform.OS === 'web'` and
  renders a "Camera scanning not available on web — paste JSON or type the
  package number" message. The existing paste-JSON fallback in `ProfileCard`
  and the text input in `WorkCard` cover all flows on web.
- **AsyncStorage on web:** falls back to `localStorage` via the
  `@react-native-async-storage/expo-with-async-storage` plugin (already in
  `app.json`).
- **Toasts on web:** the reanimated-based toast works in the browser. Position
  is top of the viewport.
- **Base URL:** keep
  `experiments.baseUrl: "/express-luck-inventory-count-app-react-native-test-public"`
  so GitHub Pages deploys under the repo path.

## Migration approach

1. **Scaffold** the new project layout using
   `bunx react-native-reusables@latest init --template minimal-uniwind` into a
   temporary sibling directory.
2. **Preserve** the existing `app.json` (name, slug, version, orientation,
   icon, iOS/Android config, plugins, web baseUrl).
3. **Copy** the scaffolded `app/`, `components/`, `lib/`, `global.css`,
   `metro.config.js`, and `tsconfig.json` over the current project, then
   re-apply our `app.json` and `index.ts` changes on top.
4. **Port** the business logic from the current `App.tsx` into the new
   components and `lib/*` modules.
5. **Replace** the Gluestack-specific code with rnr primitives + Uniwind
   class names. Run `bunx expo install --fix` to align versions.
6. **Validate** locally with `bun run web` and `bun run web:export`.
7. **Push** to a branch. The existing CI workflows build Android and deploy
   Web; we inspect their artifacts.

## Testing

- **Unit tests (light):** `lib/qr.ts` pure helpers (`parseJson`,
  `parseRecordingInfo`, `sanitizeEndpoint`) get a small bun:test suite. The
  current `App.tsx` has no tests, so this is a small expansion, not a
  regression.
- **Local validation:**
  - `bun run typecheck` — no TS errors.
  - `bun run web` — Expo dev server starts; visit the bundle, exercise the
    paste-JSON flow, save a profile, submit (will fail without a real
    endpoint, which is the expected offline-queue path), and verify the
    outbox sync UI.
  - `bun run web:export` — produces a static `dist/` that mirrors what
    GitHub Pages will serve.
- **CI validation:** the existing `android-apk.yml` and `web.yml` workflows
  must continue to pass on the rewritten branch.

## Risks and mitigations

- **rnr `init` may pull a newer Expo SDK than 56.** We pin the project to
  SDK 56 after the init and run `bunx expo install --fix` to align packages.
- **Uniwind type generation may collide with custom `className` props.** The
  rnr template's `components/ui/*` already includes the right `className`
  typings; we do not hand-roll component wrappers.
- **Camera on web silently dropping.** The `ScanModal` explicitly shows a
  fallback message on `Platform.OS === 'web'`, so users on web are told
  what to do rather than seeing a blank screen.
- **Theme flicker on mount.** The persisted theme is read and applied before
  the first paint via the `ThemeProvider` in `_layout.tsx`. If the read is
  slow, we accept a one-frame flash to default `system` rather than blocking
  the UI.
