# HeroUI Native Rewrite (Expo Router, Android-only) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port the inventory scanner PoC from Gluestack UI to HeroUI Native on Expo Router tabs, drop web support, keep Bun + AsyncStorage, and verify the Android build in CI only.

**Architecture:** Expo SDK 56 + React Native 0.85.3 + React 19.1.0 + Expo Router tabs. HeroUI Native provides the UI primitives (Button, TextField, Switch, Toast, Dialog, etc.) and is mounted at the root via `HeroUINativeProvider`. Local state lives in tab screens; persistent state (profile, outbox) is stored in AsyncStorage via small `lib/` modules and `hooks/` wrappers. No local Android build is ever run — only CI runs `expo prebuild` + `gradlew assembleDebug` / `assembleRelease`.

**Tech Stack:** Expo SDK 56, React Native 0.85.3, React 19.1.0, Expo Router ~6, HeroUI Native (latest), Uniwind (Tailwind for RN), react-native-reanimated 4 + react-native-worklets, react-native-gesture-handler, react-native-safe-area-context, react-native-screens, @gorhom/bottom-sheet, AsyncStorage, Bun (package manager + test runner), TypeScript.

**Local validation rules (apply to every task):**
- Use `bun` for every package operation (`bun add`, `bun remove`, `bun install`).
- Validate locally with `bun test` and `bun run typecheck` only.
- **Never** run `expo prebuild`, `gradlew`, or any Android build locally.
- `bun run start` is allowed for Expo Go exploration; if it fails, stop and push to CI.
- Commit after every task. Conventional-commit style (`chore:`, `feat:`, `docs:`, `test:`).

---

## File Structure

**Created**
- `babel.config.js` — Reanimated/Worklets babel plugin chain.
- `metro.config.js` — wraps Metro with Uniwind + Reanimated config.
- `global.css` — Tailwind import + HeroUI Native preset.
- `src/uniwind.d.ts` — generated class-type declarations.
- `tsconfig.paths.json` — path alias declaration (referenced from `tsconfig.json`).
- `app/_layout.tsx` — root: `GestureHandlerRootView` → `HeroUINativeProvider` → `Stack`.
- `app/(tabs)/_layout.tsx` — Expo Router Tabs.
- `app/(tabs)/profile.tsx` — Profile tab.
- `app/(tabs)/work.tsx` — Work tab.
- `app/(tabs)/outbox.tsx` — Outbox tab.
- `components/ScanModal.tsx` — camera scanner (RN `Modal` + `CameraView`).
- `components/ProfileSummary.tsx` — code block for saved profile.
- `components/ResultBlock.tsx` — code block for last submit/response.
- `lib/types.ts` — `Profile`, `RecordingInfo`, `OutboxItem`, `ScanMode`.
- `lib/uuid.ts` — `uuidv4()`.
- `lib/profile.ts` — `parseJson`, `parseRecordingInfo`, `sanitizeEndpoint`.
- `lib/storage.ts` — AsyncStorage load/save wrappers + keys.
- `lib/outbox.ts` — `enqueueOutbox`, `drainOutbox`.
- `hooks/useCameraPermission.ts` — wraps `expo-camera` `useCameraPermissions`.
- `hooks/useProfile.ts` — load/save/clear profile.
- `hooks/useOutbox.ts` — load/save/enqueue/drain/clear outbox.
- `__tests__/uuid.test.ts` — uuidv4 shape test.
- `__tests__/profile.test.ts` — parseJson / parseRecordingInfo / sanitizeEndpoint tests.
- `__tests__/storage.test.ts` — load/save/clear round-trip tests (in-memory AsyncStorage mock).
- `__tests__/outbox.test.ts` — enqueue/drain tests with mocked `fetch`.

**Modified**
- `package.json` — add/remove deps; update `main`; update `scripts` (drop `web`); add `test`, `typecheck`.
- `app.json` — add `expo-router` plugin; set `main` to `expo-router/entry`; remove `web` block; remove `experiments.baseUrl`; keep `expo-with-async-storage` plugin.
- `tsconfig.json` — add `paths` alias and include test files.
- `.github/workflows/android-apk.yml` — add `EXPO_NO_TELEMETRY=1`.
- `.github/workflows/android-apk-release.yml` — add `EXPO_NO_TELEMETRY=1`.
- `README.md` — drop web/PWA sections, add HeroUI Native, add tab routes, add `bun test`/`bun run typecheck` commands.
- `.gitignore` — keep existing (already ignores `node_modules`, `.expo`, `android/`, `ios/` if present).

**Deleted**
- `App.tsx` (replaced by `app/`).
- `index.ts` (replaced by `expo-router/entry`).
- `.github/workflows/web.yml` (web support removed).

---

## Task 1: Update app.json — drop web, add expo-router

**Files:**
- Modify: `app.json` (whole file).

- [ ] **Step 1: Write the new `app.json`**

```json
{
  "expo": {
    "name": "Express Luck Inventory",
    "slug": "express-luck-inventory",
    "version": "1.0.0",
    "main": "expo-router/entry",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "light",
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
      "predictiveBackGestureEnabled": false
    },
    "plugins": [
      "expo-router",
      "@react-native-async-storage/expo-with-async-storage",
      [
        "expo-splash-screen",
        {
          "image": "./assets/splash-icon.png",
          "resizeMode": "contain",
          "backgroundColor": "#ffffff"
        }
      ]
    ]
  }
}
```

- [ ] **Step 2: Verify the file is valid JSON**

Run: `bun -e "JSON.parse(require('fs').readFileSync('app.json','utf8')); console.log('ok')"`
Expected: prints `ok`.

- [ ] **Step 3: Commit**

```bash
git add app.json
git commit -m "chore(app): drop web, add expo-router plugin"
```

---

## Task 2: Remove web from package.json scripts and swap dependencies

**Files:**
- Modify: `package.json` (scripts + dependencies blocks).
- This task is split into two sub-steps because dependency edits depend on the registry, so we do them in sequence: first edit `package.json` for the script + removal intents, then use `bun add`/`bun remove` in Task 3 to actually mutate `node_modules` and `bun.lock`.

- [ ] **Step 1: Update the `scripts` block**

Replace the existing `scripts` block in `package.json` with:

```json
"scripts": {
  "start": "expo start",
  "android": "expo start --android",
  "ios": "expo start --ios",
  "prebuild": "expo prebuild --platform android --non-interactive",
  "test": "bun test",
  "typecheck": "tsc --noEmit"
}
```

(`web` script removed.)

- [ ] **Step 2: Update `main`**

Replace the top-level `"main": "index.ts"` with `"main": "expo-router/entry"`.

- [ ] **Step 3: Commit**

```bash
git add package.json
git commit -m "chore(scripts): drop web script, add test and typecheck, switch main to expo-router"
```

---

## Task 3: Add new runtime dependencies via Bun

**Files:**
- Modify: `package.json` (auto-updated by `bun add`).
- Modify: `bun.lock` (auto-updated by `bun add`).

- [ ] **Step 1: Add Expo Router, metro runtime, and the navigation peer deps**

```bash
bun add expo-router @expo/metro-runtime react-native-gesture-handler react-native-reanimated react-native-safe-area-context react-native-screens react-native-worklets @gorhom/bottom-sheet
```

Expected: each package is added to `dependencies` in `package.json`; `bun.lock` is updated; no errors.

- [ ] **Step 2: Add HeroUI Native and Uniwind styling deps**

```bash
bun add heroui-native uniwind tailwind-merge tailwind-variants
```

Expected: packages added; `bun.lock` updated.

- [ ] **Step 3: Commit**

```bash
git add package.json bun.lock
git commit -m "chore(deps): add heroui-native, expo-router, reanimated, uniwind"
```

---

## Task 4: Remove web and Gluestack dependencies via Bun

**Files:**
- Modify: `package.json` (auto-updated by `bun remove`).
- Modify: `bun.lock` (auto-updated by `bun remove`).

- [ ] **Step 1: Remove web and Gluestack packages**

```bash
bun remove react-native-web react-dom @gluestack-ui/themed @gluestack-ui/config
```

Expected: each package is removed from `dependencies`; `bun.lock` is updated.

- [ ] **Step 2: Commit**

```bash
git add package.json bun.lock
git commit -m "chore(deps): drop web and gluestack packages"
```

---

## Task 5: Delete the web CI workflow

**Files:**
- Delete: `.github/workflows/web.yml`.

- [ ] **Step 1: Delete the file**

Run: `rm .github/workflows/web.yml`
Expected: file is gone; `ls .github/workflows/` shows only `android-apk.yml` and `android-apk-release.yml`.

- [ ] **Step 2: Commit**

```bash
git add -A .github/workflows
git commit -m "chore(ci): drop web deployment workflow"
```

---

## Task 6: Create babel.config.js

**Files:**
- Create: `babel.config.js` (root).

- [ ] **Step 1: Write the file**

Create `babel.config.js` with:

```js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // react-native-worklets/plugin must be listed last.
      'react-native-worklets/plugin',
    ],
  };
};
```

- [ ] **Step 2: Verify the file exists**

Run: `ls babel.config.js`
Expected: prints `babel.config.js`.

- [ ] **Step 3: Commit**

```bash
git add babel.config.js
git commit -m "chore(babel): add babel.config.js with worklets plugin"
```

---

## Task 7: Create metro.config.js

**Files:**
- Create: `metro.config.js` (root).

- [ ] **Step 1: Write the file**

Create `metro.config.js` with:

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

- [ ] **Step 2: Verify the file exists**

Run: `ls metro.config.js`
Expected: prints `metro.config.js`.

- [ ] **Step 3: Commit**

```bash
git add metro.config.js
git commit -m "chore(metro): wrap metro with uniwind and reanimated"
```

---

## Task 8: Create global.css

**Files:**
- Create: `global.css` (root).

- [ ] **Step 1: Write the file**

Create `global.css` with:

```css
@import "tailwindcss";
```

- [ ] **Step 2: Verify the file exists**

Run: `ls global.css`
Expected: prints `global.css`.

- [ ] **Step 3: Commit**

```bash
git add global.css
git commit -m "chore(styling): add global.css tailwind import"
```

---

## Task 9: Create the uniwind.d.ts placeholder

**Files:**
- Create: `src/uniwind.d.ts` (root-level `src/` directory; will be regenerated by Uniwind on Metro start, but we commit a stub so `tsc --noEmit` doesn't fail before the first Metro run).

- [ ] **Step 1: Create `src/` directory and stub file**

Run:

```bash
mkdir -p src
```

Create `src/uniwind.d.ts` with:

```ts
// Generated by Uniwind on Metro start. Stub committed so `tsc --noEmit` succeeds
// before the first dev run. Real file is regenerated automatically.
declare module '*.css';
```

- [ ] **Step 2: Verify**

Run: `ls src/uniwind.d.ts`
Expected: prints `src/uniwind.d.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/uniwind.d.ts
git commit -m "chore(styling): add uniwind.d.ts stub"
```

---

## Task 10: Update tsconfig.json with path alias and test include

**Files:**
- Modify: `tsconfig.json`.

- [ ] **Step 1: Replace the file contents**

Write `tsconfig.json` as:

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": [
    "**/*.ts",
    "**/*.tsx",
    ".expo/types/**/*.ts",
    "expo-env.d.ts"
  ]
}
```

- [ ] **Step 2: Run typecheck (expected: errors about missing files, that's fine — we add them in later tasks)**

Run: `bun run typecheck`
Expected: non-zero exit (errors about missing `app/_layout.tsx`, etc.). This is fine; the alias + include are correct.

- [ ] **Step 3: Commit**

```bash
git add tsconfig.json
git commit -m "chore(tsconfig): add @/* path alias and broaden include"
```

---

## Task 11: Add lib/types.ts

**Files:**
- Create: `lib/types.ts`.

- [ ] **Step 1: Write the file**

Create `lib/types.ts` with:

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

- [ ] **Step 2: Commit**

```bash
git add lib/types.ts
git commit -m "feat(lib): add shared types for profile, outbox, and scan mode"
```

---

## Task 12: lib/uuid.ts + test (TDD)

**Files:**
- Create: `__tests__/uuid.test.ts`.
- Create: `lib/uuid.ts`.

- [ ] **Step 1: Write the failing test**

Create `__tests__/uuid.test.ts` with:

```ts
import { test, expect } from 'bun:test';
import { uuidv4 } from '../lib/uuid';

const V4_SHAPE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

test('uuidv4 matches v4 shape', () => {
  const id = uuidv4();
  expect(id).toMatch(V4_SHAPE);
});

test('uuidv4 returns unique values', () => {
  const a = uuidv4();
  const b = uuidv4();
  expect(a).not.toBe(b);
});
```

- [ ] **Step 2: Run the test — expect it to fail**

Run: `bun test __tests__/uuid.test.ts`
Expected: FAIL — `Cannot find module '../lib/uuid'`.

- [ ] **Step 3: Implement `lib/uuid.ts`**

Create `lib/uuid.ts` with (lifted from the current `App.tsx`):

```ts
export const uuidv4 = (): string => {
  const rand = (max: number) =>
    (Date.now() + Math.floor(Math.random() * max)) % max;
  const hex = (num: number, width: number) =>
    num.toString(16).padStart(width, '0');
  const p1 = hex(rand(0xffffffff), 8);
  const p2 = hex(rand(0xffff), 4);
  const p3 = hex((rand(0x0fff) & 0x0fff) | 0x4000, 4);
  const p4 = hex((rand(0x3fff) & 0x3fff) | 0x8000, 4);
  const p5 = hex(rand(0xffffffffffff), 12);
  return `${p1}-${p2}-${p3}-${p4}-${p5}`;
};
```

- [ ] **Step 4: Run the test — expect it to pass**

Run: `bun test __tests__/uuid.test.ts`
Expected: PASS — 2 tests pass.

- [ ] **Step 5: Commit**

```bash
git add __tests__/uuid.test.ts lib/uuid.ts
git commit -m "feat(lib): add uuidv4 with tests"
```

---

## Task 13: lib/profile.ts + test (TDD)

**Files:**
- Create: `__tests__/profile.test.ts`.
- Create: `lib/profile.ts`.

- [ ] **Step 1: Write the failing test**

Create `__tests__/profile.test.ts` with:

```ts
import { test, expect, describe } from 'bun:test';
import {
  parseJson,
  parseRecordingInfo,
  sanitizeEndpoint,
} from '../lib/profile';

describe('parseJson', () => {
  test('parses valid JSON object', () => {
    expect(parseJson('{"a":1}')).toEqual({ a: 1 });
  });
  test('returns null for invalid JSON', () => {
    expect(parseJson('not json')).toBeNull();
  });
  test('returns null for non-object', () => {
    expect(parseJson('123')).toBeNull();
  });
});

describe('sanitizeEndpoint', () => {
  test('trims whitespace', () => {
    expect(sanitizeEndpoint('  https://x  ')).toBe('https://x');
  });
  test('strips angle brackets', () => {
    expect(sanitizeEndpoint('<https://x>')).toBe('https://x');
  });
  test('returns empty string unchanged', () => {
    expect(sanitizeEndpoint('')).toBe('');
  });
});

describe('parseRecordingInfo', () => {
  test('parses a valid object', () => {
    expect(
      parseRecordingInfo({
        orderNo: '1234',
        recordingNo: 2,
        locationCode: 'FG HU',
      })
    ).toEqual({ orderNo: '1234', recordingNo: 2, locationCode: 'FG HU' });
  });
  test('truncates fractional recordingNo', () => {
    expect(
      parseRecordingInfo({
        orderNo: '1',
        recordingNo: 2.7,
        locationCode: 'A',
      })
    ).toEqual({ orderNo: '1', recordingNo: 2, locationCode: 'A' });
  });
  test('returns null when orderNo is missing', () => {
    expect(
      parseRecordingInfo({ recordingNo: 1, locationCode: 'A' })
    ).toBeNull();
  });
  test('returns null when recordingNo is NaN', () => {
    expect(
      parseRecordingInfo({ orderNo: '1', recordingNo: 'x', locationCode: 'A' })
    ).toBeNull();
  });
  test('returns null when locationCode is missing', () => {
    expect(
      parseRecordingInfo({ orderNo: '1', recordingNo: 1 })
    ).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test — expect it to fail**

Run: `bun test __tests__/profile.test.ts`
Expected: FAIL — `Cannot find module '../lib/profile'`.

- [ ] **Step 3: Implement `lib/profile.ts`**

Create `lib/profile.ts` with:

```ts
import type { RecordingInfo } from './types';

export const sanitizeEndpoint = (input: string): string => {
  let value = input.trim();
  if (value.startsWith('<') && value.endsWith('>')) {
    value = value.slice(1, -1);
  }
  return value;
};

export const parseJson = (text: string): Record<string, unknown> | null => {
  try {
    const parsed = JSON.parse(text);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return null;
  } catch {
    return null;
  }
};

export const parseRecordingInfo = (
  value: Record<string, unknown>
): RecordingInfo | null => {
  const orderNo = `${value.orderNo ?? ''}`.trim();
  const locationCode = `${value.locationCode ?? ''}`.trim();
  const recordingNo = Number(value.recordingNo);
  if (!orderNo || !locationCode || Number.isNaN(recordingNo)) {
    return null;
  }
  return {
    orderNo,
    recordingNo: Math.trunc(recordingNo),
    locationCode,
  };
};
```

- [ ] **Step 4: Run the test — expect it to pass**

Run: `bun test __tests__/profile.test.ts`
Expected: PASS — all 11 tests pass.

- [ ] **Step 5: Commit**

```bash
git add __tests__/profile.test.ts lib/profile.ts
git commit -m "feat(lib): add profile parsing helpers with tests"
```

---

## Task 14: lib/storage.ts + test (TDD)

**Files:**
- Create: `__tests__/storage.test.ts`.
- Create: `lib/storage.ts`.

- [ ] **Step 1: Write the failing test**

Create `__tests__/storage.test.ts` with:

```ts
import { test, expect, describe, beforeEach, mock } from 'bun:test';

const memStore = new Map<string, string>();
const asyncStorageMock = {
  getItem: mock(async (k: string) => memStore.get(k) ?? null),
  setItem: mock(async (k: string, v: string) => {
    memStore.set(k, v);
  }),
  removeItem: mock(async (k: string) => {
    memStore.delete(k);
  }),
};

mock.module('@react-native-async-storage/async-storage', () => ({
  default: asyncStorageMock,
}));

const { loadProfile, saveProfile, clearProfile, loadOutbox, saveOutbox } =
  await import('../lib/storage');
const { uuidv4 } = await import('../lib/uuid');

beforeEach(() => {
  memStore.clear();
  asyncStorageMock.getItem.mockClear();
  asyncStorageMock.setItem.mockClear();
  asyncStorageMock.removeItem.mockClear();
});

describe('profile storage', () => {
  test('loadProfile returns null when nothing stored', async () => {
    expect(await loadProfile()).toBeNull();
  });
  test('saveProfile then loadProfile round-trips', async () => {
    await saveProfile({
      apiEndpoint: 'https://x',
      orderNo: '1',
      recordingNo: 2,
      locationCode: 'A',
      bearerToken: null,
    });
    const loaded = await loadProfile();
    expect(loaded?.apiEndpoint).toBe('https://x');
    expect(loaded?.orderNo).toBe('1');
  });
  test('loadProfile returns null on corrupt JSON', async () => {
    memStore.set('inventory_profile', 'not-json');
    expect(await loadProfile()).toBeNull();
  });
  test('clearProfile removes the entry', async () => {
    await saveProfile({
      apiEndpoint: 'https://x',
      orderNo: '1',
      recordingNo: 2,
      locationCode: 'A',
      bearerToken: null,
    });
    await clearProfile();
    expect(await loadProfile()).toBeNull();
  });
});

describe('outbox storage', () => {
  test('loadOutbox returns [] when empty', async () => {
    expect(await loadOutbox()).toEqual([]);
  });
  test('saveOutbox then loadOutbox round-trips', async () => {
    const items = [
      {
        url: 'https://x',
        headers: { Authorization: null },
        payload: { a: 1 },
        ts: new Date().toISOString(),
      },
    ];
    await saveOutbox(items);
    expect(await loadOutbox()).toEqual(items);
  });
  test('loadOutbox returns [] on corrupt JSON', async () => {
    memStore.set('inventory_outbox', 'oops');
    expect(await loadOutbox()).toEqual([]);
  });
});

test('storage keys are stable (regression)', () => {
  expect(uuidv4().length).toBeGreaterThan(0);
});
```

- [ ] **Step 2: Run the test — expect it to fail**

Run: `bun test __tests__/storage.test.ts`
Expected: FAIL — `Cannot find module '../lib/storage'`.

- [ ] **Step 3: Implement `lib/storage.ts`**

Create `lib/storage.ts` with:

```ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { OutboxItem, Profile } from './types';

export const STORAGE_PROFILE = 'inventory_profile';
export const STORAGE_OUTBOX = 'inventory_outbox';

export const loadProfile = async (): Promise<Profile | null> => {
  const raw = await AsyncStorage.getItem(STORAGE_PROFILE);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Profile;
  } catch {
    return null;
  }
};

export const saveProfile = async (profile: Profile): Promise<void> => {
  await AsyncStorage.setItem(STORAGE_PROFILE, JSON.stringify(profile));
};

export const clearProfile = async (): Promise<void> => {
  await AsyncStorage.removeItem(STORAGE_PROFILE);
};

export const loadOutbox = async (): Promise<OutboxItem[]> => {
  const raw = await AsyncStorage.getItem(STORAGE_OUTBOX);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as OutboxItem[];
    return parsed ?? [];
  } catch {
    return [];
  }
};

export const saveOutbox = async (items: OutboxItem[]): Promise<void> => {
  await AsyncStorage.setItem(STORAGE_OUTBOX, JSON.stringify(items));
};
```

- [ ] **Step 4: Run the test — expect it to pass**

Run: `bun test __tests__/storage.test.ts`
Expected: PASS — all 8 tests pass.

- [ ] **Step 5: Commit**

```bash
git add __tests__/storage.test.ts lib/storage.ts
git commit -m "feat(lib): add AsyncStorage wrappers with tests"
```

---

## Task 15: lib/outbox.ts + test (TDD)

**Files:**
- Create: `__tests__/outbox.test.ts`.
- Create: `lib/outbox.ts`.

- [ ] **Step 1: Write the failing test**

Create `__tests__/outbox.test.ts` with:

```ts
import { test, expect, describe, beforeEach, mock } from 'bun:test';
import { enqueueOutbox, drainOutbox } from '../lib/outbox';
import type { OutboxItem } from '../lib/types';

const baseItem: Omit<OutboxItem, 'ts'> = {
  url: 'https://example.test/submit',
  headers: { Authorization: 'Bearer t' },
  payload: { orderNo: '1', recordingNo: 1, locationCode: 'A', packageNo: 'P', quantity: 0, packageIntact: true },
};

describe('enqueueOutbox', () => {
  test('appends a new item with an ISO timestamp', () => {
    const before = new Date().toISOString();
    const next = enqueueOutbox([], { ...baseItem });
    expect(next).toHaveLength(1);
    expect(next[0].ts >= before).toBe(true);
    expect(next[0].url).toBe(baseItem.url);
  });
  test('does not mutate the input array', () => {
    const original: OutboxItem[] = [];
    enqueueOutbox(original, { ...baseItem });
    expect(original).toHaveLength(0);
  });
});

describe('drainOutbox', () => {
  let originalFetch: typeof fetch;
  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });
  test('removes successfully POSTed items', async () => {
    globalThis.fetch = mock(async () =>
      new Response('{}', { status: 200 })
    ) as unknown as typeof fetch;
    const items: OutboxItem[] = [
      { ...baseItem, ts: '2025-01-01T00:00:00.000Z' },
    ];
    const result = await drainOutbox(items);
    expect(result.success).toBe(1);
    expect(result.remaining).toEqual([]);
  });
  test('keeps items on HTTP 500', async () => {
    globalThis.fetch = mock(async () =>
      new Response('boom', { status: 500 })
    ) as unknown as typeof fetch;
    const items: OutboxItem[] = [
      { ...baseItem, ts: '2025-01-01T00:00:00.000Z' },
    ];
    const result = await drainOutbox(items);
    expect(result.success).toBe(0);
    expect(result.remaining).toHaveLength(1);
  });
  test('keeps items on network error', async () => {
    globalThis.fetch = mock(async () => {
      throw new Error('offline');
    }) as unknown as typeof fetch;
    const items: OutboxItem[] = [
      { ...baseItem, ts: '2025-01-01T00:00:00.000Z' },
    ];
    const result = await drainOutbox(items);
    expect(result.success).toBe(0);
    expect(result.remaining).toHaveLength(1);
  });
  test('keeps items with non-http url', async () => {
    const items: OutboxItem[] = [
      { ...baseItem, url: 'notaurl', ts: '2025-01-01T00:00:00.000Z' },
    ];
    const result = await drainOutbox(items);
    expect(result.success).toBe(0);
    expect(result.remaining).toHaveLength(1);
  });
  test('mixed batch returns per-item result', async () => {
    let call = 0;
    globalThis.fetch = mock(async () => {
      call += 1;
      return new Response('{}', { status: call === 1 ? 200 : 500 });
    }) as unknown as typeof fetch;
    const items: OutboxItem[] = [
      { ...baseItem, ts: '2025-01-01T00:00:00.000Z' },
      { ...baseItem, ts: '2025-01-01T00:00:01.000Z' },
    ];
    const result = await drainOutbox(items);
    expect(result.success).toBe(1);
    expect(result.remaining).toHaveLength(1);
  });
  test('preserves Authorization header when present', async () => {
    let capturedAuth: string | null = null;
    globalThis.fetch = mock(async (_url: any, init: any) => {
      capturedAuth = init?.headers?.Authorization ?? null;
      return new Response('{}', { status: 200 });
    }) as unknown as typeof fetch;
    const items: OutboxItem[] = [
      { ...baseItem, ts: '2025-01-01T00:00:00.000Z' },
    ];
    await drainOutbox(items);
    expect(capturedAuth).toBe('Bearer t');
  });
});
```

- [ ] **Step 2: Run the test — expect it to fail**

Run: `bun test __tests__/outbox.test.ts`
Expected: FAIL — `Cannot find module '../lib/outbox'`.

- [ ] **Step 3: Implement `lib/outbox.ts`**

Create `lib/outbox.ts` with:

```ts
import { uuidv4 } from './uuid';
import type { OutboxItem } from './types';

export const enqueueOutbox = (
  current: OutboxItem[],
  item: Omit<OutboxItem, 'ts'>
): OutboxItem[] => [
  ...current,
  { ...item, ts: new Date().toISOString() },
];

export type DrainResult = {
  success: number;
  remaining: OutboxItem[];
};

export const drainOutbox = async (items: OutboxItem[]): Promise<DrainResult> => {
  let success = 0;
  const remaining: OutboxItem[] = [];
  for (const item of items) {
    const url = item.url ?? '';
    if (!url.startsWith('http')) {
      remaining.push(item);
      continue;
    }
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'x-ms-client-tracking-id': uuidv4(),
    };
    const auth = item.headers?.Authorization ?? '';
    if (auth) headers.Authorization = auth;
    try {
      const resp = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(item.payload ?? {}),
      });
      if (resp.status >= 200 && resp.status < 300) {
        success += 1;
      } else {
        remaining.push(item);
      }
    } catch {
      remaining.push(item);
    }
  }
  return { success, remaining };
};
```

- [ ] **Step 4: Run the test — expect it to pass**

Run: `bun test __tests__/outbox.test.ts`
Expected: PASS — all 7 tests pass.

- [ ] **Step 5: Commit**

```bash
git add __tests__/outbox.test.ts lib/outbox.ts
git commit -m "feat(lib): add outbox enqueue/drain with tests"
```

---

## Task 16: Run the full test suite as a baseline

**Files:** none.

- [ ] **Step 1: Run all tests**

Run: `bun test`
Expected: all tests pass (uuid 2, profile 11, storage 8, outbox 7 = 28 tests).

- [ ] **Step 2: Commit (no file changes, skip if nothing to add)**

```bash
git status
```

If clean, skip. Otherwise, commit any incidental changes (e.g., generated `.snapshots/`).

---

## Task 17: hooks/useCameraPermission.ts

**Files:**
- Create: `hooks/useCameraPermission.ts`.

- [ ] **Step 1: Write the file**

Create `hooks/useCameraPermission.ts` with:

```ts
import { Alert } from 'react-native';
import { useCameraPermissions } from 'expo-camera';

export const useCameraPermission = () => {
  const [permission, requestPermission] = useCameraPermissions();

  const ensure = async (): Promise<boolean> => {
    if (permission?.granted) return true;
    const response = await requestPermission();
    if (response.status !== 'granted') {
      Alert.alert(
        'Info',
        'Camera scanning requires permission. Please grant camera access or paste JSON instead.'
      );
      return false;
    }
    return true;
  };

  return { permission, ensure };
};
```

- [ ] **Step 2: Commit**

```bash
git add hooks/useCameraPermission.ts
git commit -m "feat(hooks): add useCameraPermission wrapper"
```

---

## Task 18: hooks/useProfile.ts

**Files:**
- Create: `hooks/useProfile.ts`.

- [ ] **Step 1: Write the file**

Create `hooks/useProfile.ts` with:

```ts
import { useCallback, useEffect, useState } from 'react';
import {
  clearProfile as clearProfileStorage,
  loadProfile,
  saveProfile,
} from '@/lib/storage';
import type { Profile } from '@/lib/types';

export const useProfile = () => {
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    void loadProfile().then(setProfile);
  }, []);

  const save = useCallback(async (next: Profile) => {
    await saveProfile(next);
    setProfile(next);
  }, []);

  const clear = useCallback(async () => {
    await clearProfileStorage();
    setProfile(null);
  }, []);

  const reload = useCallback(async () => {
    setProfile(await loadProfile());
  }, []);

  return { profile, save, clear, reload };
};
```

- [ ] **Step 2: Commit**

```bash
git add hooks/useProfile.ts
git commit -m "feat(hooks): add useProfile"
```

---

## Task 19: hooks/useOutbox.ts

**Files:**
- Create: `hooks/useOutbox.ts`.

- [ ] **Step 1: Write the file**

Create `hooks/useOutbox.ts` with:

```ts
import { useCallback, useEffect, useState } from 'react';
import { loadOutbox, saveOutbox as persistOutbox } from '@/lib/storage';
import { drainOutbox, enqueueOutbox } from '@/lib/outbox';
import type { OutboxItem } from '@/lib/types';

export const useOutbox = () => {
  const [outbox, setOutbox] = useState<OutboxItem[]>([]);

  useEffect(() => {
    void loadOutbox().then(setOutbox);
  }, []);

  const set = useCallback(async (next: OutboxItem[]) => {
    setOutbox(next);
    await persistOutbox(next);
  }, []);

  const enqueue = useCallback(
    async (item: Omit<OutboxItem, 'ts'>) => {
      const next = enqueueOutbox(outbox, item);
      await set(next);
    },
    [outbox, set]
  );

  const drain = useCallback(async () => {
    const result = await drainOutbox(outbox);
    await set(result.remaining);
    return result;
  }, [outbox, set]);

  const clear = useCallback(async () => {
    await set([]);
  }, [set]);

  const reload = useCallback(async () => {
    setOutbox(await loadOutbox());
  }, []);

  return { outbox, enqueue, drain, clear, reload, set };
};
```

- [ ] **Step 2: Commit**

```bash
git add hooks/useOutbox.ts
git commit -m "feat(hooks): add useOutbox"
```

---

## Task 20: components/ScanModal.tsx

**Files:**
- Create: `components/ScanModal.tsx`.

- [ ] **Step 1: Write the file**

Create `components/ScanModal.tsx` with:

```tsx
import React, { useEffect, useState } from 'react';
import { Modal, SafeAreaView, StyleSheet, View } from 'react-native';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { Button } from 'heroui-native';
import type { ScanMode } from '@/lib/types';

type Props = {
  visible: boolean;
  title: string;
  mode: ScanMode;
  onClose: () => void;
  onScan: (value: string) => boolean;
};

export const ScanModal = ({ visible, title, mode, onClose, onScan }: Props) => {
  const [handled, setHandled] = useState(false);
  const [permission] = useCameraPermissions();

  useEffect(() => {
    if (!visible) setHandled(false);
  }, [visible]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Button variant="ghost" size="sm" onPress={onClose}>
            <Button.Label>{title}</Button.Label>
          </Button>
          <Button variant="outline" size="sm" onPress={onClose}>
            <Button.Label>Close</Button.Label>
          </Button>
        </View>
        <View style={styles.scanner}>
          {permission?.granted ? (
            <CameraView
              style={StyleSheet.absoluteFill}
              barcodeScannerSettings={
                mode === 'qr' ? { barcodeTypes: ['qr'] } : undefined
              }
              onBarcodeScanned={(event: BarcodeScanningResult) => {
                if (handled) return;
                if (!event?.data) return;
                setHandled(true);
                const shouldClose = onScan(event.data);
                if (shouldClose) onClose();
                else setHandled(false);
              }}
            />
          ) : (
            <Button onPress={onClose}>
              <Button.Label>Camera permission not granted</Button.Label>
            </Button>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#000' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
  },
  scanner: { flex: 1, margin: 16, overflow: 'hidden', borderRadius: 12 },
});
```

- [ ] **Step 2: Commit**

```bash
git add components/ScanModal.tsx
git commit -m "feat(components): add ScanModal with camera permission gate"
```

---

## Task 21: components/ProfileSummary.tsx

**Files:**
- Create: `components/ProfileSummary.tsx`.

- [ ] **Step 1: Write the file**

Create `components/ProfileSummary.tsx` with:

```tsx
import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Text } from 'heroui-native';

type Props = { children: string };

export const ProfileSummary = ({ children }: Props) => (
  <View className="rounded-md border border-border p-3 bg-background">
    <Text style={styles.code}>{children}</Text>
  </View>
);

const styles = StyleSheet.create({
  code: {
    fontFamily: Platform.select({
      ios: 'Menlo',
      android: 'monospace',
      default: 'monospace',
    }),
    fontSize: 12,
  },
});
```

- [ ] **Step 2: Commit**

```bash
git add components/ProfileSummary.tsx
git commit -m "feat(components): add ProfileSummary code block"
```

---

## Task 22: components/ResultBlock.tsx

**Files:**
- Create: `components/ResultBlock.tsx`.

- [ ] **Step 1: Write the file**

Create `components/ResultBlock.tsx` with:

```tsx
import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Text } from 'heroui-native';

type Props = { children: string };

export const ResultBlock = ({ children }: Props) => (
  <View className="rounded-md border border-border p-3 bg-background">
    <Text style={styles.code}>{children}</Text>
  </View>
);

const styles = StyleSheet.create({
  code: {
    fontFamily: Platform.select({
      ios: 'Menlo',
      android: 'monospace',
      default: 'monospace',
    }),
    fontSize: 12,
  },
});
```

- [ ] **Step 2: Commit**

```bash
git add components/ResultBlock.tsx
git commit -m "feat(components): add ResultBlock code block"
```

---

## Task 23: Delete App.tsx and index.ts

**Files:**
- Delete: `App.tsx`.
- Delete: `index.ts`.

- [ ] **Step 1: Delete the files**

Run: `rm App.tsx index.ts`
Expected: both files removed.

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "chore: remove old App.tsx and index.ts (replaced by app/)"
```

---

## Task 24: app/_layout.tsx (root with provider)

**Files:**
- Create: `app/_layout.tsx`.

- [ ] **Step 1: Write the file**

Create `app/_layout.tsx` with:

```tsx
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { HeroUINativeProvider } from 'heroui-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <HeroUINativeProvider>
          <StatusBar style="dark" />
          <Stack screenOptions={{ headerShown: false }} />
        </HeroUINativeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/_layout.tsx
git commit -m "feat(app): add root layout with HeroUINativeProvider and Stack"
```

---

## Task 25: app/(tabs)/_layout.tsx

**Files:**
- Create: `app/(tabs)/_layout.tsx`.

- [ ] **Step 1: Write the file**

Create `app/(tabs)/_layout.tsx` with:

```tsx
import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: true }}>
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-circle-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="work"
        options={{
          title: 'Work',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="scan-circle-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="outbox"
        options={{
          title: 'Outbox',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="archive-outline" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add 'app/(tabs)/_layout.tsx'
git commit -m "feat(app): add tabs layout for Profile, Work, Outbox"
```

---

## Task 26: app/(tabs)/profile.tsx

**Files:**
- Create: `app/(tabs)/profile.tsx`.

- [ ] **Step 1: Write the file**

Create `app/(tabs)/profile.tsx` with:

```tsx
import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import {
  Button,
  Chip,
  Input,
  Label,
  Text,
  TextField,
  useToast,
} from 'heroui-native';
import { useProfile } from '@/hooks/useProfile';
import {
  parseJson,
  parseRecordingInfo,
  sanitizeEndpoint,
} from '@/lib/profile';
import { ProfileSummary } from '@/components/ProfileSummary';
import { ScanModal } from '@/components/ScanModal';
import type { RecordingInfo, ScanMode } from '@/lib/types';
import { useCameraPermission } from '@/hooks/useCameraPermission';

const ProfileTab = () => {
  const { toast } = useToast();
  const { profile, save, clear } = useProfile();
  const { ensure } = useCameraPermission();

  const [scannedApi, setScannedApi] = useState<string | null>(null);
  const [scannedInfo, setScannedInfo] = useState<RecordingInfo | null>(null);
  const [pasteJson, setPasteJson] = useState('');
  const [bearerToken, setBearerToken] = useState('');
  const [scanMode, setScanMode] = useState<ScanMode | null>(null);

  const hasBoth = Boolean(scannedApi && scannedInfo);

  const profileSummary = useMemo(() => {
    if (!profile) return '(No profile saved)';
    return JSON.stringify(
      {
        apiEndpoint: profile.apiEndpoint ?? '',
        orderNo: profile.orderNo ?? '',
        recordingNo: profile.recordingNo ?? '',
        locationCode: profile.locationCode ?? '',
        bearerToken: profile.bearerToken ? '(stored)' : '(none)',
      },
      null,
      2
    );
  }, [profile]);

  const handleQrText = useCallback((text: string) => {
    const obj = parseJson(text);
    if (!obj) return false;
    if (typeof obj.apiEndpoint === 'string') {
      setScannedApi(sanitizeEndpoint(obj.apiEndpoint));
      return true;
    }
    const info = parseRecordingInfo(obj);
    if (info) {
      setScannedInfo(info);
      return true;
    }
    return false;
  }, []);

  const onScanResult = useCallback(
    (data: string) => {
      const ok = handleQrText(data);
      if (!ok) {
        toast.show({ variant: 'warning', label: 'Not JSON — keep scanning…' });
      }
      return ok;
    },
    [handleQrText, toast]
  );

  const startScan = useCallback(
    async (mode: ScanMode) => {
      if (!(await ensure())) return;
      setScanMode(mode);
    },
    [ensure]
  );

  const onDetectPaste = useCallback(() => {
    const ok = handleQrText(pasteJson.trim());
    if (!ok) toast.show({ variant: 'warning', label: 'Not valid JSON' });
  }, [handleQrText, pasteJson, toast]);

  const onSave = useCallback(async () => {
    if (!scannedApi || !scannedInfo) return;
    await save({
      apiEndpoint: scannedApi,
      orderNo: scannedInfo.orderNo,
      recordingNo: scannedInfo.recordingNo,
      locationCode: scannedInfo.locationCode,
      bearerToken: bearerToken.trim() ? bearerToken.trim() : null,
    });
    toast.show({ variant: 'success', label: 'Profile saved' });
  }, [bearerToken, save, scannedApi, scannedInfo, toast]);

  const onClearSaved = useCallback(async () => {
    await clear();
    toast.show({ variant: 'default', label: 'Saved profile cleared' });
  }, [clear, toast]);

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="p-4 gap-4"
      keyboardShouldPersistTaps="handled"
    >
      <Text className="text-2xl font-bold">Recording Profile</Text>

      <View className="gap-3 rounded-xl border border-border p-4">
        <Text className="text-base font-semibold">1) Recording Profile</Text>
        <Text className="text-sm text-muted">
          Scan two QR codes in any order: API Endpoint and Recording Info. Then save.
        </Text>
        <View className="flex-row gap-2">
          <Chip variant={scannedApi ? 'success' : 'secondary'}>
            API: {scannedApi ? 'ready' : 'missing'}
          </Chip>
          <Chip variant={scannedInfo ? 'success' : 'secondary'}>
            Info: {scannedInfo ? 'ready' : 'missing'}
          </Chip>
        </View>
        <View className="flex-row flex-wrap gap-2">
          <Button size="sm" onPress={() => startScan('qr')}>
            <Button.Label>Scan QR</Button.Label>
          </Button>
          <Button
            size="sm"
            variant="outline"
            onPress={() => {
              setScannedApi(null);
              setScannedInfo(null);
            }}
          >
            <Button.Label>Reset</Button.Label>
          </Button>
        </View>

        <Text className="mt-2 font-semibold">Paste JSON instead</Text>
        <TextField>
          <Label>JSON</Label>
          <Input
            value={pasteJson}
            onChangeText={setPasteJson}
            placeholder='{"apiEndpoint":"https://…"} or {"orderNo":"1234","recordingNo":1,"locationCode":"FG HU"}'
            multiline
            autoCapitalize="none"
          />
        </TextField>
        <Button size="sm" variant="outline" onPress={onDetectPaste}>
          <Button.Label>Detect</Button.Label>
        </Button>

        <Text className="mt-2 font-semibold">Optional Bearer Token</Text>
        <TextField>
          <Label>Bearer token</Label>
          <Input
            value={bearerToken}
            onChangeText={setBearerToken}
            placeholder="Bearer token (optional)"
            secureTextEntry
            autoCapitalize="none"
          />
        </TextField>

        <View className="flex-row flex-wrap gap-2">
          <Button size="sm" isDisabled={!hasBoth} onPress={onSave}>
            <Button.Label>Save Profile</Button.Label>
          </Button>
          <Button size="sm" variant="outline" onPress={onClearSaved}>
            <Button.Label>Clear Saved Profile</Button.Label>
          </Button>
        </View>

        <Text className="mt-2 font-semibold">Current Profile</Text>
        <ProfileSummary>{profileSummary}</ProfileSummary>
      </View>

      {scanMode === 'qr' ? (
        <ScanModal
          visible
          title="Scan QR"
          mode="qr"
          onClose={() => setScanMode(null)}
          onScan={onScanResult}
        />
      ) : null}
    </ScrollView>
  );
};

export default ProfileTab;
```

- [ ] **Step 2: Commit**

```bash
git add 'app/(tabs)/profile.tsx'
git commit -m "feat(app): add Profile tab with scan, paste, and save"
```

---

## Task 27: app/(tabs)/work.tsx

**Files:**
- Create: `app/(tabs)/work.tsx`.

- [ ] **Step 1: Write the file**

Create `app/(tabs)/work.tsx` with:

```tsx
import React, { useCallback, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import {
  Button,
  Input,
  Label,
  Switch,
  Text,
  TextField,
  useToast,
} from 'heroui-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useProfile } from '@/hooks/useProfile';
import { useOutbox } from '@/hooks/useOutbox';
import { useCameraPermission } from '@/hooks/useCameraPermission';
import { sanitizeEndpoint } from '@/lib/profile';
import { ResultBlock } from '@/components/ResultBlock';
import { ScanModal } from '@/components/ScanModal';

const WorkTab = () => {
  const { toast } = useToast();
  const { profile } = useProfile();
  const { enqueue } = useOutbox();
  const { ensure } = useCameraPermission();

  const [packageNo, setPackageNo] = useState('');
  const [intact, setIntact] = useState(true);
  const [quantity, setQuantity] = useState(0);
  const [result, setResult] = useState('');
  const [scannerOpen, setScannerOpen] = useState(false);

  const onScanResult = useCallback(
    (data: string) => {
      const trimmed = data.trim();
      if (trimmed) setPackageNo(trimmed);
      return true;
    },
    []
  );

  const startScan = useCallback(async () => {
    if (!(await ensure())) return;
    setScannerOpen(true);
  }, [ensure]);

  const onSubmit = useCallback(async () => {
    setResult('');
    if (!profile) {
      toast.show({ variant: 'warning', label: 'Save a profile first.' });
      return;
    }
    const pkg = packageNo.trim();
    if (!pkg) {
      toast.show({ variant: 'warning', label: 'Package number required.' });
      return;
    }
    const url = sanitizeEndpoint(profile.apiEndpoint ?? '');
    if (!url.startsWith('http')) {
      toast.show({ variant: 'danger', label: 'Profile API endpoint invalid.' });
      return;
    }
    const payload = {
      orderNo: profile.orderNo,
      recordingNo: profile.recordingNo,
      locationCode: profile.locationCode,
      packageNo: pkg,
      quantity: intact ? 0 : quantity,
      packageIntact: intact,
    };
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
    const token = (profile.bearerToken ?? '').toString().trim();
    if (token) headers.Authorization = `Bearer ${token}`;
    try {
      const resp = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });
      const ct = resp.headers.get('content-type') ?? '';
      const bodyOut = ct.includes('application/json')
        ? JSON.stringify(await resp.json(), null, 2)
        : await resp.text();
      setResult(
        `POST ${url}\nPayload:\n${JSON.stringify(payload, null, 2)}\n\nResponse:\n{\n  "status": ${resp.status},\n  "ok": ${resp.status >= 200 && resp.status < 300},\n  "body": ${JSON.stringify(bodyOut)}\n}`
      );
    } catch (error) {
      await enqueue({
        url,
        headers: { Authorization: token ? `Bearer ${token}` : null },
        payload,
      });
      setResult(
        `Request failed (likely offline). Saved to queue.\n${(error as Error).toString()}`
      );
    }
  }, [enqueue, intact, packageNo, profile, quantity, toast]);

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="p-4 gap-4"
      keyboardShouldPersistTaps="handled"
    >
      <Text className="text-2xl font-bold">Work</Text>

      <View className="gap-3 rounded-xl border border-border p-4">
        <Text className="text-base font-semibold">2) Work</Text>
        <Text className="text-sm text-muted">
          Use your saved profile to submit package records.
        </Text>

        <View className="flex-row items-center gap-2">
          <View className="flex-1">
            <TextField>
              <Label>Package number</Label>
              <Input
                value={packageNo}
                onChangeText={setPackageNo}
                placeholder="Scan or type package number"
              />
            </TextField>
          </View>
          <Button size="sm" variant="outline" onPress={startScan}>
            <Button.Label>Scan</Button.Label>
          </Button>
        </View>

        <View className="flex-row items-center gap-3">
          <Switch isSelected={intact} onSelectedChange={setIntact} />
          <Text>Package intact</Text>
        </View>

        <View
          className="flex-row items-center gap-3"
          style={{ opacity: intact ? 0.5 : 1 }}
        >
          <Pressable
            disabled={intact}
            onPress={() => setQuantity((q) => Math.max(0, q - 1))}
            className="p-1"
          >
            <MaterialIcons name="remove-circle-outline" size={26} color="#444" />
          </Pressable>
          <View className="w-[120px]">
            <TextField>
              <Label>Quantity</Label>
              <Input
                value={String(quantity)}
                editable={false}
                className="text-center"
              />
            </TextField>
          </View>
          <Pressable
            disabled={intact}
            onPress={() => setQuantity((q) => q + 1)}
            className="p-1"
          >
            <MaterialIcons name="add-circle-outline" size={26} color="#444" />
          </Pressable>
        </View>

        <Button onPress={onSubmit}>
          <Button.Label>Submit</Button.Label>
        </Button>

        {result ? <ResultBlock>{result}</ResultBlock> : null}
      </View>

      {scannerOpen ? (
        <ScanModal
          visible
          title="Scan Package"
          mode="barcode"
          onClose={() => setScannerOpen(false)}
          onScan={onScanResult}
        />
      ) : null}
    </ScrollView>
  );
};

export default WorkTab;
```

- [ ] **Step 2: Commit**

```bash
git add 'app/(tabs)/work.tsx'
git commit -m "feat(app): add Work tab with submit and offline queue"
```

---

## Task 28: app/(tabs)/outbox.tsx

**Files:**
- Create: `app/(tabs)/outbox.tsx`.

- [ ] **Step 1: Write the file**

Create `app/(tabs)/outbox.tsx` with:

```tsx
import React, { useCallback, useState } from 'react';
import { ScrollView, View } from 'react-native';
import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  Text,
  useToast,
} from 'heroui-native';
import { useOutbox } from '@/hooks/useOutbox';

const OutboxTab = () => {
  const { toast } = useToast();
  const { outbox, drain, clear } = useOutbox();
  const [clearOpen, setClearOpen] = useState(false);

  const onSync = useCallback(async () => {
    if (!outbox.length) {
      toast.show({ variant: 'default', label: 'Nothing to sync' });
      return;
    }
    const result = await drain();
    toast.show({
      variant: result.success > 0 ? 'success' : 'default',
      label:
        result.success > 0
          ? `Synced ${result.success} item(s)`
          : 'Nothing synced',
    });
  }, [drain, outbox.length, toast]);

  const onClearConfirm = useCallback(async () => {
    await clear();
    setClearOpen(false);
    toast.show({ variant: 'default', label: 'Outbox cleared' });
  }, [clear, toast]);

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="p-4 gap-4"
    >
      <Text className="text-2xl font-bold">Offline Queue</Text>

      <View className="gap-3 rounded-xl border border-border p-4">
        <Text className="text-base font-semibold">Pending submissions</Text>
        <Text className="text-sm text-muted">Pending: {outbox.length}</Text>
        <View className="flex-row flex-wrap gap-2">
          <Button size="sm" variant="outline" onPress={onSync}>
            <Button.Label>Sync now</Button.Label>
          </Button>

          <Button
            size="sm"
            variant="outline"
            onPress={() => setClearOpen(true)}
          >
            <Button.Label>Clear</Button.Label>
          </Button>
        </View>
      </View>

      <Dialog isOpen={clearOpen} onOpenChange={setClearOpen}>
        <DialogPortal>
          <DialogOverlay />
          <DialogContent>
            <DialogClose variant="ghost" />
            <View className="mb-5 gap-1.5">
              <DialogTitle>Clear all pending submissions?</DialogTitle>
              <DialogDescription>
                This permanently removes every queued request.
              </DialogDescription>
            </View>
            <View className="flex-row justify-end gap-3">
              <Button
                size="sm"
                variant="ghost"
                onPress={() => setClearOpen(false)}
              >
                <Button.Label>Cancel</Button.Label>
              </Button>
              <Button size="sm" onPress={onClearConfirm}>
                <Button.Label>OK</Button.Label>
              </Button>
            </View>
          </DialogContent>
        </DialogPortal>
      </Dialog>
    </ScrollView>
  );
};

export default OutboxTab;
```

- [ ] **Step 2: Commit**

```bash
git add 'app/(tabs)/outbox.tsx'
git commit -m "feat(app): add Outbox tab with sync and HeroUI Native confirm dialog"
```

---

## Task 29: Update android-apk.yml

**Files:**
- Modify: `.github/workflows/android-apk.yml` — add `env: EXPO_NO_TELEMETRY: "1"` to the job.

- [ ] **Step 1: Patch the file**

Edit `.github/workflows/android-apk.yml` so the `android` job block begins with:

```yaml
  android:
    runs-on: ubuntu-latest
    env:
      EXPO_NO_TELEMETRY: "1"
    steps:
      - name: Checkout
        uses: actions/checkout@v4
```

(Other steps unchanged.)

- [ ] **Step 2: Verify the YAML is well-formed**

Run: `bun -e "const yaml = require('fs').readFileSync('.github/workflows/android-apk.yml','utf8'); console.log(yaml.includes('EXPO_NO_TELEMETRY'))"`
Expected: prints `true`.

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/android-apk.yml
git commit -m "chore(ci): disable Expo telemetry in APK build"
```

---

## Task 30: Update android-apk-release.yml

**Files:**
- Modify: `.github/workflows/android-apk-release.yml` — confirm/add `env: EXPO_NO_TELEMETRY: "1"` (it already has it; verify it is present, no change if so).

- [ ] **Step 1: Verify the env var is present**

Run: `grep -n EXPO_NO_TELEMETRY .github/workflows/android-apk-release.yml`
Expected: a line matching `EXPO_NO_TELEMETRY: "1"` is present.

- [ ] **Step 2: Commit (no change expected)**

```bash
git status
```

If clean, skip this commit. If a stray change is present (e.g., a previous partial edit), commit it with:

```bash
git add .github/workflows/android-apk-release.yml
git commit -m "chore(ci): confirm Expo telemetry disabled in release build"
```

---

## Task 31: Update README.md

**Files:**
- Modify: `README.md` (whole file).

- [ ] **Step 1: Write the new README**

Replace `README.md` with:

```markdown
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
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: update README for HeroUI Native + Expo Router, drop web"
```

---

## Task 32: Final local validation (no Android build)

**Files:** none.

- [ ] **Step 1: Run the full test suite**

Run: `bun test`
Expected: all tests pass (28 tests across `__tests__/uuid`, `__tests__/profile`, `__tests__/storage`, `__tests__/outbox`).

- [ ] **Step 2: Run typecheck**

Run: `bun run typecheck`
Expected: zero errors. (The `app/_layout.tsx`, `app/(tabs)/*`, `components/*`, `hooks/*`, `lib/*` files all type-check.)

- [ ] **Step 3: (Optional, may fail) attempt Expo Go smoke test**

Run: `bun run start`
If the bundler starts without errors, leave it running for ~30 seconds to confirm Metro bundles. Press `Ctrl-C` to exit. If the bundler errors (e.g., HeroUI Native native modules not in Expo Go), stop and rely on CI to verify.

- [ ] **Step 4: Verify working tree state**

Run: `git status`
Expected: clean working tree. If any incidental files were generated (e.g., `expo-env.d.ts`), commit them:

```bash
git add -A
git commit -m "chore: include generated Expo env file" --allow-empty
```

---

## Task 33: Push to remote and trigger CI

**Files:** none.

- [ ] **Step 1: Push the branch**

```bash
git push -u origin HEAD
```

- [ ] **Step 2: Confirm CI runs**

Open the repo's GitHub Actions tab and confirm both `android-apk` and `android-apk-release` workflows start. Do **not** download or run the APK locally; the artifacts are on GitHub.

- [ ] **Step 3: Final commit (if any cleanup is needed based on CI logs)**

If CI surfaces an issue, fix it locally, commit, and push again. The plan ends when both Android workflows pass.
