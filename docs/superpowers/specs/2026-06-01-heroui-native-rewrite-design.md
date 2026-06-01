# HeroUI Native Rewrite — Design

**Date:** 2026-06-01
**Status:** Approved (design), pending implementation plan
**Owner:** app author
**Scope:** Full rewrite of the inventory recording app using HeroUI Native (latest beta), with web support removed and an Android-only build at the end.

## 1. Context

The current app is a single-file `App.tsx` React Native + Expo project that uses Gluestack UI v1 and Bun. It supports three flows:

1. **Profile setup** — scan two QR codes (API endpoint and recording info) or paste their JSON, save as a profile, plus an optional bearer token.
2. **Work** — scan or type a package number, mark it intact or set a quantity, submit a `POST` to the profile's API endpoint.
3. **Offline queue** — submissions that fail (network error) are saved to AsyncStorage and can be re-synced later.

The codebase currently targets **web, iOS, and Android**. The user wants a rewrite that:

- Replaces Gluestack UI with **HeroUI Native (latest beta)**.
- **Drops web support entirely** (HeroUI Native does not support web).
- Only produces an **Android debug APK** at the end.
- Keeps the stack the same: **React Native + Expo + Bun** (use Bun for installs, scripts, and toolchain).

The feature set stays the same; this is a UI/UX + structural rewrite, not a product change.

## 2. Decisions

Made during brainstorming and approved by the user.

| Decision | Choice |
| --- | --- |
| Code structure | **Heavier split** — small components in `components/`, pure logic in `lib/`, custom hooks in `hooks/`, file-based routes under `app/` |
| Navigation | **Expo Router + routes** |
| Tabs | **Profile / Work / Outbox** as a `(tabs)` route group with `<Tabs>` from `expo-router` |
| Camera scanner presentation | **Full-screen modal route** `(modal)/scan` (`presentation: 'fullScreenModal'`) |
| Color scheme | **Light + dark** via HeroUI Native's default theme + Uniwind's auto light/dark from system preference |
| Submission result feedback | **Inline `<ResultCard>` on the Work tab** (no toast on submit; toasts only for Profile / Outbox feedback) |
| Drop web | **Yes** — remove `web` config from `app.json`, no `favicon`, no `expo start --web` script |
| Final build | **Android debug APK only** |

## 3. High-level architecture

```
app/
  _layout.tsx          # GestureHandlerRootView + HeroUINativeProvider + Stack host
  (tabs)/
    _layout.tsx        # Tabs host (3 tabs)
    index.tsx          # Redirect → /profile
    profile.tsx        # Tab 1
    work.tsx           # Tab 2
    outbox.tsx         # Tab 3
  (modal)/
    scan.tsx           # Full-screen scanner route (presentation: fullScreenModal)
components/
  Pill.tsx             # Status pill (Chip)
  ProfileForm.tsx      # Profile tab content
  PackageForm.tsx      # Work tab content
  OutboxList.tsx       # Outbox tab content
  ResultCard.tsx       # Inline JSON/result card
lib/
  types.ts             # Profile, OutboxItem, ScanMode
  parse.ts             # parseJson, parseRecordingInfo, sanitizeEndpoint
  storage.ts           # AsyncStorage wrappers
  submit.ts            # uuidv4 + submitRecord
  outbox.ts            # enqueue, syncOutbox, clearOutbox
  scanBridge.ts        # module-level ref so /scan can call back into the parent
hooks/
  useProfile.ts        # Profile state + loadProfile / saveProfile / clearProfile
  useOutbox.ts         # Outbox state + enqueue / sync / clear
```

**Why this shape:**

- Each tab is its own screen file, easy to add Settings or History later.
- Pure logic in `lib/` is testable without React.
- The scanner is a real route so it can fill the screen and be invoked from any tab.
- `scanBridge.ts` avoids bringing in a state library for one piece of cross-route state.

## 4. Project setup & dependencies

### 4.1 `package.json`

```json
{
  "name": "express-luck-inventory-count-app-react-native-test-public",
  "version": "1.0.0",
  "main": "expo-router/entry",
  "scripts": {
    "start": "expo start",
    "android": "expo start --android",
    "prebuild:android": "bunx expo prebuild --platform android --non-interactive",
    "build:android": "cd android && ./gradlew assembleDebug"
  },
  "dependencies": {
    "heroui-native": "latest",
    "react-native-reanimated": "^4.1.1",
    "react-native-gesture-handler": "^2.28.0",
    "react-native-worklets": "^0.5.1",
    "react-native-safe-area-context": "^5.6.0",
    "react-native-svg": "^15.15.4",
    "tailwind-variants": "^3.2.2",
    "tailwind-merge": "^3.4.0",
    "react-native-screens": "^4.16.0",
    "expo": "~54.0.33",
    "expo-camera": "~17.0.10",
    "expo-router": "~6.0.13",
    "expo-linking": "~7.0.0",
    "expo-constants": "~17.0.0",
    "expo-status-bar": "~3.0.9",
    "react": "19.2.6",
    "react-native": "0.81.5",
    "@react-native-async-storage/async-storage": "^3.0.2",
    "@react-native-async-storage/expo-with-async-storage": "^1.0.0",
    "uniwind": "latest"
  }
}
```

### 4.2 `app.json`

Drop `web` and `baseUrl` experiment, add `expo-router` plugin, switch `userInterfaceStyle` to `automatic`, set a `scheme`, set the Android `package`, drop the iOS-specific config (or keep it for clarity — not a build target):

```json
{
  "expo": {
    "name": "Express Luck Inventory",
    "slug": "express-luck-inventory",
    "scheme": "expressluckinventory",
    "version": "1.0.0",
    "orientation": "portrait",
    "userInterfaceStyle": "automatic",
    "newArchEnabled": true,
    "ios": {
      "supportsTablet": true,
      "infoPlist": {
        "NSCameraUsageDescription": "Allow camera access to scan QR codes and package barcodes."
      }
    },
    "android": {
      "permissions": ["CAMERA"],
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#ffffff"
      },
      "edgeToEdgeEnabled": true,
      "predictiveBackGestureEnabled": false,
      "package": "com.expressluck.inventory"
    },
    "plugins": [
      "expo-router",
      "@react-native-async-storage/expo-with-async-storage"
    ]
  }
}
```

### 4.3 New config files

- **`global.css`** at project root:
  ```css
  @import 'tailwindcss';
  @import 'uniwind';
  @import 'heroui-native/styles';
  @source './node_modules/heroui-native/lib';
  ```
- **`metro.config.js`** at project root, wrapping the Expo config with `withUniwindConfig` and `wrapWithReanimatedMetroConfig`:
  ```js
  const { getDefaultConfig } = require('expo/metro-config');
  const { withUniwindConfig } = require('uniwind/metro');
  const { wrapWithReanimatedMetroConfig } = require('react-native-reanimated/metro-config');

  const config = getDefaultConfig(__dirname);

  module.exports = withUniwindConfig(wrapWithReanimatedMetroConfig(config), {
    cssEntryFile: './global.css',
    dtsFile: './src/uniwind.d.ts',
  });
  ```
- **`babel.config.js`** at project root:
  ```js
  module.exports = function (api) {
    api.cache(true);
    return {
      presets: ['babel-preset-expo'],
      plugins: ['react-native-worklets/plugin'],
    };
  };
  ```
  (The `react-native-worklets/plugin` must be listed last.)

### 4.4 Files removed

- `App.tsx` — replaced by `app/_layout.tsx` + route files.
- `index.ts` — replaced; `expo-router/entry` registers the root component.
- `assets/favicon.png` — web is gone.
- The empty `components/ui/` directory.
- The `react-dom` dependency from `package.json` (was only needed for web).
- The `web` script (`expo start --web`) and the `web` config block in `app.json`.
- The `web.favicon` asset entry from `app.json`.

### 4.5 Files kept

- `assets/icon.png`, `assets/splash-icon.png`, `assets/adaptive-icon.png`.
- `android/` — regenerated by `expo prebuild --platform android` at the end.
- `bun.lock` — regenerated by `bun install`.
- `.github/workflows/android-apk.yml` — same `prebuild + assembleDebug` flow.
- `tsconfig.json` — extended from `expo/tsconfig.base`; will be updated to include `expo-router` types (`"types": ["expo-router/types"]`).

### 4.6 Tooling commands (Bun)

```
bun install
bun add heroui-native react-native-reanimated react-native-gesture-handler react-native-worklets react-native-safe-area-context react-native-svg tailwind-variants tailwind-merge react-native-screens expo-router expo-linking expo-constants
bun add -d uniwind
bunx expo prebuild --platform android --non-interactive
```

## 5. Routing & navigation

### 5.1 `app/_layout.tsx`

```tsx
import { HeroUINativeProvider, type HeroUINativeConfig } from 'heroui-native';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';

const config: HeroUINativeConfig = {
  textProps: { allowFontScaling: true, maxFontSizeMultiplier: 1.5 },
};

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <HeroUINativeProvider config={config}>
        <StatusBar style="auto" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="(modal)/scan"
            options={{ presentation: 'fullScreenModal' }}
          />
        </Stack>
      </HeroUINativeProvider>
    </GestureHandlerRootView>
  );
}
```

### 5.2 `app/(tabs)/_layout.tsx`

Uses Expo Router's `<Tabs>` (the React Navigation one — HeroUI Native's `<Tabs>` is content-only). Three `<Tabs.Screen>` children with titles and `MaterialIcons` icons:

| Tab | Title | Icon |
| --- | --- | --- |
| `profile` | Profile | `person` |
| `work` | Work | `inventory-2` |
| `outbox` | Queue | `cloud-queue` |

`tabBarActiveTintColor` = theme `accent`; `tabBarStyle.backgroundColor` = theme `surface`.

### 5.3 `app/(tabs)/index.tsx`

```tsx
import { Redirect } from 'expo-router';
export default function Index() { return <Redirect href="/(tabs)/profile" />; }
```

### 5.4 `app/(modal)/scan.tsx`

- Reads `mode` from `useLocalSearchParams()`. `mode=qr` (QR only) or `mode=barcode` (any barcode).
- `useCameraPermissions()` — if not granted, request and show a deny-state UI.
- When granted, render `<CameraView style={{ flex: 1 }}>` with `barcodeScannerSettings={ mode === 'qr' ? { barcodeTypes: ['qr'] } : undefined }`.
- On barcode, call `consumeScanHandler()?.(value)` then `router.back()`.
- A `<CloseButton>` (HeroUI Native) in the top-right calls `router.back()`.

### 5.5 Scanner callback bridge — `lib/scanBridge.ts`

```ts
let handler: ((value: string) => void) | null = null;

export const registerScanHandler = (fn: (value: string) => void) => {
  handler = fn;
};

export const consumeScanHandler = (): ((value: string) => void) | null => {
  const h = handler;
  handler = null;
  return h;
};
```

The Work tab calls `registerScanHandler((value) => setPackageNo(value.trim()))` before `router.push('/(modal)/scan?mode=barcode')`.

## 6. UI: tabs, components, theming

### 6.1 Theming

- Use HeroUI Native's default light + dark theme (no custom CSS variables in this rewrite).
- `global.css` only imports; we let Uniwind pick the theme from the system.
- Card surfaces use `bg-surface` (auto light/dark).
- Status pill uses `<Chip variant="soft" color="success" | "default">`.

### 6.2 `components/Pill.tsx`

```tsx
import { Chip } from 'heroui-native';

export function Pill({ ok, label }: { ok: boolean; label: string }) {
  return (
    <Chip variant="soft" color={ok ? 'success' : 'default'} size="sm">
      <Chip.Label>{label}</Chip.Label>
    </Chip>
  );
}
```

### 6.3 `components/ProfileForm.tsx`

Inside a HeroUI `<Card>`:

- `<Card.Header>` with `<Card.Title>Recording Profile</Card.Title>` and `<Card.Description>Scan two QR codes in any order…</Card.Description>`.
- `<HStack>` with two `<Pill>`s — API Endpoint / Recording Info.
- Buttons row: `<Button>Scan QR</Button>` and `<Button variant="tertiary">Reset</Button>`.
- `<Separator className="my-2" />`.
- "Paste JSON instead" label, `<TextArea>` (HeroUI) bound to `pasteJson`, `<Button variant="secondary">Detect</Button>`.
- `<Separator className="my-2" />`.
- "Optional Bearer Token" label, `<TextField isPassword>` bound to `bearerToken`.
- Buttons row: `<Button>Save Profile</Button>` (disabled if not both pills ready), `<Button variant="tertiary">Clear Saved</Button>`.
- "Current Profile" label + `<ResultCard>` showing the saved profile JSON.

### 6.4 `components/PackageForm.tsx`

Inside a `<Card>`:

- `<Card.Header>` with `<Card.Title>Work</Card.Title>` and `<Card.Description>Use your saved profile to submit package records.</Card.Description>`.
- Package number row: `<TextField>` (flex 1) bound to `packageNo` + `<Button variant="secondary">Scan</Button>`.
- Switch row: `<Switch>` (controlled, value `intact`) + `<Label>Package intact</Label>`.
- Quantity row: minus `<IconButton>` (HeroUI, `aria-label="Decrease quantity"`) + `<TextField>` (disabled, value `String(quantity)`) + plus `<IconButton>` (`aria-label="Increase quantity"`). Both IconButtons disabled when `intact`.
- `<Button>Submit</Button>` (primary, full width).
- `<ResultCard>` showing the last request/response (only renders when `result` is non-empty).

### 6.5 `components/OutboxList.tsx`

Inside a `<Card>`:

- `<Card.Header>` with `<Card.Title>Offline queue</Card.Title>` and `<Card.Description>Pending submissions: {count}</Card.Description>`.
- Buttons row: `<Button variant="secondary">Sync now</Button>` and `<Button variant="tertiary">Clear</Button>`.
- Empty state: `<Text className="text-muted">No pending submissions.</Text>`.

### 6.6 `components/ResultCard.tsx`

```tsx
import { Card, Text } from 'heroui-native';
import { Platform, ScrollView } from 'react-native';

export function ResultCard({ children }: { children: string }) {
  return (
    <Card variant="flat" className="border border-separator">
      <Card.Body>
        <ScrollView horizontal showsHorizontalScrollIndicator>
          <Text
            style={{
              fontFamily: Platform.select({ android: 'monospace', default: 'Menlo' }),
              fontSize: 12,
            }}
          >
            {children}
          </Text>
        </ScrollView>
      </Card.Body>
    </Card>
  );
}
```

### 6.7 What we do NOT use from HeroUI Native

- `Dialog`, `BottomSheet` — replaced by a full-screen modal route (better camera UX).
- `Popover`, `Menu`, `Select`, `RadioGroup`, `Accordion`, `Tabs` (content), `Slider`, `InputOTP`, `Avatar`, `TagGroup`, `ListGroup`, `SearchField`, `InputGroup`, `PressableFeedback`, `Skeleton`, `Spinner`, `Alert` — not needed for this app.

### 6.8 Toasts

- Provided by the root `HeroUINativeProvider` (no separate `ToastProvider` import needed).
- Toasts used in:
  - Profile tab: "Profile saved", "Not valid JSON or unexpected format", "Reset".
  - Outbox tab: "Synced N item(s)", "Nothing synced".
  - Scanner modal: "Not JSON or unexpected structure; keep scanning…".
- Work tab does NOT use toasts (per decision — uses the inline `<ResultCard>`).

## 7. Data layer, state, and submit/sync flows

### 7.1 `lib/types.ts`

```ts
export type RecordingInfo = {
  orderNo: string;
  recordingNo: number;
  locationCode: string;
};

export type Profile = RecordingInfo & {
  apiEndpoint: string;
  bearerToken?: string | null;
};

export type OutboxItem = {
  url: string;
  headers: { Authorization?: string | null };
  payload: Record<string, unknown>;
  ts: string;
};

export type ScanMode = 'qr' | 'barcode';
```

### 7.2 `lib/parse.ts`

- `parseJson(text: string): Record<string, unknown> | null` — try/catch JSON.parse.
- `parseRecordingInfo(obj: Record<string, unknown>): RecordingInfo | null` — validate `orderNo`, `locationCode` (both non-empty), `recordingNo` (number).
- `sanitizeEndpoint(input: string): string` — trim and strip `<…>`.

### 7.3 `lib/storage.ts`

```ts
const STORAGE_PROFILE = 'inventory_profile';
const STORAGE_OUTBOX = 'inventory_outbox';

export async function loadProfile(): Promise<Profile | null> { /* read + JSON.parse, fall back to null */ }
export async function saveProfile(p: Profile): Promise<void> { /* JSON.stringify + setItem */ }
export async function clearProfile(): Promise<void> { /* removeItem */ }
export async function loadOutbox(): Promise<OutboxItem[]> { /* read + JSON.parse, fall back to [] */ }
export async function saveOutbox(items: OutboxItem[]): Promise<void> { /* JSON.stringify + setItem */ }
```

All reads are wrapped in try/catch so a corrupt value falls back to `null` / `[]`.

### 7.4 `lib/submit.ts`

```ts
export function uuidv4(): string { /* same algorithm as current code */ }

export type SubmitResult = { ok: boolean; status: number; body: string };

export async function submitRecord(
  url: string,
  bearerToken: string | null | undefined,
  payload: Record<string, unknown>,
): Promise<SubmitResult> { /* fetch, throw on network error, return on any HTTP status */ }
```

`submitRecord` distinguishes "network error" (throws) from "non-2xx response" (returns `{ ok: false, status, body }`) so the Work tab can render both kinds of feedback.

### 7.5 `lib/outbox.ts`

```ts
export function enqueue(item: OutboxItem, current: OutboxItem[]): OutboxItem[] {
  return [...current, item];
}

export async function syncOutbox(
  items: OutboxItem[],
): Promise<{ synced: OutboxItem[]; remaining: OutboxItem[] }> {
  const synced: OutboxItem[] = [];
  const remaining: OutboxItem[] = [];
  for (const item of items) { /* POST each, partition by ok */ }
  return { synced, remaining };
}

export function clearOutbox(): OutboxItem[] { return []; }
```

### 7.6 `hooks/useProfile.ts`

- State: `profile: Profile | null`, derived: `summary: string` (pretty JSON).
- On mount: `loadProfile()`.
- Exposes: `setProfile`, `clearProfile`.

### 7.7 `hooks/useOutbox.ts`

- State: `outbox: OutboxItem[]`.
- On mount: `loadOutbox()`.
- Exposes: `enqueue(item)`, `sync()` (calls `syncOutbox` then `saveOutbox(remaining)`, returns synced count), `clear()` (returns a Promise resolved after the user confirms in `Alert.alert`).

### 7.8 Work tab submit flow (`app/(tabs)/work.tsx`)

1. Validate (`profile` exists, `packageNo` non-empty, `apiEndpoint` starts with `http`).
2. Build payload:
   ```ts
   const payload = {
     orderNo: profile.orderNo,
     recordingNo: profile.recordingNo,
     locationCode: profile.locationCode,
     packageNo,
     quantity: intact ? 0 : quantity,
     packageIntact: intact,
   };
   ```
3. Build headers:
   ```ts
   { 'Content-Type': 'application/json', Accept: 'application/json', 'x-ms-client-tracking-id': uuidv4(), Authorization: 'Bearer …' }
   ```
4. Try `submitRecord`:
   - On success: `setResult(`POST ${url}\nPayload:\n${...}\n\nResponse:\n{\n  "status": …, "ok": …, "body": …\n}`); clear `packageNo` and reset `quantity` to 0.
   - On throw: `enqueue({ url, headers: { Authorization }, payload, ts: new Date().toISOString() }, outbox)`; `setResult('Request failed (likely offline). Saved to queue.\n' + error)`.
5. The `<ResultCard>` is conditionally rendered — the Work tab keeps the result card visible until the next submit, matching the current behavior.

### 7.9 Outbox tab sync flow (`app/(tabs)/outbox.tsx`)

1. Call `sync()` on `useOutbox()`.
2. `Toast.show(...)`: `"Synced N item(s)"` if `N > 0`, else `"Nothing synced"`.
3. The hook replaces the outbox with `remaining`.

### 7.10 Outbox tab clear flow

- `Alert.alert('Confirm', 'Clear all pending submissions?', [Cancel, OK-destructive])`.
- On OK, `await clear()`; the outbox is reset to `[]`.

### 7.11 Error handling summary

- AsyncStorage reads: try/catch → fall back to defaults.
- `submitRecord`: throws on network error, returns `{ ok, status, body }` on HTTP response.
- Camera permission denied in `(modal)/scan.tsx`: show a deny-state with a "Close" button and a "Paste JSON instead" hint. No further action; the user dismisses the modal.

## 8. Testing approach

No automated tests are added in this rewrite (matches the current project).

Manual smoke test on Android:

1. Open the app → land on the Profile tab.
2. Tap "Scan QR" — modal opens, camera permission requested.
3. Scan the API endpoint QR (or paste JSON) — pill turns green.
4. Scan the recording info QR (or paste JSON) — pill turns green.
5. Optionally enter a bearer token, tap "Save Profile" — toast "Profile saved".
6. Switch to the Work tab. Scan or type a package number.
7. Leave "Package intact" on, tap "Submit" — `<ResultCard>` shows the POST + response.
8. Toggle "Package intact" off, set quantity, tap "Submit" again — `<ResultCard>` updates.
9. Disable network, tap "Submit" — `<ResultCard>` shows "Saved to queue".
10. Switch to the Queue tab — pending count is 1.
11. Re-enable network, tap "Sync now" — toast "Synced 1 item(s)", count goes to 0.
12. Tap "Clear" with no items — confirm dialog appears; on OK, count stays 0.

## 9. Android build verification

This is the final step of the implementation.

1. `bun install` — confirms all HeroUI Native + peer deps resolve without errors.
2. `bunx expo prebuild --platform android --non-interactive` — regenerates `android/` with HeroUI Native's required Gradle/manifest entries.
3. `cd android && ./gradlew assembleDebug` — produces `android/app/build/outputs/apk/debug/app-debug.apk`.

**If the local build fails because the environment is missing Android SDK / Java / Gradle, the agent will:**

- Report exactly which tool is missing (e.g., `JAVA_HOME not set`, `sdkmanager not found`, Gradle download blocked).
- Confirm the codebase is correctly wired (root layout, providers, config) so a CI machine with the toolchain will build it.
- Recommend the existing GitHub Actions workflow (`.github/workflows/android-apk.yml`) as the build path — push to a branch and let CI produce the APK.

**We do NOT build for iOS or web** — `--platform android` is the only prebuild, and `web` is removed from `app.json`.

## 10. Out of scope (explicitly)

- Automated tests (no Jest / Detox / Maestro config in this rewrite).
- iOS build / Podfile.
- Web build / favicon / PWA / GitHub Pages deploy.
- Zustand / Redux / TanStack Query — kept out per the "scanBridge ref" pattern.
- A new `Settings` tab or token rotation flow.
- Internationalisation.
- Push notifications.
- i18n of error toasts.

## 11. Risks & open items

- **Risk:** `react-native-worklets/plugin` must be the **last** plugin in `babel.config.js` (not `react-native-reanimated/plugin` as the HeroUI Native quick-start says for older versions). The plan uses `react-native-worklets/plugin` per the v4.1 reanimated docs.
- **Risk:** Peer-version drift between `react-native-reanimated`, `react-native-worklets`, and `react-native-svg`. We pin to the exact versions HeroUI Native lists as required peers.
- **Risk:** The local Android build may fail due to missing Android SDK on this machine. The fallback is the GitHub Actions workflow (which already has the toolchain).
- **Open item:** Confirm whether to keep the iOS block in `app.json` (kept for clarity, even though we won't build it) or remove it. Decision: keep it; `expo prebuild --platform android` ignores it.
- **Open item:** Whether to commit the regenerated `android/` folder. Decision: commit it (matches current project convention).
