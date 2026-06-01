---
name: 2026-06-01-heroui-native-rewrite-design
description: Rewrite the inventory scanner PoC from Gluestack UI to HeroUI Native on Expo Router (tabs), drop web, keep Bun + AsyncStorage, CI-only Android build
metadata:
  type: project
---

# HeroUI Native Rewrite (Expo Router, Android-only)

## Context

The app is an offline-first inventory recording PoC built with Expo SDK 56, React Native 0.85.3, React 19.1.0, and Gluestack UI. It scans two QR codes to establish a recording profile, scans/types a package number, toggles intact/damaged state, and POSTs to a configured endpoint with an AsyncStorage-backed offline outbox.

The user wants to:
- Rewrite the UI on **HeroUI Native** (latest).
- **Drop web support** (HeroUI Native is React Native-only; web entrypoint removed).
- Restructure the project to **Expo Router with tabs** (Profile | Work | Outbox).
- **Keep the stack**: React Native + Expo + **Bun** + AsyncStorage + expo-camera.
- **Use Bun wherever possible** (install, scripts, test runner).
- **Not build locally**: only CI runs the Android APK build. Local dev may use Expo Go; if that fails, defer to CI.

A previous attempt at Gluestack v3 / Tamagui configuration was reverted (commits `45b4ac8`, `4b50f4a`) — the current `App.tsx` is on Gluestack v1 + `@gluestack-ui/config`. This spec is the fresh rewrite.

## Goals

- UI primitives swap to HeroUI Native with feature-parity behavior.
- Three-tab Expo Router app matching the existing single-screen sections.
- Small UX polish: use HeroUI Native's `Toast` (variants: `success`, `danger`) and a `Dialog` for the "Clear all pending submissions?" confirmation (replacing the current `Alert.alert`).
- Web fully removed from `app.json`, dependencies, and CI.
- Local dev uses Bun + Expo Go (or stops if it fails). CI builds the APK.

## Non-Goals

- iOS build verification (no iOS workflow added; `ios` script kept for parity, not exercised by CI).
- EAS Build / EAS Update.
- Custom theming, dark-mode toggle, or a new design language.
- New product features beyond the small UX polish items above.
- Local Android build (no `expo prebuild` or `gradlew` runs locally).

## Architecture

### Stack & versions
- Expo SDK ~56, React Native 0.85.3, React 19.1.0 (unchanged).
- **Add** (latest compatible with RN 0.85 / Reanimated 4):
  - `heroui-native`
  - `expo-router` (~6.x)
  - `@expo/metro-runtime`
  - `react-native-gesture-handler`
  - `react-native-reanimated`
  - `react-native-safe-area-context`
  - `react-native-screens`
  - `react-native-worklets`
  - `uniwind`
  - `tailwind-merge`
  - `tailwind-variants`
  - `@gorhom/bottom-sheet` (transitive requirement)
- **Remove**:
  - `react-native-web`, `react-dom`
  - `@gluestack-ui/themed`, `@gluestack-ui/config`
  - `@react-native-async-storage/expo-with-async-storage` plugin — replaced by the standard `@react-native-async-storage/async-storage` Expo plugin when on Expo SDK 56 (verify during install)
- **Keep**: `expo`, `expo-camera`, `expo-splash-screen`, `expo-status-bar`, `expo-font`, `@react-native-async-storage/async-storage`, `react-native-svg`, `buffer`, `@expo/vector-icons`, `typescript`, `@types/react`.

### App shape
- File-based routing under `app/`.
- `app/_layout.tsx` mounts `GestureHandlerRootView` → `HeroUINativeProvider` → `Stack` (no `expo-router/entry` script needed; `"main": "expo-router/entry"` in `app.json`).
- `app/(tabs)/_layout.tsx` defines three tabs: **Profile**, **Work**, **Outbox**.
- Tab icons from `@expo/vector-icons` (same library HeroUI Native docs use).

### Data flow
- Local component state for form fields (packageNo, intact, quantity, etc.).
- Persistent state in AsyncStorage via `lib/storage.ts` wrappers:
  - `loadProfile()` / `saveProfile(p)` / `clearProfile()`
  - `loadOutbox()` / `saveOutbox(items)`
  - Storage keys: `inventory_profile`, `inventory_outbox` (unchanged from current code).
- Two custom hooks own the read/write cycles:
  - `useProfile()` — `{ profile, save, clear, reload }`
  - `useOutbox()` — `{ outbox, enqueue, drain, clear, reload }`
- Work tab calls `useProfile().profile` (read) and `useOutbox().enqueue` (write on failure).
- Outbox tab calls `useOutbox().drain` and `useOutbox().clear`.
- Profile tab calls `useProfile().save` / `clear`.
- No global state library — the data shape is small and tabs read shared AsyncStorage on focus.

## File structure

```
app/
  _layout.tsx                  # HeroUINativeProvider + GestureHandlerRootView + Stack
  (tabs)/
    _layout.tsx                # Tabs: Profile | Work | Outbox
    profile.tsx                # recording profile UI
    work.tsx                   # submit + last response
    outbox.tsx                 # pending count, sync, clear
components/
  ScanModal.tsx                # camera scanner (RN Modal + CameraView)
  ProfileSummary.tsx           # renders stored profile as a code block
  ResultBlock.tsx              # renders last submit/response as a code block
lib/
  types.ts                     # Profile, RecordingInfo, OutboxItem, ScanMode
  storage.ts                   # AsyncStorage keys + load/save wrappers
  profile.ts                   # sanitizeEndpoint, parseJson, parseRecordingInfo
  outbox.ts                    # enqueueOutbox, drainOutbox
  uuid.ts                      # uuidv4
hooks/
  useCameraPermission.ts       # wraps expo-camera useCameraPermissions
  useProfile.ts                # load/save/clear profile
  useOutbox.ts                 # load/save/enqueue/drain outbox
__tests__/
  profile.test.ts              # parseJson / parseRecordingInfo / sanitizeEndpoint
  outbox.test.ts               # enqueue/drain with mocked fetch
  uuid.test.ts                 # smoke test for v4 shape
```

## Component swap map (Gluestack → HeroUI Native)

| Gluestack (current) | HeroUI Native (new) |
|---|---|
| `GluestackUIProvider` + `config` | `HeroUINativeProvider` (default config; v1, no theme customization) |
| `Box` / `VStack` / `HStack` | `View` with Uniwind `className` (`flex-row gap-2`, `flex-col gap-2`, etc.) |
| `Heading` | `Text className="font-bold text-2xl"` (or a `Heading` wrapper) |
| `Text` | `Text` from `heroui-native` (extends RN Text) |
| `Input` + `InputField` | `TextField` + `Label` + `Input` |
| `Textarea` + `TextareaInput` | `TextField` with `Input multiline` |
| `Button` + `ButtonText` | `Button` + `Button.Label` (or string children) |
| `Badge` + `BadgeText` | `Chip` (or styled `View`+`Text` fallback) |
| `Switch` | `Switch` (`isSelected` / `onSelectedChange`) |
| `Divider` | `Divider` |
| `Modal` (scanner) | RN `Modal` (HeroUI Native has no scanner modal) |
| `useToast` (Gluestack) | `useToast` from `heroui-native` (`{ toast }.show({ variant, label, ... })`) |
| `Alert.alert` (clear-outbox) | `Dialog` from `heroui-native` with `Dialog.Trigger` / `Dialog.Portal` / `Dialog.Content` |

## UX polish (small, in-scope)

1. **Toast notifications** — replace the Gluestack `toast.show` with `toast.show({ variant: 'success' | 'danger', label, ... })` from HeroUI Native. Preserve all current call sites ("Profile saved", "No profile saved…", "Package number is required.", "Not JSON or unexpected structure; keep scanning…", "Synced N item(s)", "Nothing synced").
2. **Clear-outbox confirmation** — replace `Alert.alert('Confirm', 'Clear all pending submissions?', ...)` with a HeroUI Native `Dialog`. The "Clear" button becomes a `Dialog.Trigger`; the "OK" button inside the Dialog calls `clearOutbox()`.

No other behavioral changes.

## Configuration

### `app.json`
- Add `"plugins": ["expo-router", ...existing plugins]`.
- `"main": "expo-router/entry"`.
- **Remove** `"web": { "favicon": ... }` block.
- **Remove** `"experiments": { "baseUrl": ... }` (web-only).
- Keep `ios`, `android` (camera permission), `splash`, `icon`, `adaptiveIcon` unchanged.
- Keep `userInterfaceStyle: "light"` for now.

### Babel / Metro
- `babel.config.js` with `react-native-worklets/plugin` (or `react-native-reanimated/plugin` — whichever the HeroUI Native example uses on Reanimated 4) **last** in the list.
- `metro.config.js` wraps the config: `withUniwindConfig(wrapWithReanimatedMetroConfig(config), { cssEntryFile: './global.css', dtsFile: './src/uniwind.d.ts' })`.
- `global.css` with `@import "tailwindcss";` and any required HeroUI Native preset import.
- `src/uniwind.d.ts` (path) for class types.
- `tsconfig.json` extends `expo/tsconfig.base`, `strict: true`, plus `"paths": { "@/*": ["./*"] }`.

### `package.json` scripts (Bun-first)
```json
{
  "main": "expo-router/entry",
  "scripts": {
    "start": "expo start",
    "android": "expo start --android",
    "ios": "expo start --ios",
    "prebuild": "expo prebuild --platform android --non-interactive",
    "test": "bun test",
    "typecheck": "tsc --noEmit"
  }
}
```
- `web` script removed.
- Scripts invoke local `expo` bin; Bun runs them directly.
- `prebuild` script exists for completeness, but **must not be run locally** — only CI uses it.

### Local dev rules
- **Never** run `expo prebuild`, `gradlew`, or any Android build locally.
- `bun run start` (or `bunx expo start`) is allowed for Expo Go testing. If HeroUI Native native modules don't load in Expo Go (likely, since HeroUI Native bundles native code), the developer should stop and let CI verify the APK build.
- Dependency changes go through `bun add` / `bun install`. `bun.lock` stays committed.
- No `npm` / `yarn` / `pnpm`.

## CI workflows

### `.github/workflows/android-apk.yml` (update)
- Add `env: EXPO_NO_TELEMETRY: "1"`.
- Steps remain: checkout → setup-bun (1.3.13) → setup-java 17 (temurin) → setup-android → `bun install` → `bunx expo prebuild --platform android --non-interactive` → `cd android && ./gradlew assembleDebug` → upload `app-debug.apk` artifact.
- Triggers unchanged: `push` and `pull_request`.

### `.github/workflows/android-apk-release.yml` (update)
- Add `env: EXPO_NO_TELEMETRY: "1"`.
- Steps remain the same, with the existing Bun + Gradle caches.
- Triggers unchanged: `push`, `pull_request`, `workflow_dispatch`.

### `.github/workflows/web.yml` (delete)
- Removed entirely. Web is no longer supported.

### No new workflows
- No test workflow added. Tests run locally via `bun test`; CI does not gate on them.
- No iOS workflow. iOS is out of scope per "only do the android build at the end."

## Testing approach

- Runner: `bun test` (Bun's built-in test runner, Jest-compatible API).
- Scope: pure functions in `lib/`.
  - `__tests__/profile.test.ts` — golden cases for `parseJson`, `parseRecordingInfo` (happy path, missing fields, NaN recordingNo), `sanitizeEndpoint` (with/without angle brackets, whitespace).
  - `__tests__/outbox.test.ts` — `enqueueOutbox` appends with ISO timestamp; `drainOutbox` returns success count and remaining array; HTTP 4xx/5xx keeps the item queued; network error keeps the item queued; malformed URL keeps the item queued.
  - `__tests__/uuid.test.ts` — output matches the v4 shape regex `/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i`.
- No component / E2E tests in this PoC. UI is a thin wrapper around `lib/`.
- `bun test` runs them locally; CI does not run them.

## Out of scope

- iOS build verification, EAS, custom theming, dark mode, new product features.
- Local Android builds (`expo prebuild`, `gradlew`).
- Component snapshot tests, E2E tests.
- Migrating the previous GitHub Pages deployment (workflow deleted; no replacement).

## Open questions

None at design time. All choices confirmed with the user before this spec was written.
