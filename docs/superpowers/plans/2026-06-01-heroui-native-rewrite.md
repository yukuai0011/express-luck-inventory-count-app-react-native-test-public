# HeroUI Native Rewrite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite the inventory app to use HeroUI Native with Expo Router; drop web support; produce a debug APK for Android.

**Architecture:** Pure logic in `lib/` (storage, submit, parse, outbox, types, scanBridge) + state in custom hooks + presentational components + file-based routes under `app/`. Scanner is a full-screen modal route; the Work and Outbox tabs share state through hooks. Light + dark via HeroUI Native's default theme + Uniwind.

**Tech Stack:** Expo SDK 54, React Native 0.81.5, React 19.2.6, HeroUI Native (latest beta), Expo Router 6, Uniwind (Tailwind v4 for RN), react-native-reanimated 4.1, react-native-worklets 0.5, react-native-gesture-handler 2.28, AsyncStorage, expo-camera, Bun (toolchain only).

**Spec:** `docs/superpowers/specs/2026-06-01-heroui-native-rewrite-design.md` (commit `508c75c`).

**Build env note:** Local machine has Zulu JDK 17 installed. If `assembleDebug` fails for any other reason (missing Android SDK, no `ANDROID_HOME`, Gradle download blocked), stop the local build and hand off to GitHub Actions (`.github/workflows/android-apk.yml`); the user will handle the push.

---

## Phase 0 — Strip the old stack

### Task 1: Remove Gluestack and web from `package.json` and `app.json`

**Files:**
- Modify: `package.json`
- Modify: `app.json`

- [ ] **Step 1: Edit `package.json` to remove Gluestack packages and react-dom**

Open `package.json` and replace its `dependencies` block with:

```json
"dependencies": {
  "@react-native-async-storage/async-storage": "^3.0.2",
  "@react-native-async-storage/expo-with-async-storage": "^1.0.0",
  "expo": "~54.0.33",
  "expo-camera": "~17.0.10",
  "expo-status-bar": "~3.0.9",
  "react": "19.2.6",
  "react-native": "0.81.5",
  "react-native-svg": "^15.15.4"
}
```

(We removed `@gluestack-ui/config`, `@gluestack-ui/themed`, and `react-dom`.)

- [ ] **Step 2: Edit `package.json` to update `main` and scripts**

Replace the `main` and `scripts` fields with:

```json
"main": "expo-router/entry",
"scripts": {
  "start": "expo start",
  "android": "expo start --android",
  "prebuild:android": "bunx expo prebuild --platform android --non-interactive",
  "build:android": "cd android && ./gradlew assembleDebug"
}
```

(We removed `ios` and `web` scripts.)

- [ ] **Step 3: Edit `app.json` to drop web, add scheme, and set the Android package**

Replace the entire contents of `app.json` with:

```json
{
  "expo": {
    "name": "Express Luck Inventory",
    "slug": "express-luck-inventory",
    "scheme": "expressluckinventory",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "automatic",
    "newArchEnabled": true,
    "splash": {
      "image": "./assets/splash-icon.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },
    "ios": {
      "supportsTablet": true,
      "infoPlist": {
        "NSCameraUsageDescription": "Allow camera access to scan QR codes and package barcodes."
      }
    },
    "android": {
      "package": "com.expressluck.inventory",
      "permissions": ["CAMERA"],
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#ffffff"
      },
      "edgeToEdgeEnabled": true,
      "predictiveBackGestureEnabled": false
    },
    "plugins": [
      "expo-router",
      "@react-native-async-storage/expo-with-async-storage"
    ]
  }
}
```

(We removed the `web` block, the `experiments.baseUrl` block, and added `scheme`, the Android `package`, the `expo-router` plugin, and set `userInterfaceStyle` to `automatic`.)

- [ ] **Step 4: Commit**

```bash
git add package.json app.json
git commit -m "chore: strip gluestack and web, add expo-router plugin and scheme"
```

### Task 2: Delete the old root files

**Files:**
- Delete: `App.tsx`
- Delete: `index.ts`
- Delete: `components/ui/`
- Delete: `assets/favicon.png`

- [ ] **Step 1: Delete the files**

```bash
git rm App.tsx index.ts assets/favicon.png
rm -rf components/ui
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "chore: remove old App.tsx, index.ts, and web favicon"
```

---

## Phase 1 — Install HeroUI Native and peers

### Task 3: Add HeroUI Native and its required peers

**Files:**
- Modify: `package.json` (dependencies)
- Modify: `bun.lock`

- [ ] **Step 1: Add HeroUI Native**

```bash
bun add heroui-native
```

- [ ] **Step 2: Add the required peer dependencies with the exact versions the HeroUI Native quick-start specifies**

```bash
bun add react-native-reanimated@^4.1.1 react-native-gesture-handler@^2.28.0 react-native-worklets@^0.5.1 react-native-safe-area-context@^5.6.0 tailwind-variants@^3.2.2 tailwind-merge@^3.4.0 react-native-screens@^4.16.0
```

(We already have `react-native-svg` from the old project; leave it as-is.)

- [ ] **Step 3: Add Expo Router and its helpers**

```bash
bun add expo-router expo-linking expo-constants
```

- [ ] **Step 4: Add Uniwind (dev dependency)**

```bash
bun add -d uniwind
```

- [ ] **Step 5: Verify the install resolves cleanly**

```bash
bun install
```

Expected: completes with no errors. If you see peer-dependency warnings about `react-native-svg`, it's because HeroUI Native asks for `^15.12.1` and the project already has `^15.15.4` — that's fine, the new version satisfies the constraint.

- [ ] **Step 6: Commit**

```bash
git add package.json bun.lock
git commit -m "chore: add heroui-native, expo-router, uniwind, and required peers"
```

---

## Phase 2 — Config files

### Task 4: Create `babel.config.js` with the Worklets plugin last

**Files:**
- Create: `babel.config.js`

- [ ] **Step 1: Create `babel.config.js` at the project root**

```js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: ['react-native-worklets/plugin'],
  };
};
```

(For reanimated v4 the correct plugin is `react-native-worklets/plugin`, **not** `react-native-reanimated/plugin`. It must be the **last** plugin in the list.)

- [ ] **Step 2: Commit**

```bash
git add babel.config.js
git commit -m "chore: add babel config with react-native-worklets plugin"
```

### Task 5: Create `metro.config.js` with Uniwind and Reanimated wrappers

**Files:**
- Create: `metro.config.js`

- [ ] **Step 1: Create `metro.config.js` at the project root**

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

- [ ] **Step 2: Commit**

```bash
git add metro.config.js
git commit -m "chore: add metro config with uniwind and reanimated wrappers"
```

### Task 6: Create `global.css`

**Files:**
- Create: `global.css`

- [ ] **Step 1: Create `global.css` at the project root**

```css
@import 'tailwindcss';
@import 'uniwind';
@import 'heroui-native/styles';
@source './node_modules/heroui-native/lib';
```

- [ ] **Step 2: Commit**

```bash
git add global.css
git commit -m "chore: add global.css with tailwind, uniwind, and heroui-native styles"
```

### Task 7: Update `tsconfig.json` to add Expo Router types

**Files:**
- Modify: `tsconfig.json`

- [ ] **Step 1: Replace `tsconfig.json` with**

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "types": ["expo-router/types"]
  },
  "include": [
    "**/*.ts",
    "**/*.tsx",
    ".expo/types/**/*.ts",
    "expo-env.d.ts"
  ]
}
```

- [ ] **Step 2: Commit**

```bash
git add tsconfig.json
git commit -m "chore: add expo-router types to tsconfig"
```

---

## Phase 3 — Pure logic in `lib/`

Each `lib/` module is small, focused, and unit-testable. We verify each by running a tiny ad-hoc test script (no Jest in this project — matches the existing convention).

### Task 8: Create `lib/types.ts`

**Files:**
- Create: `lib/types.ts`

- [ ] **Step 1: Create the file**

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

export type SubmitResult = {
  ok: boolean;
  status: number;
  body: string;
};
```

- [ ] **Step 2: Commit**

```bash
git add lib/types.ts
git commit -m "feat(lib): add shared types"
```

### Task 9: Create `lib/parse.ts` with a self-test

**Files:**
- Create: `lib/parse.ts`

- [ ] **Step 1: Create the file**

```ts
export const parseJson = (text: string): Record<string, unknown> | null => {
  try {
    const v = JSON.parse(text);
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      return v as Record<string, unknown>;
    }
    return null;
  } catch {
    return null;
  }
};

export const parseRecordingInfo = (
  value: Record<string, unknown>,
): { orderNo: string; recordingNo: number; locationCode: string } | null => {
  const orderNo = `${value.orderNo ?? ''}`.trim();
  const locationCode = `${value.locationCode ?? ''}`.trim();
  const recordingNo = Number(value.recordingNo);
  if (!orderNo || !locationCode || Number.isNaN(recordingNo)) return null;
  return { orderNo, recordingNo: Math.trunc(recordingNo), locationCode };
};

export const sanitizeEndpoint = (input: string): string => {
  let value = input.trim();
  if (value.startsWith('<') && value.endsWith('>')) {
    value = value.slice(1, -1);
  }
  return value;
};
```

- [ ] **Step 2: Smoke-test the parsers with a one-off Bun script**

```bash
bun -e "
import { parseJson, parseRecordingInfo, sanitizeEndpoint } from './lib/parse.ts';

let pass = 0, fail = 0;
const t = (name, cond) => { if (cond) { pass++; console.log('ok  ' + name); } else { fail++; console.log('FAIL ' + name); } };

t('parseJson ok', JSON.stringify(parseJson('{\"a\":1}')) === '{\"a\":1}');
t('parseJson null on garbage', parseJson('not json') === null);
t('parseJson null on array', parseJson('[1,2]') === null);

const info = parseRecordingInfo({ orderNo: 'O1', recordingNo: 7, locationCode: 'FG HU' });
t('parseRecordingInfo valid', info?.orderNo === 'O1' && info?.recordingNo === 7 && info?.locationCode === 'FG HU');

t('parseRecordingInfo missing field', parseRecordingInfo({ orderNo: 'O1', recordingNo: 7 }) === null);
t('parseRecordingInfo bad number', parseRecordingInfo({ orderNo: 'O1', recordingNo: 'x', locationCode: 'FG' }) === null);

t('sanitizeEndpoint trim', sanitizeEndpoint('  https://x  ') === 'https://x');
t('sanitizeEndpoint strip', sanitizeEndpoint('<https://x>') === 'https://x');

console.log(pass + ' pass, ' + fail + ' fail');
if (fail > 0) process.exit(1);
"
```

Expected: 8 lines starting with `ok  `, 0 `FAIL`, and `8 pass, 0 fail`.

- [ ] **Step 3: Commit**

```bash
git add lib/parse.ts
git commit -m "feat(lib): add json/recording-info/endpoint parsers"
```

### Task 10: Create `lib/storage.ts` with a self-test

**Files:**
- Create: `lib/storage.ts`

- [ ] **Step 1: Create the file**

```ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { OutboxItem, Profile } from './types';

const STORAGE_PROFILE = 'inventory_profile';
const STORAGE_OUTBOX = 'inventory_outbox';

export async function loadProfile(): Promise<Profile | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_PROFILE);
    if (!raw) return null;
    return JSON.parse(raw) as Profile;
  } catch {
    return null;
  }
}

export async function saveProfile(p: Profile): Promise<void> {
  await AsyncStorage.setItem(STORAGE_PROFILE, JSON.stringify(p));
}

export async function clearProfile(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_PROFILE);
}

export async function loadOutbox(): Promise<OutboxItem[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_OUTBOX);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as OutboxItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function saveOutbox(items: OutboxItem[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_OUTBOX, JSON.stringify(items));
}
```

- [ ] **Step 2: Type-check is deferred to Task 29**

- [ ] **Step 3: Commit**

```bash
git add lib/storage.ts
git commit -m "feat(lib): add AsyncStorage wrappers for profile and outbox"
```

### Task 11: Create `lib/submit.ts` with a self-test

**Files:**
- Create: `lib/submit.ts`

- [ ] **Step 1: Create the file**

```ts
import type { SubmitResult } from './types';

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

export async function submitRecord(
  url: string,
  bearerToken: string | null | undefined,
  payload: Record<string, unknown>,
): Promise<SubmitResult> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'x-ms-client-tracking-id': uuidv4(),
  };
  const token = (bearerToken ?? '').toString().trim();
  if (token) headers.Authorization = `Bearer ${token}`;

  const resp = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });
  const ct = resp.headers.get('content-type') ?? '';
  const body = ct.includes('application/json')
    ? JSON.stringify(await resp.json())
    : await resp.text();

  return {
    ok: resp.status >= 200 && resp.status < 300,
    status: resp.status,
    body,
  };
}
```

- [ ] **Step 2: Smoke-test `uuidv4` shape**

```bash
bun -e "
import { uuidv4 } from './lib/submit.ts';
const re = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
let pass = 0, fail = 0;
for (let i = 0; i < 100; i++) {
  if (re.test(uuidv4())) pass++; else { fail++; console.log('bad uuid', uuidv4()); }
}
console.log(pass + ' pass, ' + fail + ' fail');
if (fail > 0) process.exit(1);
"
```

Expected: `100 pass, 0 fail`.

- [ ] **Step 3: Commit**

```bash
git add lib/submit.ts
git commit -m "feat(lib): add submitRecord and uuidv4"
```

### Task 12: Create `lib/outbox.ts` with a self-test

**Files:**
- Create: `lib/outbox.ts`

- [ ] **Step 1: Create the file**

```ts
import { submitRecord } from './submit';
import type { OutboxItem } from './types';

export const enqueue = (item: OutboxItem, current: OutboxItem[]): OutboxItem[] => {
  return [...current, item];
};

export const clearOutbox = (): OutboxItem[] => [];

export async function syncOutbox(
  items: OutboxItem[],
): Promise<{ synced: OutboxItem[]; remaining: OutboxItem[] }> {
  const synced: OutboxItem[] = [];
  const remaining: OutboxItem[] = [];
  for (const item of items) {
    const url = item.url ?? '';
    if (!url.startsWith('http')) {
      remaining.push(item);
      continue;
    }
    try {
      const auth = item.headers?.Authorization ?? null;
      const result = await submitRecord(url, auth, item.payload ?? {});
      if (result.ok) {
        synced.push(item);
      } else {
        remaining.push(item);
      }
    } catch {
      remaining.push(item);
    }
  }
  return { synced, remaining };
}
```

- [ ] **Step 2: Smoke-test `enqueue` and `clearOutbox` (pure functions)**

```bash
bun -e "
import { enqueue, clearOutbox } from './lib/outbox.ts';
let pass = 0, fail = 0;
const t = (name, cond) => { if (cond) { pass++; console.log('ok  ' + name); } else { fail++; console.log('FAIL ' + name); } };

const start = [];
const item = { url: 'https://x', headers: {}, payload: {}, ts: 'now' };
const next = enqueue(item, start);
t('enqueue length', next.length === 1);
t('enqueue immutability', next !== start);
t('enqueue same item', next[0] === item);
t('clearOutbox empty', clearOutbox().length === 0);

console.log(pass + ' pass, ' + fail + ' fail');
if (fail > 0) process.exit(1);
"
```

Expected: `4 pass, 0 fail`.

- [ ] **Step 3: Commit**

```bash
git add lib/outbox.ts
git commit -m "feat(lib): add enqueue, clearOutbox, syncOutbox"
```

### Task 13: Create `lib/scanBridge.ts`

**Files:**
- Create: `lib/scanBridge.ts`

- [ ] **Step 1: Create the file**

```ts
let handler: ((value: string) => void) | null = null;

export const registerScanHandler = (fn: (value: string) => void): void => {
  handler = fn;
};

export const consumeScanHandler = (): ((value: string) => void) | null => {
  const h = handler;
  handler = null;
  return h;
};
```

- [ ] **Step 2: Commit**

```bash
git add lib/scanBridge.ts
git commit -m "feat(lib): add scan bridge for cross-route scan callback"
```

---

## Phase 4 — Custom hooks

### Task 14: Create `hooks/useProfile.ts`

**Files:**
- Create: `hooks/useProfile.ts`

- [ ] **Step 1: Create the file**

```ts
import { useCallback, useEffect, useMemo, useState } from 'react';
import { clearProfile as clear, loadProfile, saveProfile } from '../lib/storage';
import type { Profile } from '../lib/types';

export function useProfile() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const p = await loadProfile();
      if (!cancelled) {
        setProfile(p);
        setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const persist = useCallback(async (next: Profile) => {
    setProfile(next);
    await saveProfile(next);
  }, []);

  const reset = useCallback(async () => {
    setProfile(null);
    await clear();
  }, []);

  const summary = useMemo(() => {
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
      2,
    );
  }, [profile]);

  return { profile, loaded, setProfile: persist, clearProfile: reset, summary };
}
```

- [ ] **Step 2: Commit**

```bash
git add hooks/useProfile.ts
git commit -m "feat(hooks): add useProfile hook"
```

### Task 15: Create `hooks/useOutbox.ts`

**Files:**
- Create: `hooks/useOutbox.ts`

- [ ] **Step 1: Create the file**

```ts
import { useCallback, useEffect, useState } from 'react';
import { enqueue as enqueuePure, syncOutbox } from '../lib/outbox';
import { loadOutbox, saveOutbox } from '../lib/storage';
import type { OutboxItem } from '../lib/types';

export function useOutbox() {
  const [outbox, setOutbox] = useState<OutboxItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const items = await loadOutbox();
      if (!cancelled) {
        setOutbox(items);
        setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const enqueue = useCallback(
    async (item: OutboxItem) => {
      const next = enqueuePure(item, outbox);
      setOutbox(next);
      await saveOutbox(next);
    },
    [outbox],
  );

  const sync = useCallback(async (): Promise<number> => {
    const { synced, remaining } = await syncOutbox(outbox);
    setOutbox(remaining);
    await saveOutbox(remaining);
    return synced.length;
  }, [outbox]);

  const clear = useCallback(async () => {
    setOutbox([]);
    await saveOutbox([]);
  }, []);

  return { outbox, loaded, enqueue, sync, clear };
}
```

- [ ] **Step 2: Commit**

```bash
git add hooks/useOutbox.ts
git commit -m "feat(hooks): add useOutbox hook"
```

---

## Phase 5 — Reusable components

### Task 16: Create `components/Pill.tsx`

**Files:**
- Create: `components/Pill.tsx`

- [ ] **Step 1: Create the file**

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

- [ ] **Step 2: Commit**

```bash
git add components/Pill.tsx
git commit -m "feat(ui): add Pill status chip"
```

### Task 17: Create `components/ResultCard.tsx`

**Files:**
- Create: `components/ResultCard.tsx`

- [ ] **Step 1: Create the file**

```tsx
import { Card, Text } from 'heroui-native';
import { Platform, ScrollView } from 'react-native';

export function ResultCard({ children }: { children: string }) {
  return (
    <Card variant="flat" className="border border-separator">
      <Card.Body className="p-3">
        <ScrollView horizontal showsHorizontalScrollIndicator>
          <Text
            style={{
              fontFamily: Platform.select({
                ios: 'Menlo',
                android: 'monospace',
                default: 'monospace',
              }),
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

- [ ] **Step 2: Commit**

```bash
git add components/ResultCard.tsx
git commit -m "feat(ui): add ResultCard for inline JSON output"
```

### Task 18: Create `components/ProfileForm.tsx`

**Files:**
- Create: `components/ProfileForm.tsx`

- [ ] **Step 1: Create the file**

```tsx
import { useCallback, useState } from 'react';
import { router } from 'expo-router';
import {
  Button,
  Card,
  HStack,
  Separator,
  Text,
  TextArea,
  TextField,
  useToast,
} from 'heroui-native';
import { parseJson, parseRecordingInfo, sanitizeEndpoint } from '../lib/parse';
import { registerScanHandler } from '../lib/scanBridge';
import type { RecordingInfo } from '../lib/types';
import { Pill } from './Pill';
import { ResultCard } from './ResultCard';

type Props = {
  scannedApi: string | null;
  scannedInfo: RecordingInfo | null;
  setScannedApi: (v: string | null) => void;
  setScannedInfo: (v: RecordingInfo | null) => void;
  bearerToken: string;
  setBearerToken: (v: string) => void;
  onSave: (api: string, info: RecordingInfo, token: string) => void;
  onClear: () => void;
  summary: string;
};

export function ProfileForm({
  scannedApi,
  scannedInfo,
  setScannedApi,
  setScannedInfo,
  bearerToken,
  setBearerToken,
  onSave,
  onClear,
  summary,
}: Props) {
  const toast = useToast();
  const [pasteJson, setPasteJson] = useState('');

  const handleQrText = useCallback(
    (text: string) => {
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
    },
    [setScannedApi, setScannedInfo],
  );

  const openQrScanner = useCallback(() => {
    registerScanHandler((value) => {
      const ok = handleQrText(value);
      if (!ok) {
        toast.show({ placement: 'top', variant: 'default', message: 'Not JSON or unexpected structure' });
      }
    });
    router.push('/(modal)/scan?mode=qr');
  }, [handleQrText, toast]);

  const onDetectPaste = useCallback(() => {
    const ok = handleQrText(pasteJson.trim());
    if (!ok) {
      toast.show({ placement: 'top', variant: 'default', message: 'Not valid JSON or unexpected format' });
    }
  }, [handleQrText, pasteJson, toast]);

  const onReset = useCallback(() => {
    setScannedApi(null);
    setScannedInfo(null);
    toast.show({ placement: 'top', variant: 'default', message: 'Reset' });
  }, [setScannedApi, setScannedInfo, toast]);

  const canSave = Boolean(scannedApi && scannedInfo);

  return (
    <Card>
      <Card.Header>
        <Card.Title>Recording Profile</Card.Title>
        <Card.Description>
          Scan two QR codes in any order to establish a profile: API Endpoint and Recording Info. Then save.
        </Card.Description>
      </Card.Header>
      <Card.Body className="gap-3">
        <HStack className="gap-2 flex-wrap">
          <Pill ok={Boolean(scannedApi)} label={`API Endpoint: ${scannedApi ? 'ready' : 'missing'}`} />
          <Pill ok={Boolean(scannedInfo)} label={`Recording Info: ${scannedInfo ? 'ready' : 'missing'}`} />
        </HStack>

        <HStack className="gap-2 flex-wrap">
          <Button onPress={openQrScanner}>
            <Button.Label>Scan QR</Button.Label>
          </Button>
          <Button variant="tertiary" onPress={onReset}>
            <Button.Label>Reset</Button.Label>
          </Button>
        </HStack>

        <Separator className="my-1" />

        <Text className="text-foreground">Paste JSON instead</Text>
        <TextArea>
          <TextArea.Input
            value={pasteJson}
            onChangeText={setPasteJson}
            placeholder='{"apiEndpoint":"<https://...>"} or {"orderNo":"1234","recordingNo":1,"locationCode":"FG HU"}'
            autoCapitalize="none"
          />
        </TextArea>
        <Button variant="secondary" onPress={onDetectPaste}>
          <Button.Label>Detect</Button.Label>
        </Button>

        <Separator className="my-1" />

        <Text className="text-foreground">Advanced: Optional Bearer Token</Text>
        <TextField>
          <TextField.Input
            value={bearerToken}
            onChangeText={setBearerToken}
            placeholder="Bearer token (optional)"
            secureTextEntry
            autoCapitalize="none"
          />
        </TextField>

        <HStack className="gap-2 flex-wrap">
          <Button isDisabled={!canSave} onPress={() => onSave(scannedApi!, scannedInfo!, bearerToken)}>
            <Button.Label>Save Profile</Button.Label>
          </Button>
          <Button variant="tertiary" onPress={onClear}>
            <Button.Label>Clear Saved Profile</Button.Label>
          </Button>
        </HStack>

        <Text className="text-foreground">Current Profile</Text>
        <ResultCard>{summary}</ResultCard>
      </Card.Body>
    </Card>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/ProfileForm.tsx
git commit -m "feat(ui): add ProfileForm card"
```

### Task 19: Create `components/PackageForm.tsx`

**Files:**
- Create: `components/PackageForm.tsx`

- [ ] **Step 1: Create the file**

```tsx
import { useCallback } from 'react';
import { router } from 'expo-router';
import {
  Button,
  Card,
  HStack,
  IconButton,
  Label,
  Switch,
  TextField,
} from 'heroui-native';
import { registerScanHandler } from '../lib/scanBridge';

type Props = {
  packageNo: string;
  setPackageNo: (v: string) => void;
  intact: boolean;
  setIntact: (v: boolean) => void;
  quantity: number;
  setQuantity: (v: number) => void;
  onSubmit: () => void;
};

export function PackageForm({
  packageNo,
  setPackageNo,
  intact,
  setIntact,
  quantity,
  setQuantity,
  onSubmit,
}: Props) {
  const openBarcodeScanner = useCallback(() => {
    registerScanHandler((value) => {
      const trimmed = value.trim();
      if (trimmed) setPackageNo(trimmed);
    });
    router.push('/(modal)/scan?mode=barcode');
  }, [setPackageNo]);

  return (
    <Card>
      <Card.Header>
        <Card.Title>Work</Card.Title>
        <Card.Description>Use your saved profile to submit package records.</Card.Description>
      </Card.Header>
      <Card.Body className="gap-3">
        <HStack className="gap-2 items-center">
          <TextField className="flex-1">
            <TextField.Input
              value={packageNo}
              onChangeText={setPackageNo}
              placeholder="Scan or type package number"
            />
          </TextField>
          <Button variant="secondary" onPress={openBarcodeScanner}>
            <Button.Label>Scan</Button.Label>
          </Button>
        </HStack>

        <HStack className="gap-2 items-center">
          <Switch value={intact} onValueChange={setIntact} />
          <Label>Package intact</Label>
        </HStack>

        <HStack className="gap-2 items-center">
          <IconButton
            isDisabled={intact}
            onPress={() => setQuantity(Math.max(0, quantity - 1))}
            aria-label="Decrease quantity"
          >
            {/* If HeroUI Native's IconButton uses a child icon component, render it here.
                The implementing agent should call `mcp__heroui-native__get_component_docs({ components: ['IconButton'] })`
                and replace this comment block with the documented API (e.g. <IconButton.Icon name="remove" />). */}
            <Text>-</Text>
          </IconButton>
          <TextField className="w-32" isDisabled={intact}>
            <TextField.Input
              value={String(quantity)}
              editable={false}
              textAlign="center"
              placeholder="Quantity"
            />
          </TextField>
          <IconButton
            isDisabled={intact}
            onPress={() => setQuantity(quantity + 1)}
            aria-label="Increase quantity"
          >
            {/* Same HeroUI Native IconButton API as above. */}
            <Text>+</Text>
          </IconButton>
        </HStack>

        <Button onPress={onSubmit}>
          <Button.Label>Submit</Button.Label>
        </Button>
      </Card.Body>
    </Card>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/PackageForm.tsx
git commit -m "feat(ui): add PackageForm card"
```

### Task 20: Create `components/OutboxList.tsx`

**Files:**
- Create: `components/OutboxList.tsx`

- [ ] **Step 1: Create the file**

```tsx
import { Alert } from 'react-native';
import { Button, Card, HStack, Text, useToast } from 'heroui-native';

type Props = {
  count: number;
  empty: boolean;
  onSync: () => void;
  onClear: () => void;
};

export function OutboxList({ count, empty, onSync, onClear }: Props) {
  const toast = useToast();

  const confirmClear = () => {
    Alert.alert('Confirm', 'Clear all pending submissions?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'OK',
        style: 'destructive',
        onPress: async () => {
          await onClear();
          toast.show({ placement: 'top', variant: 'default', message: 'Queue cleared' });
        },
      },
    ]);
  };

  return (
    <Card>
      <Card.Header>
        <Card.Title>Offline queue</Card.Title>
        <Card.Description>Pending submissions: {count}</Card.Description>
      </Card.Header>
      <Card.Body className="gap-3">
        <HStack className="gap-2 flex-wrap">
          <Button variant="secondary" isDisabled={empty} onPress={onSync}>
            <Button.Label>Sync now</Button.Label>
          </Button>
          <Button variant="tertiary" isDisabled={empty} onPress={confirmClear}>
            <Button.Label>Clear</Button.Label>
          </Button>
        </HStack>
        {empty ? (
          <Text className="text-muted">No pending submissions.</Text>
        ) : null}
      </Card.Body>
    </Card>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/OutboxList.tsx
git commit -m "feat(ui): add OutboxList card"
```

---

## Phase 6 — Routes

### Task 21: Create the root layout `app/_layout.tsx`

**Files:**
- Create: `app/_layout.tsx`

- [ ] **Step 1: Create the file**

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

- [ ] **Step 2: Commit**

```bash
git add app/_layout.tsx
git commit -m "feat(app): add root layout with providers and stack"
```

### Task 22: Create the tabs layout `app/(tabs)/_layout.tsx`

**Files:**
- Create: `app/(tabs)/_layout.tsx`

- [ ] **Step 1: Create the file**

```tsx
import { Tabs } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        tabBarActiveTintColor: '#0a84ff',
      }}
    >
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="person" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="work"
        options={{
          title: 'Work',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="inventory-2" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="outbox"
        options={{
          title: 'Queue',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="cloud-queue" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add "app/(tabs)/_layout.tsx"
git commit -m "feat(app): add tabs layout with three screens"
```

### Task 23: Create the index redirect `app/(tabs)/index.tsx`

**Files:**
- Create: `app/(tabs)/index.tsx`

- [ ] **Step 1: Create the file**

```tsx
import { Redirect } from 'expo-router';

export default function Index() {
  return <Redirect href="/(tabs)/profile" />;
}
```

- [ ] **Step 2: Commit**

```bash
git add "app/(tabs)/index.tsx"
git commit -m "feat(app): redirect root to profile tab"
```

### Task 24: Create the Profile tab `app/(tabs)/profile.tsx`

**Files:**
- Create: `app/(tabs)/profile.tsx`

- [ ] **Step 1: Create the file**

```tsx
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useProfile } from '../../hooks/useProfile';
import { ProfileForm } from '../../components/ProfileForm';
import type { RecordingInfo } from '../../lib/types';
import { useToast } from 'heroui-native';

export default function ProfileScreen() {
  const { profile, summary, setProfile, clearProfile } = useProfile();
  const [scannedApi, setScannedApi] = useState<string | null>(null);
  const [scannedInfo, setScannedInfo] = useState<RecordingInfo | null>(null);
  const [bearerToken, setBearerToken] = useState(profile?.bearerToken ?? '');
  const toast = useToast();

  const onSave = async (api: string, info: RecordingInfo, token: string) => {
    await setProfile({
      apiEndpoint: api,
      orderNo: info.orderNo,
      recordingNo: info.recordingNo,
      locationCode: info.locationCode,
      bearerToken: token.trim() ? token.trim() : null,
    });
    toast.show({ placement: 'top', variant: 'success', message: 'Profile saved' });
  };

  const onClear = async () => {
    await clearProfile();
    setBearerToken('');
    setScannedApi(null);
    setScannedInfo(null);
  };

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="p-4"
      keyboardShouldPersistTaps="handled"
    >
      <View className="gap-3">
        <ProfileForm
          scannedApi={scannedApi}
          scannedInfo={scannedInfo}
          setScannedApi={setScannedApi}
          setScannedInfo={setScannedInfo}
          bearerToken={bearerToken}
          setBearerToken={setBearerToken}
          onSave={onSave}
          onClear={onClear}
          summary={summary}
        />
      </View>
    </ScrollView>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add "app/(tabs)/profile.tsx"
git commit -m "feat(app): add Profile tab screen"
```

### Task 25: Create the Work tab `app/(tabs)/work.tsx`

**Files:**
- Create: `app/(tabs)/work.tsx`

- [ ] **Step 1: Create the file**

```tsx
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useProfile } from '../../hooks/useProfile';
import { useOutbox } from '../../hooks/useOutbox';
import { PackageForm } from '../../components/PackageForm';
import { ResultCard } from '../../components/ResultCard';
import { sanitizeEndpoint } from '../../lib/parse';
import { submitRecord } from '../../lib/submit';
import type { OutboxItem } from '../../lib/types';

export default function WorkScreen() {
  const { profile } = useProfile();
  const { enqueue } = useOutbox();
  const [packageNo, setPackageNo] = useState('');
  const [intact, setIntact] = useState(true);
  const [quantity, setQuantity] = useState(0);
  const [result, setResult] = useState('');

  const onSubmit = async () => {
    setResult('');
    if (!profile) {
      setResult('No profile saved. Please create and save a profile first.');
      return;
    }
    const pkg = packageNo.trim();
    if (!pkg) {
      setResult('Package number is required.');
      return;
    }
    const url = sanitizeEndpoint(profile.apiEndpoint ?? '');
    if (!url.startsWith('http')) {
      setResult('Profile API endpoint is invalid.');
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
    try {
      const r = await submitRecord(url, profile.bearerToken, payload);
      setResult(
        `POST ${url}\nPayload:\n${JSON.stringify(payload, null, 2)}\n\nResponse:\n{\n  "status": ${r.status},\n  "ok": ${r.ok},\n  "body": ${JSON.stringify(r.body)}\n}`,
      );
      setPackageNo('');
      setQuantity(0);
      setIntact(true);
    } catch (error) {
      const queued: OutboxItem = {
        url,
        headers: { Authorization: profile.bearerToken ? `Bearer ${profile.bearerToken}` : null },
        payload,
        ts: new Date().toISOString(),
      };
      await enqueue(queued);
      setResult(`Request failed (likely offline). Saved to queue.\n${(error as Error).toString()}`);
    }
  };

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="p-4"
      keyboardShouldPersistTaps="handled"
    >
      <View className="gap-3">
        <PackageForm
          packageNo={packageNo}
          setPackageNo={setPackageNo}
          intact={intact}
          setIntact={setIntact}
          quantity={quantity}
          setQuantity={setQuantity}
          onSubmit={onSubmit}
        />
        {result ? <ResultCard>{result}</ResultCard> : null}
      </View>
    </ScrollView>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add "app/(tabs)/work.tsx"
git commit -m "feat(app): add Work tab screen with submit + queue-on-fail"
```

### Task 26: Create the Outbox tab `app/(tabs)/outbox.tsx`

**Files:**
- Create: `app/(tabs)/outbox.tsx`

- [ ] **Step 1: Create the file**

```tsx
import { ScrollView, View } from 'react-native';
import { useToast } from 'heroui-native';
import { useOutbox } from '../../hooks/useOutbox';
import { OutboxList } from '../../components/OutboxList';

export default function OutboxScreen() {
  const { outbox, sync, clear } = useOutbox();
  const toast = useToast();
  const empty = outbox.length === 0;

  const onSync = async () => {
    const n = await sync();
    toast.show({
      placement: 'top',
      variant: n > 0 ? 'success' : 'default',
      message: n > 0 ? `Synced ${n} item(s)` : 'Nothing synced',
    });
  };

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="p-4"
      keyboardShouldPersistTaps="handled"
    >
      <View className="gap-3">
        <OutboxList count={outbox.length} empty={empty} onSync={onSync} onClear={clear} />
      </View>
    </ScrollView>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add "app/(tabs)/outbox.tsx"
git commit -m "feat(app): add Outbox tab screen with sync and clear"
```

### Task 27: Create the scanner modal `app/(modal)/scan.tsx`

**Files:**
- Create: `app/(modal)/scan.tsx`

- [ ] **Step 1: Create the file**

```tsx
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { Button, CloseButton, Text, useToast } from 'heroui-native';
import { consumeScanHandler } from '../../lib/scanBridge';
import { parseJson, parseRecordingInfo, sanitizeEndpoint } from '../../lib/parse';

export default function ScanScreen() {
  const { mode } = useLocalSearchParams<{ mode?: 'qr' | 'barcode' }>();
  const isQr = mode === 'qr';
  const [permission, requestPermission] = useCameraPermissions();
  const [handled, setHandled] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (!permission) return;
    if (!permission.granted && permission.canAskAgain) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  const onClose = () => router.back();

  const onBarcode = (event: BarcodeScanningResult) => {
    if (handled) return;
    const value = event?.data;
    if (!value) return;
    setHandled(true);
    if (isQr) {
      const obj = parseJson(value);
      let ok = false;
      if (obj) {
        if (typeof obj.apiEndpoint === 'string') {
          sanitizeEndpoint(obj.apiEndpoint);
          ok = true;
        } else if (parseRecordingInfo(obj)) {
          ok = true;
        }
      }
      if (!ok) {
        toast.show({ placement: 'top', variant: 'default', message: 'Not JSON or unexpected structure; keep scanning…' });
        setHandled(false);
        return;
      }
    }
    consumeScanHandler()?.(value);
    onClose();
  };

  if (!permission) {
    return <View style={styles.center}><Text>Initializing…</Text></View>;
  }

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <View style={styles.deny}>
          <Text className="text-foreground">
            Camera permission is required to scan. Grant it in system settings, or paste JSON instead.
          </Text>
          <Button variant="secondary" onPress={onClose}>
            <Button.Label>Close</Button.Label>
          </Button>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <Text className="text-foreground">{isQr ? 'Scan QR' : 'Scan Package Barcode'}</Text>
        <CloseButton onPress={onClose} />
      </View>
      <View style={styles.cameraBox}>
        <CameraView
          style={StyleSheet.absoluteFillObject}
          barcodeScannerSettings={isQr ? { barcodeTypes: ['qr'] } : undefined}
          onBarcodeScanned={onBarcode}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 },
  deny: { gap: 12, alignItems: 'center' },
  topBar: {
    paddingTop: 48,
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#000',
  },
  cameraBox: { flex: 1, margin: 16, borderRadius: 12, overflow: 'hidden' },
});
```

- [ ] **Step 2: Commit**

```bash
git add "app/(modal)/scan.tsx"
git commit -m "feat(app): add full-screen scanner modal route"
```

---

## Phase 7 — README and final wiring

### Task 28: Update `README.md`

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Replace the contents of `README.md` with**

````markdown
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
````

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: update README for HeroUI Native rewrite"
```

### Task 29: Re-resolve dependencies and check the type-check

**Files:**
- Modify: `bun.lock`
- Modify: `package.json` (lockfile alignment)

- [ ] **Step 1: Re-resolve**

```bash
bun install
```

Expected: completes with no errors.

- [ ] **Step 2: Type-check the whole project**

```bash
bunx tsc --noEmit
```

Expected: no type errors. If there are errors, fix them in the offending file (most likely HeroUI Native prop names — see the `get_component_docs` MCP tool or [v3.heroui.com](https://v3.heroui.com)).

- [ ] **Step 3: Commit the lockfile if it changed**

```bash
git add bun.lock
git diff --cached --quiet || git commit -m "chore: refresh bun.lock after type-check"
```

### Task 30: Verify the Metro bundler can start

**Files:** (no file changes)

- [ ] **Step 1: Start the dev server in the background, wait 25 seconds, then kill it**

```bash
bun run start > /tmp/expo-start.log 2>&1 &
EXPO_PID=$!
sleep 25
kill $EXPO_PID 2>/dev/null || true
wait $EXPO_PID 2>/dev/null || true
tail -n 30 /tmp/expo-start.log
```

Expected: the log contains `Metro waiting` (or similar) and the process stays up for 25 seconds without erroring. If it exits with an error about missing peer deps, return to Task 3 and pin the missing peer; if it errors on a `heroui-native` import, run `bunx tsc --noEmit` again and fix the type errors.

- [ ] **Step 2: No commit**

(This is a verification step only.)

---

## Phase 8 — Android build

### Task 31: Run `expo prebuild` for Android

**Files:**
- Modify: `android/` (regenerated)

- [ ] **Step 1: Run the prebuild**

```bash
bun run prebuild:android
```

Expected: completes with no errors. The `android/` folder is regenerated; the `ios/` folder is not created because we passed `--platform android`.

- [ ] **Step 2: Commit the regenerated `android/` folder**

```bash
git add android
git commit -m "build(android): regenerate android/ via expo prebuild"
```

### Task 32: Build the debug APK

**Files:** (no source changes; produces `app-debug.apk`)

- [ ] **Step 1: Build**

```bash
cd android && ./gradlew assembleDebug
```

Expected (if the environment is set up): `BUILD SUCCESSFUL` and `android/app/build/outputs/apk/debug/app-debug.apk` exists.

- [ ] **Step 2: If the build fails:**

1. Capture the error message and the first 30 lines of the failed task output.
2. **Do not try to install Android SDK / NDK / `cmdline-tools` on this machine** — the user has explicitly said to fall back to CI in that case.
3. Verify the codebase is correctly wired (re-run `bunx tsc --noEmit`; confirm `app/_layout.tsx` wraps in `HeroUINativeProvider`; confirm `global.css` imports `heroui-native/styles`; confirm `metro.config.js` and `babel.config.js` exist with the right wrappers).
4. Hand off to the user: tell them to push the branch — the workflow at `.github/workflows/android-apk.yml` will produce `app-debug.apk` as a CI artifact.
5. Skip the `git tag` and `git push` steps; the user handles that.

- [ ] **Step 3: If the build succeeds, verify the APK exists**

```bash
ls -la android/app/build/outputs/apk/debug/app-debug.apk
```

Expected: file exists, size > 10 MB.

- [ ] **Step 4: No commit** (the build outputs are `.gitignore`d)

---

## Done

After Task 32 succeeds (locally or via CI), the rewrite is complete. Final checklist:

- [ ] `git log` shows all the commits from Phases 0–7 plus the prebuild commit.
- [ ] `bun run start` boots the dev server.
- [ ] APK is available at `android/app/build/outputs/apk/debug/app-debug.apk` (local) or as a CI artifact (remote).
- [ ] Manual smoke test from `docs/superpowers/specs/2026-06-01-heroui-native-rewrite-design.md` §8 passes.
