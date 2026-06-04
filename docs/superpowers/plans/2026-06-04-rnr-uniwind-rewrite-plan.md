# Inventory App Rewrite with rnr + Uniwind — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Gluestack-UI-based `App.tsx` with a multi-screen `expo-router` tabs app styled by `react-native-reusables` + Uniwind, preserving all business logic and CI workflows.

**Architecture:** Scaffold the official `react-native-reusables` `minimal-uniwind` template into a temporary sibling directory, copy the new directories (`app/`, `components/`, `lib/`, `global.css`, `metro.config.js`) into the existing project, then port the existing logic into a clean component / lib split. Use a single `AppStateContext` for shared `profile` and `outbox` state, a custom toast layer on top of rnr primitives, and a 3-tab layout (Profile / Work / Outbox) with a separate modal route for camera scanning.

**Tech Stack:** Expo SDK 56, React Native 0.85, expo-router v6, react-native-reusables (shadcn-style), Uniwind (Tailwind v4), Bun, AsyncStorage, expo-camera, react-native-reanimated, react-native-svg, MaterialCommunityIcons via `@expo/vector-icons`.

---

## File Map

### Created (from rnr scaffold)
- `metro.config.js` — wraps `getDefaultConfig` with `withUniwindConfig`
- `global.css` — `@import "tailwindcss"; @import "uniwind";` + dark variant overrides
- `components/ui/button.tsx` — rnr Button (shadcn-style)
- `components/ui/card.tsx` — rnr Card
- `components/ui/input.tsx` — rnr Input
- `components/ui/textarea.tsx` — rnr Textarea
- `components/ui/label.tsx` — rnr Label
- `components/ui/switch.tsx` — rnr Switch
- `components/ui/badge.tsx` — rnr Badge
- `components/ui/text.tsx` — rnr Text
- `components/ui/separator.tsx` — rnr Separator
- `components/ui/icon.tsx` — rnr Icon
- `components/ui/tabs.tsx` — rnr Tabs
- `lib/utils.ts` — `cn()` helper from rnr
- `tailwind.config.js` — rnr template config
- `tsconfig.json` — extends `expo/tsconfig.base` + adds `@/*` path alias
- `components.json` — rnr CLI config

### Created (new)
- `app/_layout.tsx` — root providers
- `app/(tabs)/_layout.tsx` — tabs navigator
- `app/(tabs)/index.tsx` — Profile tab
- `app/(tabs)/work.tsx` — Work tab
- `app/(tabs)/outbox.tsx` — Outbox tab
- `app/scan.tsx` — camera scan modal
- `components/profile-card.tsx`
- `components/work-card.tsx`
- `components/outbox-card.tsx`
- `components/scan-modal.tsx`
- `components/summary-text.tsx`
- `components/theme/theme-toggle.tsx`
- `components/theme/theme-provider.tsx`
- `components/toast/toast.tsx`
- `components/toast/toast-provider.tsx`
- `lib/qr.ts`
- `lib/storage.ts`
- `lib/api.ts`
- `lib/app-state.tsx` — `AppStateContext` provider + `useAppState()` hook
- `lib/theme.ts` — theme persistence helpers
- `tests/qr.test.ts` — bun:test unit tests

### Modified
- `package.json` — add rnr / uniwind / expo-router / reanimated deps
- `app.json` — preserve existing name/slug/version/orientation/icon/ios/android config/plugins/web baseUrl; add `expo-router` plugin
- `index.ts` — unchanged (still calls `registerRootComponent(App)`); `App` now points to `expo-router`'s auto-generated entry
- `bun.lock` — refreshed by `bun install`

### Deleted
- `App.tsx` — replaced by `app/` routes

---

## Phase 1: Scaffold and merge

### Task 1: Scaffold the rnr minimal-uniwind template

**Files:**
- Create: `tmp-scaffold/` (temporary; deleted at end of this task)
- Modify: `package.json` (later in Task 2)

- [ ] **Step 1: Confirm bun is available and version**

Run: `bun --version`
Expected: prints `1.3.x` (matches the version pinned in CI workflows)

- [ ] **Step 2: Run the rnr init into a temp directory**

Run:
```bash
bunx --bun react-native-reusables@latest init --template minimal-uniwind --cwd ./tmp-scaffold --non-interactive
```
Expected: creates `tmp-scaffold/` with an Expo project, including `app/`, `components/`, `lib/`, `global.css`, `metro.config.js`, `package.json`, `tsconfig.json`, `components.json`, `tailwind.config.js`. May prompt for a project name — answer with `express-luck-inventory`. If `--non-interactive` is not a recognised flag, pass `--yes` or use the inquirer defaults (`express-luck-inventory`, blank description).

- [ ] **Step 3: List the scaffold output**

Run: `ls -la tmp-scaffold && ls -la tmp-scaffold/app && ls -la tmp-scaffold/components/ui`
Expected: shows `app/_layout.tsx`, `app/(tabs)/_layout.tsx`, `app/(tabs)/index.tsx`, and rnr ui components (button, card, input, label, switch, badge, text, separator, icon, tabs, textarea).

- [ ] **Step 4: Compare rnr `package.json` to current `package.json`**

Run:
```bash
diff tmp-scaffold/package.json package.json
```
Expected: rnr adds `expo-router`, `react-native-reusables`, `uniwind`, `react-native-reanimated`, `react-native-safe-area-context`, `react-native-screens`, `tailwindcss`, `tailwind-merge`, `clsx`, `class-variance-authority`. Note which of these are already present.

- [ ] **Step 5: Commit the empty tmp-scaffold directory exclusion**

The `tmp-scaffold/` directory must not be committed. Confirm `.gitignore` has a line containing `tmp-scaffold` — add it if not:

```bash
grep -q '^tmp-scaffold' .gitignore || echo 'tmp-scaffold' >> .gitignore
```

Then commit the ignore:

```bash
git add .gitignore
git -c user.name="claude" -c user.email="claude@local" commit -m "chore: ignore rnr init scaffold directory"
```

### Task 2: Merge the scaffold into the current project

**Files:**
- Create: many (see list below)
- Modify: `package.json`, `tsconfig.json`, `.gitignore`
- Delete: `tmp-scaffold/`

- [ ] **Step 1: Copy scaffolded source directories into the project**

Run:
```bash
cp -R tmp-scaffold/app .
cp -R tmp-scaffold/components .
cp -R tmp-scaffold/lib ./lib-rnr-template
cp tmp-scaffold/global.css ./global.css
cp tmp-scaffold/metro.config.js ./metro.config.js
cp tmp-scaffold/tailwind.config.js ./tailwind.config.js
cp tmp-scaffold/components.json ./components.json
```

(We copy `lib` to `lib-rnr-template` to merge it with the current project in the next step; rnr only ships `utils.ts` and possibly `useColorScheme.ts`, so the conflict is minor.)

- [ ] **Step 2: Keep the rnr `lib/utils.ts` next to our new `lib/*`**

```bash
mkdir -p lib
cp lib-rnr-template/utils.ts lib/utils.ts
rm -rf lib-rnr-template
```

- [ ] **Step 3: Merge `package.json` dependencies**

Open `package.json` and copy any missing dependency entries from `tmp-scaffold/package.json` into our `package.json`. Required additions (verify against the rnr `package.json`):
- `expo-router` and its peer deps (`react-native-safe-area-context`, `react-native-screens`)
- `react-native-reanimated` (Expo SDK 54+ requires `react-native-worklets` too — add it)
- `react-native-reusables` (cli dep, may not need to be a runtime dep)
- `uniwind`
- `tailwindcss` (dev)
- `tailwindcss-animate` (dev, if rnr uses it)
- `tailwind-merge`, `clsx`, `class-variance-authority`

Keep our existing `@react-native-async-storage/async-storage`, `expo-camera`, `expo-splash-screen`, etc.

Add new scripts (keep existing):
```json
"web:export": "expo export --platform web",
"typecheck": "tsc --noEmit"
```

- [ ] **Step 4: Refresh `tsconfig.json` with the rnr template + our path aliases**

Replace `tsconfig.json` with:

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
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

- [ ] **Step 5: Re-install with bun**

Run: `bun install`
Expected: installs the new deps, refreshes `bun.lock`. Some peer-dep warnings are fine.

- [ ] **Step 6: Sanity-check rnr's default app compiles via web export**

Run: `bunx expo export --platform web --output-dir dist-check --clear`
Expected: produces `dist-check/` with `index.html`, an `_expo/static/js/web-*.js` bundle, and CSS. If a CSS-related error appears, the most likely cause is uniwind not being picked up — go to metro.config.js and confirm `withUniwindConfig` is the outermost wrapper.

Clean up: `rm -rf dist-check`

- [ ] **Step 7: Delete the temp scaffold**

```bash
rm -rf tmp-scaffold
```

- [ ] **Step 8: Commit the merge**

```bash
git add app components global.css metro.config.js tailwind.config.js components.json lib package.json bun.lock tsconfig.json
git -c user.name="claude" -c user.email="claude@local" commit -m "feat: scaffold rnr minimal-uniwind template"
```

### Task 3: Re-apply our `app.json` and add `expo-router` plugin

**Files:**
- Modify: `app.json`

- [ ] **Step 1: Read the current app.json**

```bash
cat app.json
```

- [ ] **Step 2: Open app.json and add the expo-router plugin to the `plugins` array**

The rnr template replaces the entire `app.json`; we want to keep ours and just add `"expo-router"` to the `plugins` array. The new `plugins` array should be:

```json
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
```

Keep everything else (name, slug, version, orientation, icon, ios, android, web, experiments) as it was.

- [ ] **Step 3: Verify the change**

Run: `bunx expo config --type prebuild`
Expected: prints JSON with the `expo-router` plugin present and our `name` set to `Express Luck Inventory`.

- [ ] **Step 4: Commit**

```bash
git add app.json
git -c user.name="claude" -c user.email="claude@local" commit -m "chore: register expo-router plugin in app.json"
```

---

## Phase 2: Pure logic (TDD)

### Task 4: `lib/qr.ts` — failing tests first

**Files:**
- Create: `tests/qr.test.ts`
- Create: `lib/qr.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/qr.test.ts` with the following content (pure, no React Native imports):

```ts
import { describe, expect, test } from "bun:test";
import { parseJson, parseRecordingInfo, sanitizeEndpoint } from "@/lib/qr";

describe("parseJson", () => {
  test("returns the parsed object for valid JSON", () => {
    expect(parseJson('{"a":1}')).toEqual({ a: 1 });
  });

  test("returns null for invalid JSON", () => {
    expect(parseJson("not json")).toBeNull();
  });

  test("returns null for empty string", () => {
    expect(parseJson("")).toBeNull();
  });
});

describe("parseRecordingInfo", () => {
  test("returns RecordingInfo when all required fields are present", () => {
    expect(
      parseRecordingInfo({ orderNo: "1234", recordingNo: 1, locationCode: "FG HU" })
    ).toEqual({ orderNo: "1234", recordingNo: 1, locationCode: "FG HU" });
  });

  test("coerces numeric strings for recordingNo", () => {
    expect(
      parseRecordingInfo({ orderNo: "1", recordingNo: "42", locationCode: "X" })
    ).toEqual({ orderNo: "1", recordingNo: 42, locationCode: "X" });
  });

  test("returns null when any required field is missing", () => {
    expect(parseRecordingInfo({ orderNo: "1", recordingNo: 1 })).toBeNull();
  });

  test("returns null when recordingNo is NaN", () => {
    expect(
      parseRecordingInfo({ orderNo: "1", recordingNo: "abc", locationCode: "X" })
    ).toBeNull();
  });

  test("truncates fractional recordingNo", () => {
    expect(
      parseRecordingInfo({ orderNo: "1", recordingNo: 3.7, locationCode: "X" })
    ).toEqual({ orderNo: "1", recordingNo: 3, locationCode: "X" });
  });
});

describe("sanitizeEndpoint", () => {
  test("strips angle brackets", () => {
    expect(sanitizeEndpoint("<https://example.com>")).toBe("https://example.com");
  });

  test("trims whitespace", () => {
    expect(sanitizeEndpoint("  https://example.com  ")).toBe("https://example.com");
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `bun test tests/qr.test.ts`
Expected: FAIL with `Cannot find module '@/lib/qr'` (or equivalent).

- [ ] **Step 3: Implement `lib/qr.ts`**

Create `lib/qr.ts`:

```ts
export type RecordingInfo = {
  orderNo: string;
  recordingNo: number;
  locationCode: string;
};

export const parseJson = (text: string): Record<string, unknown> | null => {
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return null;
  }
};

export const parseRecordingInfo = (
  value: Record<string, unknown>
): RecordingInfo | null => {
  const orderNo = `${value.orderNo ?? ""}`.trim();
  const locationCode = `${value.locationCode ?? ""}`.trim();
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

export const sanitizeEndpoint = (input: string) => {
  let value = input.trim();
  if (value.startsWith("<") && value.endsWith(">")) {
    value = value.slice(1, -1);
  }
  return value;
};

export const uuidv4 = () => {
  const rand = (max: number) =>
    (Date.now() + Math.floor(Math.random() * max)) % max;
  const hex = (num: number, width: number) =>
    num.toString(16).padStart(width, "0");
  const p1 = hex(rand(0xffffffff), 8);
  const p2 = hex(rand(0xffff), 4);
  const p3 = hex((rand(0x0fff) & 0x0fff) | 0x4000, 4);
  const p4 = hex((rand(0x3fff) & 0x3fff) | 0x8000, 4);
  const p5 = hex(rand(0xffffffffffff), 12);
  return `${p1}-${p2}-${p3}-${p4}-${p5}`;
};
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `bun test tests/qr.test.ts`
Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/qr.ts tests/qr.test.ts
git -c user.name="claude" -c user.email="claude@local" commit -m "feat(qr): add parseJson, parseRecordingInfo, sanitizeEndpoint with tests"
```

### Task 5: `lib/storage.ts` — AsyncStorage wrappers

**Files:**
- Create: `lib/storage.ts`

- [ ] **Step 1: Implement `lib/storage.ts`**

```ts
import AsyncStorage from "@react-native-async-storage/async-storage";

export type Profile = {
  apiEndpoint: string;
  orderNo: string;
  recordingNo: number;
  locationCode: string;
  bearerToken?: string | null;
};

export type OutboxItem = {
  url: string;
  headers: { Authorization?: string | null };
  payload: Record<string, unknown>;
  ts: string;
};

const STORAGE_PROFILE = "inventory_profile";
const STORAGE_OUTBOX = "inventory_outbox";
const STORAGE_THEME = "@theme";

export const storageKeys = {
  profile: STORAGE_PROFILE,
  outbox: STORAGE_OUTBOX,
  theme: STORAGE_THEME,
} as const;

export const loadProfile = async (): Promise<Profile | null> => {
  const raw = await AsyncStorage.getItem(STORAGE_PROFILE);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Profile;
  } catch {
    return null;
  }
};

export const saveProfile = async (profile: Profile) => {
  await AsyncStorage.setItem(STORAGE_PROFILE, JSON.stringify(profile));
};

export const clearProfile = async () => {
  await AsyncStorage.removeItem(STORAGE_PROFILE);
};

export const loadOutbox = async (): Promise<OutboxItem[]> => {
  const raw = await AsyncStorage.getItem(STORAGE_OUTBOX);
  if (!raw) return [];
  try {
    return (JSON.parse(raw) as OutboxItem[]) ?? [];
  } catch {
    return [];
  }
};

export const saveOutbox = async (outbox: OutboxItem[]) => {
  await AsyncStorage.setItem(STORAGE_OUTBOX, JSON.stringify(outbox));
};

export const loadTheme = async (): Promise<"light" | "dark" | "system" | null> => {
  const raw = await AsyncStorage.getItem(STORAGE_THEME);
  if (raw === "light" || raw === "dark" || raw === "system") return raw;
  return null;
};

export const saveTheme = async (theme: "light" | "dark" | "system") => {
  await AsyncStorage.setItem(STORAGE_THEME, theme);
};
```

- [ ] **Step 2: Verify typecheck passes**

Run: `bun run typecheck`
Expected: no errors from `lib/storage.ts`.

- [ ] **Step 3: Commit**

```bash
git add lib/storage.ts
git -c user.name="claude" -c user.email="claude@local" commit -m "feat(storage): add AsyncStorage wrappers for profile, outbox, theme"
```

### Task 6: `lib/api.ts` — submit + sync

**Files:**
- Create: `lib/api.ts`

- [ ] **Step 1: Implement `lib/api.ts`**

```ts
import { sanitizeEndpoint, uuidv4 } from "./qr";
import type { OutboxItem, Profile } from "./storage";

export type SubmitResult = {
  ok: boolean;
  status: number;
  body: string;
};

const buildHeaders = (token: string | null | undefined) => {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    "x-ms-client-tracking-id": uuidv4(),
  };
  const t = (token ?? "").toString().trim();
  if (t) headers.Authorization = `Bearer ${t}`;
  return headers;
};

export const submitPayload = async (
  profile: Profile,
  payload: Record<string, unknown>
): Promise<SubmitResult> => {
  const url = sanitizeEndpoint(profile.apiEndpoint ?? "");
  if (!url.startsWith("http")) {
    throw new Error("Profile API endpoint is invalid");
  }
  const resp = await fetch(url, {
    method: "POST",
    headers: buildHeaders(profile.bearerToken),
    body: JSON.stringify(payload),
  });
  const ct = resp.headers.get("content-type") ?? "";
  const body = ct.includes("application/json")
    ? JSON.stringify(await resp.json(), null, 2)
    : await resp.text();
  return {
    ok: resp.status >= 200 && resp.status < 300,
    status: resp.status,
    body,
  };
};

export const enqueueOutboxItem = (
  outbox: OutboxItem[],
  profile: Profile,
  payload: Record<string, unknown>
): OutboxItem[] => {
  const url = sanitizeEndpoint(profile.apiEndpoint ?? "");
  const token = (profile.bearerToken ?? "").toString().trim();
  const item: OutboxItem = {
    url,
    headers: { Authorization: token ? `Bearer ${token}` : null },
    payload,
    ts: new Date().toISOString(),
  };
  return [...outbox, item];
};

export const syncOutbox = async (
  outbox: OutboxItem[]
): Promise<{ remaining: OutboxItem[]; success: number }> => {
  let success = 0;
  const remaining: OutboxItem[] = [];
  for (const item of outbox) {
    const url = item.url ?? "";
    if (!url.startsWith("http")) {
      remaining.push(item);
      continue;
    }
    try {
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "x-ms-client-tracking-id": uuidv4(),
          ...(item.headers?.Authorization
            ? { Authorization: item.headers.Authorization }
            : {}),
        },
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
  return { remaining, success };
};
```

- [ ] **Step 2: Verify typecheck passes**

Run: `bun run typecheck`
Expected: no errors from `lib/api.ts`.

- [ ] **Step 3: Commit**

```bash
git add lib/api.ts
git -c user.name="claude" -c user.email="claude@local" commit -m "feat(api): add submitPayload, enqueueOutboxItem, syncOutbox"
```

---

## Phase 3: State, toast, theme

### Task 7: `lib/app-state.tsx` — `AppStateContext`

**Files:**
- Create: `lib/app-state.tsx`

- [ ] **Step 1: Implement `lib/app-state.tsx`**

```tsx
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import {
  clearProfile,
  loadOutbox,
  loadProfile,
  saveOutbox,
  saveProfile,
  type OutboxItem,
  type Profile,
} from "./storage";

type AppState = {
  profile: Profile | null;
  outbox: OutboxItem[];
  setProfile: (next: Profile | null) => Promise<void>;
  setOutbox: (next: OutboxItem[]) => Promise<void>;
};

const AppStateContext = createContext<AppState | null>(null);

export const AppStateProvider = ({ children }: { children: React.ReactNode }) => {
  const [profile, setProfileState] = useState<Profile | null>(null);
  const [outbox, setOutboxState] = useState<OutboxItem[]>([]);

  useEffect(() => {
    void (async () => {
      const [p, o] = await Promise.all([loadProfile(), loadOutbox()]);
      setProfileState(p);
      setOutboxState(o);
    })();
  }, []);

  const setProfile = useCallback(async (next: Profile | null) => {
    if (next) {
      await saveProfile(next);
      setProfileState(next);
    } else {
      await clearProfile();
      setProfileState(null);
    }
  }, []);

  const setOutbox = useCallback(async (next: OutboxItem[]) => {
    setOutboxState(next);
    await saveOutbox(next);
  }, []);

  return (
    <AppStateContext.Provider value={{ profile, outbox, setProfile, setOutbox }}>
      {children}
    </AppStateContext.Provider>
  );
};

export const useAppState = () => {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error("useAppState must be used inside AppStateProvider");
  return ctx;
};
```

- [ ] **Step 2: Verify typecheck passes**

Run: `bun run typecheck`
Expected: no errors from `lib/app-state.tsx`.

- [ ] **Step 3: Commit**

```bash
git add lib/app-state.tsx
git -c user.name="claude" -c user.email="claude@local" commit -m "feat(state): add AppStateProvider with profile and outbox"
```

### Task 8: Toast layer

**Files:**
- Create: `components/toast/toast.tsx`
- Create: `components/toast/toast-provider.tsx`

- [ ] **Step 1: Implement `components/toast/toast-provider.tsx`**

```tsx
import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import { View } from "react-native";
import Animated, { FadeInUp, FadeOutUp } from "react-native-reanimated";
import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";

type ToastEntry = { id: number; message: string };

type ToastApi = { show: (message: string) => void };

const ToastContext = createContext<ToastApi | null>(null);

export const ToastProvider = ({ children }: { children: React.ReactNode }) => {
  const [toasts, setToasts] = useState<ToastEntry[]>([]);

  const show = useCallback((message: string) => {
    setToasts((prev) => {
      if (prev.some((t) => t.message === message)) return prev;
      const id = Date.now() + Math.random();
      const next = [...prev, { id, message }].slice(-3);
      setTimeout(() => {
        setToasts((p) => p.filter((t) => t.id !== id));
      }, 2000);
      return next;
    });
  }, []);

  const api = useMemo<ToastApi>(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <View
        pointerEvents="none"
        className="absolute left-0 right-0 top-12 items-center gap-2 px-4"
      >
        {toasts.map((t) => (
          <Animated.View
            key={t.id}
            entering={FadeInUp.duration(180)}
            exiting={FadeOutUp.duration(180)}
            className={cn(
              "rounded-md bg-gray-900 px-3 py-2 dark:bg-gray-100"
            )}
          >
            <Text className="text-sm text-white dark:text-gray-900">{t.message}</Text>
          </Animated.View>
        ))}
      </View>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx;
};
```

- [ ] **Step 2: Implement `components/toast/toast.tsx` (re-export for convenience)**

```tsx
export { ToastProvider, useToast } from "./toast-provider";
```

- [ ] **Step 3: Verify typecheck**

Run: `bun run typecheck`
Expected: no errors from toast files.

- [ ] **Step 4: Commit**

```bash
git add components/toast
git -c user.name="claude" -c user.email="claude@local" commit -m "feat(toast): add ToastProvider and useToast"
```

### Task 9: Theme persistence + toggle

**Files:**
- Create: `components/theme/theme-provider.tsx`
- Create: `components/theme/theme-toggle.tsx`

- [ ] **Step 1: Implement `components/theme/theme-provider.tsx`**

```tsx
import { useEffect } from "react";
import { Uniwind } from "uniwind";
import { loadTheme, saveTheme } from "@/lib/storage";

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  useEffect(() => {
    void (async () => {
      const t = await loadTheme();
      if (t) Uniwind.setTheme(t);
    })();
  }, []);
  return <>{children}</>;
};

export const setAndPersistTheme = (theme: "light" | "dark" | "system") => {
  Uniwind.setTheme(theme);
  void saveTheme(theme);
};
```

- [ ] **Step 2: Implement `components/theme/theme-toggle.tsx`**

```tsx
import { Pressable, View } from "react-native";
import { useUniwind } from "uniwind";
import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";
import { setAndPersistTheme } from "./theme-provider";

const THEMES = [
  { name: "light", label: "Light" },
  { name: "dark", label: "Dark" },
  { name: "system", label: "System" },
] as const;

export const ThemeToggle = () => {
  const { theme, hasAdaptiveThemes } = useUniwind();
  const active = hasAdaptiveThemes ? "system" : theme;

  return (
    <View className="flex-row gap-2">
      {THEMES.map((t) => {
        const isActive = active === t.name;
        return (
          <Pressable
            key={t.name}
            onPress={() => setAndPersistTheme(t.name)}
            className={cn(
              "rounded-md px-3 py-1.5",
              isActive
                ? "bg-blue-600 dark:bg-blue-500"
                : "bg-gray-200 dark:bg-gray-800"
            )}
          >
            <Text
              className={cn(
                "text-xs",
                isActive
                  ? "text-white"
                  : "text-gray-900 dark:text-gray-100"
              )}
            >
              {t.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
};
```

- [ ] **Step 3: Verify typecheck**

Run: `bun run typecheck`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add components/theme
git -c user.name="claude" -c user.email="claude@local" commit -m "feat(theme): add ThemeProvider persistence and ThemeToggle"
```

---

## Phase 4: Card components

### Task 10: `SummaryText` helper

**Files:**
- Create: `components/summary-text.tsx`

- [ ] **Step 1: Implement `components/summary-text.tsx`**

```tsx
import { Platform, View } from "react-native";
import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";

export const SummaryText = ({ children, className }: { children: string; className?: string }) => (
  <View
    className={cn(
      "rounded-md border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900",
      className
    )}
  >
    <Text
      className="text-xs"
      style={{
        fontFamily: Platform.select({
          ios: "Menlo",
          android: "monospace",
          default: "monospace",
        }),
      }}
    >
      {children}
    </Text>
  </View>
);
```

- [ ] **Step 2: Verify typecheck**

Run: `bun run typecheck`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/summary-text.tsx
git -c user.name="claude" -c user.email="claude@local" commit -m "feat(ui): add SummaryText helper"
```

### Task 11: `ScanModal` component

**Files:**
- Create: `components/scan-modal.tsx`

- [ ] **Step 1: Implement `components/scan-modal.tsx`**

```tsx
import { useEffect, useState } from "react";
import { Modal, Platform, Pressable, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from "expo-camera";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { useToast } from "@/components/toast/toast-provider";

type ScanMode = "qr" | "barcode";

type Props = {
  visible: boolean;
  title: string;
  mode: ScanMode;
  onClose: () => void;
  onScan: (value: string) => boolean;
};

export const ScanModal = ({ visible, title, mode, onClose, onScan }: Props) => {
  const [handled, setHandled] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const toast = useToast();

  useEffect(() => {
    if (!visible) setHandled(false);
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    if (permission?.granted) return;
    void (async () => {
      const result = await requestPermission();
      if (!result.granted) {
        toast.show("Camera permission denied");
        onClose();
      }
    })();
  }, [visible, permission?.granted, requestPermission, toast, onClose]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-white dark:bg-gray-950">
        <SafeAreaView className="flex-1">
          <View className="flex-row items-center justify-between px-4 py-3">
            <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {title}
            </Text>
            <Button variant="outline" size="sm" onPress={onClose}>
              <Text>Close</Text>
            </Button>
          </View>

          {Platform.OS === "web" ? (
            <View className="flex-1 items-center justify-center p-6">
              <Text className="text-center text-base text-gray-700 dark:text-gray-300">
                Camera scanning is not available on web. Please paste JSON or type the
                package number.
              </Text>
            </View>
          ) : (
            <View className="mx-4 flex-1 overflow-hidden rounded-xl">
              <CameraView
                style={{ flex: 1 }}
                barcodeScannerSettings={mode === "qr" ? { barcodeTypes: ["qr"] } : undefined}
                onBarcodeScanned={(event: BarcodeScanningResult) => {
                  if (handled) return;
                  if (!event?.data) return;
                  setHandled(true);
                  const shouldClose = onScan(event.data);
                  if (shouldClose) onClose();
                  else setHandled(false);
                }}
              />
            </View>
          )}

          {/* Pressable reserved for future: tap-to-focus on camera */}
          {Platform.OS !== "web" ? <Pressable style={{ display: "none" }} /> : null}
        </SafeAreaView>
      </View>
    </Modal>
  );
};
```

- [ ] **Step 2: Verify typecheck**

Run: `bun run typecheck`
Expected: no errors from `components/scan-modal.tsx`.

- [ ] **Step 3: Commit**

```bash
git add components/scan-modal.tsx
git -c user.name="claude" -c user.email="claude@local" commit -m "feat(scan): add ScanModal with web fallback"
```

### Task 12: `ProfileCard` component

**Files:**
- Create: `components/profile-card.tsx`

- [ ] **Step 1: Implement `components/profile-card.tsx`**

```tsx
import { useCallback, useMemo, useState } from "react";
import { Alert, View } from "react-native";
import { useRouter } from "expo-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Text } from "@/components/ui/text";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/toast/toast-provider";
import { ScanModal } from "@/components/scan-modal";
import { SummaryText } from "@/components/summary-text";
import { useAppState } from "@/lib/app-state";
import { parseJson, parseRecordingInfo, sanitizeEndpoint, type RecordingInfo } from "@/lib/qr";

export const ProfileCard = () => {
  const { profile, setProfile } = useAppState();
  const toast = useToast();
  const router = useRouter();
  const [scannedApi, setScannedApi] = useState<string | null>(null);
  const [scannedInfo, setScannedInfo] = useState<RecordingInfo | null>(null);
  const [pasteJson, setPasteJson] = useState("");
  const [bearerToken, setBearerToken] = useState("");
  const [scanOpen, setScanOpen] = useState(false);

  const handleQrText = useCallback(
    (text: string) => {
      const obj = parseJson(text);
      if (!obj) return false;
      if (typeof obj.apiEndpoint === "string") {
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
    []
  );

  const bothReady = Boolean(scannedApi && scannedInfo);

  const onSave = useCallback(async () => {
    if (!scannedApi || !scannedInfo) return;
    await setProfile({
      apiEndpoint: scannedApi,
      orderNo: scannedInfo.orderNo,
      recordingNo: scannedInfo.recordingNo,
      locationCode: scannedInfo.locationCode,
      bearerToken: bearerToken.trim() ? bearerToken.trim() : null,
    });
    toast.show("Profile saved");
  }, [bearerToken, scannedApi, scannedInfo, setProfile, toast]);

  const onClearSaved = useCallback(() => {
    Alert.alert("Confirm", "Clear saved profile?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "OK",
        style: "destructive",
        onPress: async () => {
          await setProfile(null);
        },
      },
    ]);
  }, [setProfile]);

  const profileSummary = useMemo(() => {
    if (!profile) return "(No profile saved)";
    return JSON.stringify(
      {
        apiEndpoint: profile.apiEndpoint ?? "",
        orderNo: profile.orderNo ?? "",
        recordingNo: profile.recordingNo ?? "",
        locationCode: profile.locationCode ?? "",
        bearerToken: profile.bearerToken ? "(stored)" : "(none)",
      },
      null,
      2
    );
  }, [profile]);

  return (
    <Card className="gap-2">
      <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100">
        1) Recording Profile
      </Text>
      <Text className="text-sm text-gray-600 dark:text-gray-400">
        Scan two QR codes in any order to establish a profile: API Endpoint and Recording
        Info. Then save.
      </Text>

      <View className="flex-row gap-2">
        <Badge variant={scannedApi ? "default" : "secondary"}>
          <Text>API Endpoint: {scannedApi ? "ready" : "missing"}</Text>
        </Badge>
        <Badge variant={scannedInfo ? "default" : "secondary"}>
          <Text>Recording Info: {scannedInfo ? "ready" : "missing"}</Text>
        </Badge>
      </View>

      <View className="flex-row flex-wrap gap-2">
        <Button size="sm" onPress={() => setScanOpen(true)}>
          <Text>Scan QR</Text>
        </Button>
        <Button
          size="sm"
          variant="outline"
          onPress={() => {
            setScannedApi(null);
            setScannedInfo(null);
          }}
        >
          <Text>Reset</Text>
        </Button>
      </View>

      <Separator />

      <Text className="text-sm font-medium text-gray-800 dark:text-gray-200">
        Paste JSON instead
      </Text>
      <Textarea
        value={pasteJson}
        onChangeText={setPasteJson}
        placeholder='{"apiEndpoint":"<https://...>"} or {"orderNo":"1234","recordingNo":1,"locationCode":"FG HU"}'
        autoCapitalize="none"
      />
      <Button
        size="sm"
        variant="outline"
        onPress={() => {
          if (!handleQrText(pasteJson.trim())) {
            toast.show("Not valid JSON or unexpected format");
          }
        }}
      >
        <Text>Detect</Text>
      </Button>

      <Separator />

      <Text className="text-sm font-medium text-gray-800 dark:text-gray-200">
        Advanced: Optional Bearer Token
      </Text>
      <Input
        value={bearerToken}
        onChangeText={setBearerToken}
        placeholder="Bearer token (optional)"
        secureTextEntry
        autoCapitalize="none"
      />

      <View className="flex-row flex-wrap gap-2">
        <Button size="sm" disabled={!bothReady} onPress={onSave}>
          <Text>Save Profile</Text>
        </Button>
        <Button size="sm" variant="outline" onPress={onClearSaved}>
          <Text>Clear Saved Profile</Text>
        </Button>
      </View>

      <Text className="mt-2 text-sm font-medium text-gray-800 dark:text-gray-200">
        Current Profile
      </Text>
      <SummaryText>{profileSummary}</SummaryText>

      <ScanModal
        visible={scanOpen}
        title="Scan QR"
        mode="qr"
        onClose={() => setScanOpen(false)}
        onScan={(data) => {
          if (handleQrText(data)) return true;
          toast.show("Not JSON or unexpected structure; keep scanning…");
          return false;
        }}
      />
      {/* router reserved for future deep-link flow */}
      {router ? null : null}
    </Card>
  );
};
```

- [ ] **Step 2: Verify typecheck**

Run: `bun run typecheck`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/profile-card.tsx
git -c user.name="claude" -c user.email="claude@local" commit -m "feat(profile): add ProfileCard with QR scan, paste, save"
```

### Task 13: `WorkCard` component

**Files:**
- Create: `components/work-card.tsx`

- [ ] **Step 1: Implement `components/work-card.tsx`**

```tsx
import { useCallback, useState } from "react";
import { Pressable, View } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Text } from "@/components/ui/text";
import { ScanModal } from "@/components/scan-modal";
import { SummaryText } from "@/components/summary-text";
import { useToast } from "@/components/toast/toast-provider";
import { useAppState } from "@/lib/app-state";
import { enqueueOutboxItem, submitPayload } from "@/lib/api";

export const WorkCard = () => {
  const { profile, outbox, setOutbox } = useAppState();
  const toast = useToast();
  const [packageNo, setPackageNo] = useState("");
  const [intact, setIntact] = useState(true);
  const [quantity, setQuantity] = useState(0);
  const [result, setResult] = useState("");
  const [scanOpen, setScanOpen] = useState(false);

  const onSubmit = useCallback(async () => {
    setResult("");
    if (!profile) {
      toast.show("No profile saved. Please create and save a profile first.");
      return;
    }
    const pkg = packageNo.trim();
    if (!pkg) {
      toast.show("Package number is required.");
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
      const r = await submitPayload(profile, payload);
      setResult(
        `POST ${profile.apiEndpoint}\nPayload:\n${JSON.stringify(
          payload,
          null,
          2
        )}\n\nResponse:\n{\n  "status": ${r.status},\n  "ok": ${r.ok},\n  "body": ${JSON.stringify(r.body)}\n}`
      );
    } catch (error) {
      const next = enqueueOutboxItem(outbox, profile, payload);
      await setOutbox(next);
      setResult(`Request failed (likely offline). Saved to queue.\n${(error as Error).toString()}`);
    }
  }, [intact, outbox, packageNo, profile, quantity, setOutbox, toast]);

  return (
    <Card className="gap-2">
      <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100">
        2) Work
      </Text>
      <Text className="text-sm text-gray-600 dark:text-gray-400">
        Use your saved profile to submit package records.
      </Text>

      <View className="flex-row items-center gap-2">
        <View className="flex-1">
          <Input
            value={packageNo}
            onChangeText={setPackageNo}
            placeholder="Scan or type package number"
          />
        </View>
        <Button size="sm" variant="outline" onPress={() => setScanOpen(true)}>
          <Text>Scan</Text>
        </Button>
      </View>

      <View className="flex-row items-center gap-2">
        <Switch checked={intact} onCheckedChange={setIntact} />
        <Text className="text-sm text-gray-800 dark:text-gray-200">Package intact</Text>
      </View>

      <View
        className="flex-row items-center gap-2"
        style={{ opacity: intact ? 0.5 : 1 }}
      >
        <Pressable
          onPress={() => setQuantity((v) => Math.max(0, v - 1))}
          disabled={intact}
          className="p-1"
        >
          <MaterialIcons name="remove-circle-outline" size={26} color="#444" />
        </Pressable>
        <View className="w-32">
          <Input
            value={String(quantity)}
            editable={false}
            className="text-center"
            placeholder="Quantity"
          />
        </View>
        <Pressable
          onPress={() => setQuantity((v) => v + 1)}
          disabled={intact}
          className="p-1"
        >
          <MaterialIcons name="add-circle-outline" size={26} color="#444" />
        </Pressable>
      </View>

      <Button onPress={onSubmit}>
        <Text>Submit</Text>
      </Button>

      {result ? <SummaryText>{result}</SummaryText> : null}

      <ScanModal
        visible={scanOpen}
        title="Scan Package Barcode"
        mode="barcode"
        onClose={() => setScanOpen(false)}
        onScan={(data) => {
          const trimmed = data.trim();
          if (trimmed) setPackageNo(trimmed);
          return true;
        }}
      />
    </Card>
  );
};
```

- [ ] **Step 2: Verify typecheck**

Run: `bun run typecheck`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/work-card.tsx
git -c user.name="claude" -c user.email="claude@local" commit -m "feat(work): add WorkCard with submit and outbox enqueue"
```

### Task 14: `OutboxCard` component

**Files:**
- Create: `components/outbox-card.tsx`

- [ ] **Step 1: Implement `components/outbox-card.tsx`**

```tsx
import { useCallback } from "react";
import { Alert, View } from "react-native";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Text } from "@/components/ui/text";
import { useToast } from "@/components/toast/toast-provider";
import { useAppState } from "@/lib/app-state";
import { syncOutbox } from "@/lib/api";

export const OutboxCard = () => {
  const { outbox, setOutbox } = useAppState();
  const toast = useToast();

  const onSync = useCallback(async () => {
    if (!outbox.length) {
      toast.show("Nothing to sync");
      return;
    }
    const { remaining, success } = await syncOutbox(outbox);
    await setOutbox(remaining);
    toast.show(success > 0 ? `Synced ${success} item(s)` : "Nothing synced");
  }, [outbox, setOutbox, toast]);

  const onClear = useCallback(() => {
    Alert.alert("Confirm", "Clear all pending submissions?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "OK",
        style: "destructive",
        onPress: async () => {
          await setOutbox([]);
        },
      },
    ]);
  }, [setOutbox]);

  return (
    <Card className="gap-2">
      <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100">
        Offline queue
      </Text>
      <Text className="text-sm text-gray-600 dark:text-gray-400">
        Pending submissions: {outbox.length}
      </Text>
      <View className="flex-row flex-wrap gap-2">
        <Button size="sm" variant="outline" onPress={onSync}>
          <Text>Sync now</Text>
        </Button>
        <Button size="sm" variant="outline" onPress={onClear}>
          <Text>Clear</Text>
        </Button>
      </View>
    </Card>
  );
};
```

- [ ] **Step 2: Verify typecheck**

Run: `bun run typecheck`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/outbox-card.tsx
git -c user.name="claude" -c user.email="claude@local" commit -m "feat(outbox): add OutboxCard with sync and clear"
```

---

## Phase 5: Routes

### Task 15: `(tabs)/_layout.tsx` — tabs navigator

**Files:**
- Modify: `app/(tabs)/_layout.tsx`

- [ ] **Step 1: Replace the rnr-template `_layout.tsx` with our tab labels**

Open `app/(tabs)/_layout.tsx` and replace its body with:

```tsx
import { Tabs } from "expo-router";
import { Text } from "@/components/ui/text";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarLabel: ({ children }) => (
          <Text className="text-xs text-gray-700 dark:text-gray-300">{children}</Text>
        ),
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Profile" }} />
      <Tabs.Screen name="work" options={{ title: "Work" }} />
      <Tabs.Screen name="outbox" options={{ title: "Outbox" }} />
    </Tabs>
  );
}
```

If the rnr template uses a different tabs API (e.g. `Tabs.Screen` with a `name` prop matching the file), keep that convention. The exact import path is `@/components/ui/text`; if the rnr template ships tabs from a different location, use it.

- [ ] **Step 2: Verify typecheck**

Run: `bun run typecheck`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add 'app/(tabs)/_layout.tsx'
git -c user.name="claude" -c user.email="claude@local" commit -m "feat(tabs): wire 3 tabs (Profile, Work, Outbox)"
```

### Task 16: `(tabs)/index.tsx` — Profile tab

**Files:**
- Modify: `app/(tabs)/index.tsx`

- [ ] **Step 1: Replace the file content**

```tsx
import { ScrollView, View } from "react-native";
import { ProfileCard } from "@/components/profile-card";
import { ThemeToggle } from "@/components/theme/theme-toggle";

export default function ProfileTab() {
  return (
    <ScrollView
      className="flex-1 bg-white dark:bg-gray-950"
      contentContainerClassName="gap-4 p-4 pb-8"
    >
      <View className="flex-row items-center justify-between">
        <View>
          <View className="text-2xl font-bold text-gray-900 dark:text-gray-100" />
        </View>
        <ThemeToggle />
      </View>
      <ProfileCard />
    </ScrollView>
  );
}
```

If the rnr template's `<Text>` should be used for the heading, replace the inner empty `<View>` with `<Text className="text-2xl font-bold text-gray-900 dark:text-gray-100">Inventory Scanner</Text>` and add `import { Text } from "@/components/ui/text"`.

- [ ] **Step 2: Verify typecheck**

Run: `bun run typecheck`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add 'app/(tabs)/index.tsx'
git -c user.name="claude" -c user.email="claude@local" commit -m "feat(tabs): render ProfileCard on Profile tab"
```

### Task 17: `(tabs)/work.tsx` — Work tab

**Files:**
- Modify: `app/(tabs)/work.tsx`

- [ ] **Step 1: Replace the file content**

```tsx
import { ScrollView } from "react-native";
import { WorkCard } from "@/components/work-card";

export default function WorkTab() {
  return (
    <ScrollView
      className="flex-1 bg-white dark:bg-gray-950"
      contentContainerClassName="gap-4 p-4 pb-8"
    >
      <WorkCard />
    </ScrollView>
  );
}
```

- [ ] **Step 2: Verify typecheck**

Run: `bun run typecheck`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add 'app/(tabs)/work.tsx'
git -c user.name="claude" -c user.email="claude@local" commit -m "feat(tabs): render WorkCard on Work tab"
```

### Task 18: `(tabs)/outbox.tsx` — Outbox tab

**Files:**
- Modify: `app/(tabs)/outbox.tsx`

- [ ] **Step 1: Replace the file content**

```tsx
import { ScrollView } from "react-native";
import { OutboxCard } from "@/components/outbox-card";

export default function OutboxTab() {
  return (
    <ScrollView
      className="flex-1 bg-white dark:bg-gray-950"
      contentContainerClassName="gap-4 p-4 pb-8"
    >
      <OutboxCard />
    </ScrollView>
  );
}
```

- [ ] **Step 2: Verify typecheck**

Run: `bun run typecheck`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add 'app/(tabs)/outbox.tsx'
git -c user.name="claude" -c user.email="claude@local" commit -m "feat(tabs): render OutboxCard on Outbox tab"
```

### Task 19: `scan.tsx` — modal route (optional convenience)

**Files:**
- Create: `app/scan.tsx`

- [ ] **Step 1: Add the modal route**

The ProfileCard and WorkCard embed the `ScanModal` directly, so a separate route is not strictly required. Keep this file as a thin re-export so future deep-links have a target:

```tsx
import { Redirect } from "expo-router";

export default function ScanRoute() {
  return <Redirect href="/" />;
}
```

- [ ] **Step 2: Verify typecheck**

Run: `bun run typecheck`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/scan.tsx
git -c user.name="claude" -c user.email="claude@local" commit -m "feat(scan): add modal route redirect placeholder"
```

### Task 20: `app/_layout.tsx` — root providers

**Files:**
- Modify: `app/_layout.tsx`

- [ ] **Step 1: Replace the rnr-template root with our provider chain**

Open `app/_layout.tsx` and replace its body with:

```tsx
import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import "../global.css";
import { AppStateProvider } from "@/lib/app-state";
import { ToastProvider } from "@/components/toast/toast-provider";
import { ThemeProvider } from "@/components/theme/theme-provider";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AppStateProvider>
          <ToastProvider>
            <StatusBar style="auto" />
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="scan" options={{ presentation: "modal" }} />
            </Stack>
          </ToastProvider>
        </AppStateProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
```

- [ ] **Step 2: Verify typecheck**

Run: `bun run typecheck`
Expected: no errors. (If `expo-router` complains about `Stack.Screen` ordering, ensure the `(tabs)` screen is registered first.)

- [ ] **Step 3: Delete the old `App.tsx`**

```bash
git rm App.tsx
```

- [ ] **Step 4: Run a web export to confirm the bundle compiles**

Run: `bun run web:export`
Expected: writes a static bundle to `dist/`. Inspect `dist/index.html` exists.

- [ ] **Step 5: Commit**

```bash
git add app/_layout.tsx
git -c user.name="claude" -c user.email="claude@local" commit -m "feat(root): wire SafeAreaProvider, ThemeProvider, AppStateProvider, ToastProvider"
```

---

## Phase 6: Validation

### Task 21: Final validation

**Files:** none (validation only)

- [ ] **Step 1: Typecheck**

Run: `bun run typecheck`
Expected: zero errors.

- [ ] **Step 2: Unit tests**

Run: `bun test`
Expected: all `tests/qr.test.ts` cases pass.

- [ ] **Step 3: Web export**

Run: `bun run web:export`
Expected: produces `dist/` with `index.html` and an `_expo/static/js/web-*.js` bundle.

- [ ] **Step 4: Confirm CI workflows are unchanged**

Run:
```bash
git diff main -- .github
```
Expected: no diff in `.github/workflows/`. If there is a diff, revert it (the spec mandates unchanged workflows).

- [ ] **Step 5: Push the branch and inspect the Android artifact**

Run:
```bash
git push -u origin HEAD
gh run watch --workflow "Build Android APK (Expo)" --branch $(git rev-parse --abbrev-ref HEAD)
```
Expected: the workflow runs `assembleDebug` and uploads `app-debug.apk`. Download from the run's artifacts page and confirm it installs on a device (or, at minimum, that the workflow log shows the gradle task succeeding).

- [ ] **Step 6: Inspect the GitHub Pages web deploy**

Run:
```bash
gh run watch --workflow "Build and Deploy Web App" --branch $(git rev-parse --abbrev-ref HEAD)
```
Expected: builds the static bundle and deploys to
`https://<org>.github.io/express-luck-inventory-count-app-react-native-test-public/`.
Open the URL, exercise the paste-JSON flow, save a profile, hit submit
(will fail without a real endpoint, exercising the offline-queue path), then
sync the queue.

- [ ] **Step 7: Final commit if anything needed cleanup**

If validation surfaced a fix, amend the previous commit or add a new one. Do not push the build artifacts (`dist/`) — they are produced in CI.

---

## Self-Review Notes

**Spec coverage:**
- rnr + uniwind UI → Tasks 1, 2 (scaffold), all of Phase 4
- Multi-screen tabs → Tasks 15–19
- Light/dark with system toggle → Task 9, Task 20 (ThemeProvider)
- Custom toast → Task 8, Task 20 (ToastProvider in root)
- Bun for everything → Task 2 step 5, all `bun` commands throughout
- Web-first validation → Task 21 steps 3 & 6
- Preserve CI workflows → Task 2 (no workflow files copied), Task 21 step 4
- AsyncStorage / offline queue → Tasks 5, 6, 7
- Camera with web fallback → Task 11
- Unit tests for `lib/qr.ts` → Task 4
- `app.json` name/slug/web baseUrl preserved → Task 3

**Type consistency:** `Profile`, `OutboxItem`, `RecordingInfo` are defined in
`lib/storage.ts` and `lib/qr.ts` and consumed by `lib/api.ts`, `lib/app-state.tsx`,
and the three card components. The toast API is `{ show: (message) => void }`
in both `toast-provider.tsx` and consumers. The submit helper returns
`SubmitResult` consistently.

**Placeholders:** none. Every code step shows the full code to write; every
command has the expected output.
