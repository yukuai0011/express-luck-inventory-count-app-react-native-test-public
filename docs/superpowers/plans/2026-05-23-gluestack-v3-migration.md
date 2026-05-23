# gluestack-ui v1 → v3 Migration Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the Express Luck Inventory app from gluestack-ui v1 (`@gluestack-ui/themed`) to gluestack-ui v3 (copy-paste components with NativeWind/Tailwind CSS).

**Architecture:** Remove v1 npm packages, run `npx gluestack-ui init` to scaffold v3 provider and NativeWind setup, add required components via CLI, then rewrite `App.tsx` to use local component imports and Tailwind `className` props instead of token-based style props.

**Tech Stack:** Expo SDK 54, React 19, React Native 0.81, gluestack-ui v3, NativeWind, Tailwind CSS, bun

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `package.json` | Modify | Remove v1 deps, add v3/NativeWind deps |
| `app.json` | Modify | Add NativeWind babel preset if needed |
| `global.css` | Create | Tailwind directives + gluestack theme |
| `tailwind.config.js` | Create | Tailwind config with gluestack preset |
| `metro.config.js` | Create/Modify | NativeWind metro config |
| `babel.config.js` | Create/Modify | Add NativeWind babel preset |
| `nativewind-env.d.ts` | Create | NativeWind TypeScript types |
| `src/components/ui/` | Create (CLI) | gluestack v3 component files |
| `App.tsx` | Rewrite | Use v3 imports + className styling |

---

### Task 1: Remove gluestack v1 packages and install v3 dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Remove v1 packages**

```bash
cd c:/Users/yukua/Downloads/express-luck-inventory-count-app-react-native-test-public
bun remove @gluestack-ui/themed @gluestack-ui/config
```

- [ ] **Step 2: Install NativeWind and Tailwind CSS dependencies**

```bash
bun add nativewind tailwindcss@^3.4 react-native-reanimated
```

- [ ] **Step 3: Verify packages installed**

```bash
bun pm ls | grep -E "nativewind|tailwindcss"
```

Expected: nativewind and tailwindcss listed

- [ ] **Step 4: Commit**

```bash
git add package.json bun.lock
git commit -m "chore: remove gluestack v1 packages, add NativeWind + Tailwind CSS"
```

---

### Task 2: Configure NativeWind for Expo

**Files:**
- Create: `tailwind.config.js`
- Create: `global.css`
- Create: `nativewind-env.d.ts`
- Modify: `babel.config.js` (create if missing)
- Modify: `metro.config.js` (create if missing)
- Modify: `app.json`

- [ ] **Step 1: Create `tailwind.config.js`**

```js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./App.tsx",
    "./src/**/*.{ts,tsx,js,jsx}",
    "./components/**/*.{ts,tsx,js,jsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {},
  },
  plugins: [],
};
```

- [ ] **Step 2: Create `global.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 3: Create or update `babel.config.js`**

Check if `babel.config.js` exists. If not, create it:

```js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
  };
};
```

If it already exists, add `"nativewind/babel"` to presets and set `jsxImportSource: "nativewind"` on the expo preset.

- [ ] **Step 4: Create or update `metro.config.js`**

```js
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

module.exports = withNativeWind(config, { input: "./global.css" });
```

- [ ] **Step 5: Create `nativewind-env.d.ts`**

```ts
/// <reference types="nativewind/types" />
```

- [ ] **Step 6: Update `tsconfig.json` to include the env types**

Read current `tsconfig.json`, ensure it includes `"nativewind-env.d.ts"` in the `include` array or that the `extends: "expo/tsconfig.base"` picks it up. If not, add:

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true
  },
  "include": ["nativewind-env.d.ts", "**/*.ts", "**/*.tsx"]
}
```

- [ ] **Step 7: Update `app.json` to include NativeWind plugin**

Add `"nativewind/babel"` to plugins if required by Expo. Read current `app.json` and verify.

- [ ] **Step 8: Commit**

```bash
git add tailwind.config.js global.css nativewind-env.d.ts babel.config.js metro.config.js tsconfig.json app.json
git commit -m "feat: configure NativeWind + Tailwind CSS for Expo"
```

---

### Task 3: Initialize gluestack-ui v3 and add components

**Files:**
- Create: `src/components/ui/` (via CLI)

- [ ] **Step 1: Run gluestack-ui init**

```bash
cd c:/Users/yukua/Downloads/express-luck-inventory-count-app-react-native-test-public
bunx gluestack-ui init
```

This will:
- Install `@gluestack-ui/nativewind-utils` and related packages
- Create `src/components/ui/gluestack-ui-provider/` with the provider component
- Create `src/components/ui/icon/`, `src/components/ui/overlay/`, `src/components/ui/toast/`

Accept all defaults. If it asks about TypeScript, say yes.

- [ ] **Step 2: Add required components**

```bash
bunx gluestack-ui add box vstack hstack heading text button input textarea badge divider switch
```

- [ ] **Step 3: Verify components were created**

```bash
ls src/components/ui/
```

Expected directories/files: `box/`, `vstack/`, `hstack/`, `heading/`, `text/`, `button/`, `input/`, `textarea/`, `badge/`, `divider/`, `switch/`, `gluestack-ui-provider/`, `toast/`, `icon/`, `overlay/`

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/ package.json bun.lock
git commit -m "feat: initialize gluestack-ui v3 and add components"
```

---

### Task 4: Rewrite App.tsx with gluestack v3 patterns

**Files:**
- Modify: `App.tsx`

This is the main migration step. The full rewrite of `App.tsx`:

- [ ] **Step 1: Rewrite App.tsx**

Replace the entire contents of `App.tsx` with the following. Key changes:
- Imports from `@/components/ui/*` instead of `@gluestack-ui/themed`
- `className` props instead of token-based style props (`bg="$backgroundLight0"` → `className="bg-white"`)
- `GluestackUIProvider` from local provider (no `config` prop)
- Toast uses `useToast` with `Toast`, `ToastTitle` instead of custom `render`
- `global.css` import at top

```tsx
import "./global.css";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  CameraView,
  BarcodeScanningResult,
  useCameraPermissions,
} from "expo-camera";
import { MaterialIcons } from "@expo/vector-icons";
import { GluestackUIProvider } from "@/components/ui/gluestack-ui-provider";
import { Box } from "@/components/ui/box";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import { Button, ButtonText } from "@/components/ui/button";
import { Input, InputField } from "@/components/ui/input";
import { Textarea, TextareaInput } from "@/components/ui/textarea";
import { Badge, BadgeText } from "@/components/ui/badge";
import { Divider } from "@/components/ui/divider";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import {
  Toast,
  ToastTitle,
  ToastDescription,
} from "@/components/ui/toast";

type RecordingInfo = {
  orderNo: string;
  recordingNo: number;
  locationCode: string;
};

type Profile = RecordingInfo & {
  apiEndpoint: string;
  bearerToken?: string | null;
};

type OutboxItem = {
  url: string;
  headers: { Authorization?: string | null };
  payload: Record<string, unknown>;
  ts: string;
};

type ScanMode = "qr" | "barcode";

const STORAGE_PROFILE = "inventory_profile";
const STORAGE_OUTBOX = "inventory_outbox";

const sanitizeEndpoint = (input: string) => {
  let value = input.trim();
  if (value.startsWith("<") && value.endsWith(">")) {
    value = value.slice(1, -1);
  }
  return value;
};

const uuidv4 = () => {
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

const parseJson = (text: string) => {
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return null;
  }
};

const parseRecordingInfo = (
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

const SummaryText = ({ children }: { children: string }) => (
  <Box className="border border-outline-200 rounded-md p-3 bg-white">
    <Text style={styles.codeText}>{children}</Text>
  </Box>
);

const ScanModal = ({
  visible,
  title,
  mode,
  onClose,
  onScan,
}: {
  visible: boolean;
  title: string;
  mode: ScanMode;
  onClose: () => void;
  onScan: (value: string) => boolean;
}) => {
  const [handled, setHandled] = useState(false);

  useEffect(() => {
    if (!visible) {
      setHandled(false);
    }
  }, [visible]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <Box className="flex-1 bg-white">
        <SafeAreaView style={styles.safeArea}>
          <HStack className="items-center justify-between px-4 py-3">
            <Heading size="md">{title}</Heading>
            <Button variant="outline" onPress={onClose} size="sm">
              <ButtonText>Close</ButtonText>
            </Button>
          </HStack>
          <View style={styles.scannerContainer}>
            <CameraView
              style={StyleSheet.absoluteFillObject}
              barcodeScannerSettings={
                mode === "qr" ? { barcodeTypes: ["qr"] } : undefined
              }
              onBarcodeScanned={(event: BarcodeScanningResult) => {
                if (handled) return;
                if (!event?.data) return;
                setHandled(true);
                const shouldClose = onScan(event.data);
                if (shouldClose) {
                  onClose();
                } else {
                  setHandled(false);
                }
              }}
            />
          </View>
        </SafeAreaView>
      </Box>
    </Modal>
  );
};

export default function App() {
  const toast = useToast();
  const [permission, requestPermission] = useCameraPermissions();
  const [scannedApi, setScannedApi] = useState<string | null>(null);
  const [scannedInfo, setScannedInfo] = useState<RecordingInfo | null>(null);
  const [pasteJson, setPasteJson] = useState("");
  const [bearerToken, setBearerToken] = useState("");
  const [packageNo, setPackageNo] = useState("");
  const [intact, setIntact] = useState(true);
  const [quantity, setQuantity] = useState(0);
  const [result, setResult] = useState("");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [outbox, setOutbox] = useState<OutboxItem[]>([]);
  const [scanMode, setScanMode] = useState<ScanMode | null>(null);
  const [scanTitle, setScanTitle] = useState("");

  const hasBothScans = useMemo(
    () => Boolean(scannedApi && scannedInfo),
    [scannedApi, scannedInfo]
  );

  const profileSummary = useMemo(() => {
    if (!profile) return "(No profile saved)";
    const safe = {
      apiEndpoint: profile.apiEndpoint ?? "",
      orderNo: profile.orderNo ?? "",
      recordingNo: profile.recordingNo ?? "",
      locationCode: profile.locationCode ?? "",
      bearerToken: profile.bearerToken ? "(stored)" : "(none)",
    };
    return JSON.stringify(safe, null, 2);
  }, [profile]);

  const showToast = useCallback(
    (message: string) => {
      toast.show({
        placement: "top",
        duration: 2000,
        render: ({ id }) => {
          const uniqueToastId = id;
          return (
            <Toast action="attention" variant="solid" nativeID={uniqueToastId}>
              <ToastTitle>{message}</ToastTitle>
            </Toast>
          );
        },
      });
    },
    [toast]
  );

  const loadProfile = useCallback(async () => {
    const raw = await AsyncStorage.getItem(STORAGE_PROFILE);
    if (!raw) {
      setProfile(null);
      return;
    }
    try {
      const parsed = JSON.parse(raw) as Profile;
      setProfile(parsed);
    } catch {
      setProfile(null);
    }
  }, []);

  const loadOutbox = useCallback(async () => {
    const raw = await AsyncStorage.getItem(STORAGE_OUTBOX);
    if (!raw) {
      setOutbox([]);
      return;
    }
    try {
      const parsed = JSON.parse(raw) as OutboxItem[];
      setOutbox(parsed ?? []);
    } catch {
      setOutbox([]);
    }
  }, []);

  const saveOutbox = useCallback(async (items: OutboxItem[]) => {
    setOutbox(items);
    await AsyncStorage.setItem(STORAGE_OUTBOX, JSON.stringify(items));
  }, []);

  useEffect(() => {
    void loadProfile();
    void loadOutbox();
  }, [loadOutbox, loadProfile]);

  const handleQrText = useCallback((text: string) => {
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
  }, []);

  const requestCameraPermission = useCallback(async () => {
    if (permission?.granted) return true;
    const response = await requestPermission();
    if (response.status !== "granted") {
      Alert.alert(
        "Info",
        "Camera scanning is available on Android, iOS, and the Web. On this platform, please paste JSON or type the package number."
      );
      return false;
    }
    return true;
  }, [permission?.granted, requestPermission]);

  const startScan = useCallback(
    async (mode: ScanMode) => {
      if (!(await requestCameraPermission())) return;
      setScanTitle(mode === "qr" ? "Scan QR" : "Scan Package Barcode");
      setScanMode(mode);
    },
    [requestCameraPermission]
  );

  const onScanResult = useCallback(
    (data: string) => {
      if (!scanMode) return true;
      if (scanMode === "qr") {
        const ok = handleQrText(data);
        if (!ok) {
          showToast("Not JSON or unexpected structure; keep scanning...");
        }
        return ok;
      }
      const trimmed = data.trim();
      if (trimmed) {
        setPackageNo(trimmed);
      }
      return true;
    },
    [handleQrText, scanMode, showToast]
  );

  const onDetectPaste = useCallback(() => {
    const ok = handleQrText(pasteJson.trim());
    if (!ok) {
      showToast("Not valid JSON or unexpected format");
    }
  }, [handleQrText, pasteJson, showToast]);

  const onSaveProfile = useCallback(async () => {
    if (!scannedApi || !scannedInfo) return;
    const nextProfile: Profile = {
      apiEndpoint: scannedApi,
      orderNo: scannedInfo.orderNo,
      recordingNo: scannedInfo.recordingNo,
      locationCode: scannedInfo.locationCode,
      bearerToken: bearerToken.trim() ? bearerToken.trim() : null,
    };
    await AsyncStorage.setItem(STORAGE_PROFILE, JSON.stringify(nextProfile));
    setProfile(nextProfile);
    showToast("Profile saved");
  }, [bearerToken, scannedApi, scannedInfo, showToast]);

  const onClearSavedProfile = useCallback(async () => {
    await AsyncStorage.removeItem(STORAGE_PROFILE);
    setProfile(null);
  }, []);

  const onSubmit = useCallback(async () => {
    setResult("");
    if (!profile) {
      showToast("No profile saved. Please create and save a profile first.");
      return;
    }
    const pkg = packageNo.trim();
    if (!pkg) {
      showToast("Package number is required.");
      return;
    }
    const url = sanitizeEndpoint(profile.apiEndpoint ?? "");
    if (!url.startsWith("http")) {
      showToast("Profile API endpoint is invalid.");
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
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Accept: "application/json",
        "x-ms-client-tracking-id": uuidv4(),
      };
      const token = (profile.bearerToken ?? "").toString().trim();
      if (token) headers.Authorization = `Bearer ${token}`;
      const resp = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });
      const ct = resp.headers.get("content-type") ?? "";
      let bodyOut = "";
      if (ct.includes("application/json")) {
        const json = await resp.json();
        bodyOut = JSON.stringify(json, null, 2);
      } else {
        bodyOut = await resp.text();
      }
      setResult(
        `POST ${url}\nPayload:\n${JSON.stringify(payload, null, 2)}\n\nResponse:\n{\n  "status": ${resp.status},\n  "ok": ${resp.status >= 200 && resp.status < 300},\n  "body": ${JSON.stringify(bodyOut)}\n}`
      );
    } catch (error) {
      const token = (profile.bearerToken ?? "").toString().trim();
      const queued: OutboxItem = {
        url,
        headers: {
          Authorization: token ? `Bearer ${token}` : null,
        },
        payload,
        ts: new Date().toISOString(),
      };
      const nextOutbox = [...outbox, queued];
      await saveOutbox(nextOutbox);
      setResult(
        `Request failed (likely offline). Saved to queue.\n${(error as Error).toString()}`
      );
    }
  }, [intact, outbox, packageNo, profile, quantity, saveOutbox, showToast]);

  const onSyncNow = useCallback(async () => {
    if (!outbox.length) {
      showToast("Nothing synced");
      return;
    }
    let success = 0;
    const remaining: OutboxItem[] = [];
    for (const item of outbox) {
      const url = item.url ?? "";
      if (!url.startsWith("http")) {
        remaining.push(item);
        continue;
      }
      try {
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          Accept: "application/json",
          "x-ms-client-tracking-id": uuidv4(),
        };
        const auth = item.headers?.Authorization ?? "";
        if (auth) headers.Authorization = auth;
        const resp = await fetch(url, {
          method: "POST",
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
    await saveOutbox(remaining);
    showToast(success > 0 ? `Synced ${success} item(s)` : "Nothing synced");
  }, [outbox, saveOutbox, showToast]);

  const onClearOutbox = useCallback(async () => {
    Alert.alert("Confirm", "Clear all pending submissions?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "OK",
        style: "destructive",
        onPress: async () => {
          await saveOutbox([]);
        },
      },
    ]);
  }, [saveOutbox]);

  return (
    <GluestackUIProvider>
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="dark" />
        <Box className="flex-1 bg-white">
          <ScrollView
            style={styles.scrollWrapper}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <VStack className="gap-4 px-4 py-4">
              <Heading size="lg">Inventory Scanner PoC</Heading>

              <Box className="border border-outline-200 rounded-xl p-4 bg-white">
                <VStack className="gap-3">
                  <Heading size="md">1) Recording Profile</Heading>
                  <Text>
                    Scan two QR codes in any order to establish a profile: API
                    Endpoint and Recording Info. Then save.
                  </Text>
                  <HStack className="gap-2">
                    <Badge
                      action={scannedApi ? "success" : "muted"}
                      variant="solid"
                    >
                      <BadgeText>
                        API Endpoint: {scannedApi ? "ready" : "missing"}
                      </BadgeText>
                    </Badge>
                    <Badge
                      action={scannedInfo ? "success" : "muted"}
                      variant="solid"
                    >
                      <BadgeText>
                        Recording Info: {scannedInfo ? "ready" : "missing"}
                      </BadgeText>
                    </Badge>
                  </HStack>
                  <HStack className="gap-2 flex-wrap">
                    <Button onPress={() => startScan("qr")} size="sm">
                      <ButtonText>Scan QR</ButtonText>
                    </Button>
                    <Button
                      onPress={() => {
                        setScannedApi(null);
                        setScannedInfo(null);
                      }}
                      variant="outline"
                      size="sm"
                    >
                      <ButtonText>Reset</ButtonText>
                    </Button>
                  </HStack>

                  <Divider className="my-2" />
                  <Text>Paste JSON instead</Text>
                  <Textarea>
                    <TextareaInput
                      value={pasteJson}
                      onChangeText={setPasteJson}
                      placeholder='{"apiEndpoint":"<https://...>"} or {"orderNo":"1234","recordingNo":1,"locationCode":"FG HU"}'
                      autoCapitalize="none"
                    />
                  </Textarea>
                  <Button onPress={onDetectPaste} variant="outline" size="sm">
                    <ButtonText>Detect</ButtonText>
                  </Button>

                  <Divider className="my-2" />
                  <Text>Advanced: Optional Bearer Token</Text>
                  <Input>
                    <InputField
                      value={bearerToken}
                      onChangeText={setBearerToken}
                      placeholder="Bearer token (optional)"
                      secureTextEntry
                      autoCapitalize="none"
                    />
                  </Input>

                  <HStack className="gap-2 flex-wrap">
                    <Button
                      onPress={onSaveProfile}
                      isDisabled={!hasBothScans}
                      size="sm"
                    >
                      <ButtonText>Save Profile</ButtonText>
                    </Button>
                    <Button
                      onPress={onClearSavedProfile}
                      variant="outline"
                      size="sm"
                    >
                      <ButtonText>Clear Saved Profile</ButtonText>
                    </Button>
                  </HStack>

                  <Text>Current Profile</Text>
                  <SummaryText>{profileSummary}</SummaryText>
                </VStack>
              </Box>

              <Box className="border border-outline-200 rounded-xl p-4 bg-white">
                <VStack className="gap-3">
                  <Heading size="md">2) Work</Heading>
                  <Text>Use your saved profile to submit package records.</Text>
                  <HStack className="gap-2 items-center">
                    <Box className="flex-1">
                      <Input>
                        <InputField
                          value={packageNo}
                          onChangeText={setPackageNo}
                          placeholder="Scan or type package number"
                        />
                      </Input>
                    </Box>
                    <Button
                      onPress={() => startScan("barcode")}
                      variant="outline"
                      size="sm"
                    >
                      <ButtonText>Scan</ButtonText>
                    </Button>
                  </HStack>

                  <HStack className="gap-2 items-center">
                    <Switch value={intact} onValueChange={setIntact} />
                    <Text>Package intact</Text>
                  </HStack>

                  <HStack
                    className="gap-2 items-center"
                    style={{ opacity: intact ? 0.5 : 1 }}
                  >
                    <Pressable
                      onPress={() =>
                        setQuantity((value) => Math.max(0, value - 1))
                      }
                      disabled={intact}
                      style={styles.iconButton}
                    >
                      <MaterialIcons
                        name="remove-circle-outline"
                        size={26}
                        color="#444"
                      />
                    </Pressable>
                    <Box className="w-[120px]">
                      <Input isDisabled={intact}>
                        <InputField
                          value={String(quantity)}
                          editable={false}
                          textAlign="center"
                          placeholder="Quantity"
                        />
                      </Input>
                    </Box>
                    <Pressable
                      onPress={() => setQuantity((value) => value + 1)}
                      disabled={intact}
                      style={styles.iconButton}
                    >
                      <MaterialIcons
                        name="add-circle-outline"
                        size={26}
                        color="#444"
                      />
                    </Pressable>
                  </HStack>

                  <Button onPress={onSubmit}>
                    <ButtonText>Submit</ButtonText>
                  </Button>

                  {result ? <SummaryText>{result}</SummaryText> : null}
                </VStack>
              </Box>

              <Box className="border border-outline-200 rounded-xl p-4 bg-white">
                <VStack className="gap-3">
                  <Heading size="md">Offline queue</Heading>
                  <Text>Pending submissions: {outbox.length}</Text>
                  <HStack className="gap-2 flex-wrap">
                    <Button onPress={onSyncNow} variant="outline" size="sm">
                      <ButtonText>Sync now</ButtonText>
                    </Button>
                    <Button onPress={onClearOutbox} variant="outline" size="sm">
                      <ButtonText>Clear</ButtonText>
                    </Button>
                  </HStack>
                </VStack>
              </Box>
            </VStack>
          </ScrollView>
        </Box>

        {scanMode ? (
          <ScanModal
            visible={Boolean(scanMode)}
            title={scanTitle}
            mode={scanMode}
            onClose={() => setScanMode(null)}
            onScan={onScanResult}
          />
        ) : null}
      </SafeAreaView>
    </GluestackUIProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollWrapper: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  scannerContainer: {
    flex: 1,
    overflow: "hidden",
    marginHorizontal: 16,
    borderRadius: 12,
  },
  iconButton: {
    padding: 4,
  },
  codeText: {
    fontFamily: Platform.select({
      ios: "Menlo",
      android: "monospace",
      default: "monospace",
    }),
    fontSize: 12,
  },
});
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd c:/Users/yukua/Downloads/express-luck-inventory-count-app-react-native-test-public
bunx tsc --noEmit
```

Expected: No errors (or only minor warnings)

- [ ] **Step 3: Commit**

```bash
git add App.tsx
git commit -m "feat: rewrite App.tsx with gluestack-ui v3 components and NativeWind styling"
```

---

### Task 5: Verify the app runs

**Files:** None (verification only)

- [ ] **Step 1: Start the Expo dev server**

```bash
cd c:/Users/yukua/Downloads/express-luck-inventory-count-app-react-native-test-public
bun run start
```

- [ ] **Step 2: Check for build errors in terminal**

Look for any Metro bundler errors, missing module errors, or NativeWind configuration issues. Common issues:
- `Cannot find module '@/components/ui/...'` → Check `tsconfig.json` paths or `babel.config.js` module resolver
- `NativeWind not configured` → Check `metro.config.js` and `babel.config.js`
- Tailwind classes not applying → Check `global.css` import in `App.tsx`

- [ ] **Step 3: Fix any issues found and commit**

```bash
git add -A
git commit -m "fix: resolve build issues from gluestack v3 migration"
```
