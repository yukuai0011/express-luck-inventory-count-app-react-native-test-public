# gluestack v3 Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade gluestack from v1 (`@gluestack-ui/themed` + `@gluestack-ui/config`) to v3 (`@gluestack-ui/react` with `components/ui` pattern)

**Architecture:** Single-file rewrite of App.tsx with updated imports and sub-components extracted. Update package.json dependencies. No visual changes, same business logic.

**Tech Stack:** React Native, Expo, Bun, gluestack v3

---

## File Structure

- `App.tsx` — rewrite with new gluestack v3 imports, extracted sub-components
- `package.json` — update gluestack dependencies to v3
- `app.json` — no changes needed

---

## Task 1: Update package.json

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Update gluestack dependencies to v3**

```json
{
  "dependencies": {
    "@gluestack-ui/react": "latest",
    "@react-native-async-storage/async-storage": "^3.0.2",
    "@react-native-async-storage/expo-with-async-storage": "^1.0.0",
    "expo": "~54.0.33",
    "expo-camera": "~17.0.10",
    "expo-status-bar": "~3.0.9",
    "react": "19.2.6",
    "react-dom": "19.2.6",
    "react-native": "0.81.5",
    "react-native-svg": "^15.15.4"
  }
}
```

Remove `@gluestack-ui/config` and `@gluestack-ui/themed` entirely.

- [ ] **Step 2: Commit**

```bash
git add package.json
git commit -m "chore: upgrade gluestack to v3"
```

---

## Task 2: Rewrite App.tsx with gluestack v3

**Files:**
- Create: `App.tsx` (overwrite)

The app has three sections: Profile, Work, OfflineQueue. Extract each as a sub-component.

**New import structure:**
```typescript
import {
  Box,
  Text,
  Button,
  Heading,
  VStack,
  HStack,
  Divider,
  GluestackUIProvider,
  useToast,
} from '@gluestack-ui/react';
import { Input } from '@gluestack-ui/react/components/ui/input';
import { Textarea } from '@gluestack-ui/react/components/ui/textarea';
import { Switch } from '@gluestack-ui/react/components/ui/switch';
import { Badge, BadgeText } from '@gluestack-ui/react/components/ui/badge';
```

**Sub-components to extract:**
1. `ProfileSection` — Recording profile card (scanning, paste JSON, bearer token, save/clear)
2. `WorkSection` — Package scanning, intact toggle, quantity, submit
3. `OfflineQueueSection` — Pending count, sync, clear
4. `ScanModal` — Camera scanner modal (keep existing logic)

**Key changes per component:**

### ProfileSection props
```typescript
type ProfileSectionProps = {
  scannedApi: string | null;
  scannedInfo: { orderNo: string; recordingNo: number; locationCode: string } | null;
  pasteJson: string;
  bearerToken: string;
  profile: Profile | null;
  onSetPasteJson: (v: string) => void;
  onDetectPaste: () => void;
  onSaveProfile: () => void;
  onClearSavedProfile: () => void;
  onStartScan: (mode: ScanMode) => void;
  onReset: () => void;
};
```

### WorkSection props
```typescript
type WorkSectionProps = {
  packageNo: string;
  intact: boolean;
  quantity: number;
  result: string;
  profile: Profile | null;
  onSetPackageNo: (v: string) => void;
  onSetIntact: (v: boolean) => void;
  onSetQuantity: (v: number) => void;
  onSubmit: () => void;
  onStartScan: (mode: ScanMode) => void;
};
```

### OfflineQueueSection props
```typescript
type OfflineQueueSectionProps = {
  outbox: OutboxItem[];
  onSyncNow: () => void;
  onClearOutbox: () => void;
};
```

**Component mapping:**
- `Badge` bg prop: use `bg` from `@gluestack-ui/react/components/ui/badge`
- `Switch`: from `@gluestack-ui/react/components/ui/switch`
- `Divider`: from `@gluestack-ui/react/components/ui/divider`

**ProfileSection (Profile card):**
```tsx
export function ProfileSection({
  scannedApi, scannedInfo, pasteJson, bearerToken, profile,
  onSetPasteJson, onDetectPaste, onSaveProfile, onClearSavedProfile,
  onStartScan, onReset,
}: ProfileSectionProps) {
  const pillVariant = (ok: boolean) => ok ? 'success600' : 'backgroundDark500';
  return (
    <Box style={styles.card}>
      <VStack space="sm">
        <Heading size="md">1) Recording Profile</Heading>
        <Text>Scan two QR codes in any order to establish a profile: API Endpoint and Recording Info. Then save.</Text>
        <HStack space="sm">
          <Badge bg={pillVariant(Boolean(scannedApi))}>
            <BadgeText color="$textLight0">API Endpoint: {scannedApi ? 'ready' : 'missing'}</BadgeText>
          </Badge>
          <Badge bg={pillVariant(Boolean(scannedInfo))}>
            <BadgeText color="$textLight0">Recording Info: {scannedInfo ? 'ready' : 'missing'}</BadgeText>
          </Badge>
        </HStack>
        <HStack space="sm" flexWrap="wrap">
          <Button onPress={() => onStartScan('qr')} size="sm">
            <ButtonText>Scan QR</ButtonText>
          </Button>
          <Button onPress={onReset} variant="outline" size="sm">
            <ButtonText>Reset</ButtonText>
          </Button>
        </HStack>
        <Divider my="$2" />
        <Text>Paste JSON instead</Text>
        <Textarea>
          <TextareaInput
            value={pasteJson}
            onChangeText={onSetPasteJson}
            placeholder='{"apiEndpoint":"<https://...>"} or {"orderNo":"1234","recordingNo":1,"locationCode":"FG HU"}'
            autoCapitalize="none"
          />
        </Textarea>
        <Button onPress={onDetectPaste} variant="outline" size="sm">
          <ButtonText>Detect</ButtonText>
        </Button>
        <Divider my="$2" />
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
        <HStack space="sm" flexWrap="wrap">
          <Button onPress={onSaveProfile} isDisabled={!hasBothScans} size="sm">
            <ButtonText>Save Profile</ButtonText>
          </Button>
          <Button onPress={onClearSavedProfile} variant="outline" size="sm">
            <ButtonText>Clear Saved Profile</ButtonText>
          </Button>
        </HStack>
        <Text>Current Profile</Text>
        <Box borderWidth={1} borderColor="$borderLight200" borderRadius="$md" p="$3" bg="$backgroundLight0">
          <Text style={styles.codeText}>{profileSummary}</Text>
        </Box>
      </VStack>
    </Box>
  );
}
```

### WorkSection (Work card):
```tsx
export function WorkSection({
  packageNo, intact, quantity, result, profile,
  onSetPackageNo, onSetIntact, onSetQuantity, onSubmit, onStartScan,
}: WorkSectionProps) {
  return (
    <Box style={styles.card}>
      <VStack space="sm">
        <Heading size="md">2) Work</Heading>
        <Text>Use your saved profile to submit package records.</Text>
        <HStack space="sm" alignItems="center">
          <Box flex={1}>
            <Input>
              <InputField
                value={packageNo}
                onChangeText={onSetPackageNo}
                placeholder="Scan or type package number"
              />
            </Input>
          </Box>
          <Button onPress={() => onStartScan('barcode')} variant="outline" size="sm">
            <ButtonText>Scan</ButtonText>
          </Button>
        </HStack>
        <HStack space="sm" alignItems="center">
          <Switch value={intact} onValueChange={onSetIntact} />
          <Text>Package intact</Text>
        </HStack>
        <HStack space="sm" alignItems="center" opacity={intact ? 0.5 : 1}>
          <Pressable
            onPress={() => onSetQuantity(Math.max(0, quantity - 1))}
            disabled={intact}
            style={styles.iconButton}
          >
            <MaterialIcons name="remove-circle-outline" size={26} color="#444" />
          </Pressable>
          <Box width={120}>
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
            onPress={() => onSetQuantity(quantity + 1)}
            disabled={intact}
            style={styles.iconButton}
          >
            <MaterialIcons name="add-circle-outline" size={26} color="#444" />
          </Pressable>
        </HStack>
        <Button onPress={onSubmit}>
          <ButtonText>Submit</ButtonText>
        </Button>
        {result ? (
          <Box borderWidth={1} borderColor="$borderLight200" borderRadius="$md" p="$3" bg="$backgroundLight0">
            <Text style={styles.codeText}>{result}</Text>
          </Box>
        ) : null}
      </VStack>
    </Box>
  );
}
```

### OfflineQueueSection:
```tsx
export function OfflineQueueSection({
  outbox, onSyncNow, onClearOutbox,
}: OfflineQueueSectionProps) {
  return (
    <Box style={styles.card}>
      <VStack space="sm">
        <Heading size="md">Offline queue</Heading>
        <Text>Pending submissions: {outbox.length}</Text>
        <HStack space="sm" flexWrap="wrap">
          <Button onPress={onSyncNow} variant="outline" size="sm">
            <ButtonText>Sync now</ButtonText>
          </Button>
          <Button onPress={onClearOutbox} variant="outline" size="sm">
            <ButtonText>Clear</ButtonText>
          </Button>
        </HStack>
      </VStack>
    </Box>
  );
}
```

**Main App component:**
```tsx
export default function App() {
  const toast = useToast();
  // ... all state ...
  // ... all callbacks (keep identical logic) ...

  return (
    <GluestackUIProvider>
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="dark" />
        <Box flex={1} bg="$backgroundLight0">
          <ScrollView
            style={styles.scrollWrapper}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <VStack space="md" px="$4" py="$4">
              <Heading size="lg">Inventory Scanner PoC</Heading>
              <ProfileSection ... />
              <WorkSection ... />
              <OfflineQueueSection ... />
            </VStack>
          </ScrollView>
        </Box>
        {scanMode ? (
          <ScanModal ... />
        ) : null}
      </SafeAreaView>
    </GluestackUIProvider>
  );
}
```

- [ ] **Step 1: Run bun install to get new gluestack packages**
  Run: `cd /c/Users/yukua/Downloads/express-luck-inventory-count-app-react-native-test-public && bun install`
  Expected: New packages installed, old gluestack removed

- [ ] **Step 2: Write App.tsx with complete implementation**
  Overwrite the existing App.tsx with the new v3-based code. Use the code structure above as reference — write the full file.

- [ ] **Step 3: Run TypeScript check**
  Run: `cd /c/Users/yukua/Downloads/express-luck-inventory-count-app-react-native-test-public && bun tsc --noEmit`
  Expected: No errors (or only pre-existing errors unrelated to this change)

- [ ] **Step 4: Commit**
  ```bash
  git add App.tsx
  git commit -m "feat: migrate to gluestack v3 components/ui pattern"
  ```

---

## Verification

- [ ] Run `bun start` and verify app loads
- [ ] Check no crashes on the three main sections
- [ ] Confirm camera scanning still works (if permission granted)