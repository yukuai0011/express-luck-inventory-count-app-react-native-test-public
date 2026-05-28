# HeroUI Native Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the Express Luck Inventory app from GlueStack UI to HeroUI Native, remove web support, keep Expo/Bun

**Architecture:** Single-file app refactor with HeroUI Native components. Uniwind/Tailwind for layout, custom StyleSheet for scanner/camera specifics. Remove web config, keep native platforms.

**Tech Stack:** Expo, Bun, React Native, HeroUI Native, expo-camera, AsyncStorage

---

## Files to Modify

- `package.json` — update dependencies
- `app.json` — remove web section, experiments
- `App.tsx` — refactor all UI components
- `index.ts` — likely needs babel config for reanimated (check after install)
- Create: `global.css` — HeroUI Native styles

---

## Task 1: Update package.json dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Remove GlueStack and web-related packages**

```json
"dependencies": {
  "@gluestack-ui/config": "^1.1.20",
  "@gluestack-ui/themed": "^1.1.73",
  "react-dom": "19.2.6",
}
```

- [ ] **Step 2: Add HeroUI Native and peer dependencies**

```json
"dependencies": {
  "heroui-native": "^1.0.0",
  "react-native-reanimated": "^4.1.1",
  "react-native-gesture-handler": "^2.28.0",
  "react-native-worklets": "^0.5.1",
  "react-native-safe-area-context": "^5.6.0",
  "tailwind-variants": "^3.2.2",
  "tailwind-merge": "^3.4.0",
}
```

- [ ] **Step 3: Keep existing packages unchanged**

Keep: expo, expo-camera, expo-status-bar, @expo/vector-icons, @react-native-async-storage/async-storage, react-native-svg

Run: `bun install` to install new dependencies

---

## Task 2: Create global.css with HeroUI Native styles

**Files:**
- Create: `global.css` at project root

- [ ] **Step 1: Create global.css with Tailwind and HeroUI imports**

```css
@import 'tailwindcss';
@import 'uniwind';

@import 'heroui-native/styles';

@source './node_modules/heroui-native/lib';
```

- [ ] **Step 2: Add to app.json expo/css Interpolation config**

Add to `app.json` under `expo`:
```json
"cssInterop": "./global.css"
```

---

## Task 3: Refactor App.tsx with HeroUI Native components

**Files:**
- Modify: `App.tsx`

- [ ] **Step 1: Update imports**

Replace GlueStack imports with HeroUI Native:
```tsx
// Remove:
import {
  Badge,
  BadgeText,
  Box,
  Button,
  ButtonText,
  Divider,
  GluestackUIProvider,
  Heading,
  HStack,
  Input,
  InputField,
  Switch,
  Text,
  Textarea,
  TextareaInput,
  useToast,
  VStack,
} from '@gluestack-ui/themed';
import { config } from '@gluestack-ui/config';

// Add:
import { HeroUINativeProvider, Button, Input, TextArea, Switch, Chip, Separator, Surface, Text, useToast } from 'heroui-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
```

- [ ] **Step 2: Update provider wrapping**

Replace:
```tsx
<GluestackUIProvider config={config}>
  <SafeAreaView ...>
```

With:
```tsx
<GestureHandlerRootView style={{ flex: 1 }}>
  <HeroUINativeProvider>
    <SafeAreaView ...>
```

And close with:
```tsx
    </HeroUINativeProvider>
  </GestureHandlerRootView>
```

- [ ] **Step 3: Replace Box with Surface**

Replace `<Box ...>` with `<Surface ... className="...">` where className uses tailwind classes

- [ ] **Step 4: Replace Button/ButtonText with Button**

Replace:
```tsx
<Button onPress={...} size="sm">
  <ButtonText>Label</ButtonText>
</Button>
```
With:
```tsx
<Button onPress={...} size="sm">Label</Button>
```

Remove variant `"outline"` → use `variant="bordered"` or just default

- [ ] **Step 5: Replace Input/InputField with Input**

Use `Input` with `InputGroup` or standalone `Input`:
```tsx
<Input
  className="border border-border"
  placeholder="..."
  value={value}
  onChangeText={setValue}
/>
```

For secure text entry use `isSecureTextEntry` prop

- [ ] **Step 6: Replace Textarea/TextareaInput with TextArea**

```tsx
<TextArea
  className="border border-border"
  placeholder="..."
  value={value}
  onChangeText={setValue}
/>
```

- [ ] **Step 7: Replace Badge/BadgeText with Chip**

```tsx
<Chip variant="solid" className={ok ? 'bg-success' : 'bg-muted'}>
  Label
</Chip>
```

- [ ] **Step 8: Replace Divider with Separator**

```tsx
<Separator className="my-2" />
```

- [ ] **Step 9: Replace Heading with Text**

```tsx
<Text size="xl" weight="bold">Heading</Text>
```

- [ ] **Step 10: Replace VStack/HStack with flex layout**

Replace VStack/HStack with View and tailwind classes:
```tsx
// VStack space="md" px="$4" py="$4"
<View className="flex-col gap-4 px-4 py-4">

// HStack space="sm" alignItems="center"
<View className="flex-row gap-2 items-center">
```

- [ ] **Step 11: Update toast usage**

Replace toast.show render with HeroUI toast:
```tsx
const toast = useToast();

toast.show({
  message: 'text here',
  variant: 'flat',
  color: 'default', // or 'success', 'warning', 'danger'
});
```

- [ ] **Step 12: Update card styles**

Replace card style object:
```tsx
// Old:
const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 16,
    backgroundColor: '#ffffff',
  },
});

// New: Use className in Surface
<Surface className="border border-border rounded-xl p-4 bg-background">
```

---

## Task 4: Update app.json

**Files:**
- Modify: `app.json`

- [ ] **Step 1: Remove web and experiments sections**

Remove:
```json
"web": {
  "favicon": "./assets/favicon.png"
},
"experiments": {
  "baseUrl": "/express-luck-inventory-count-app-react-native-test-public"
}
```

- [ ] **Step 2: Add cssInterop**

Add to `expo` section:
```json
"cssInterop": "./global.css"
```

- [ ] **Step 3: Remove react-native-svg (may conflict with heroui-native's version)**

Check if heroui-native includes it. If peer dep issues arise, remove explicit react-native-svg and let heroui-native bring its version.

---

## Task 5: Verify build

**Files:**
- Check: `index.ts` (may need babel.config.js for reanimated)
- Test: Android build

- [ ] **Step 1: Run expo prebuild to generate android folder**

Run: `bun expo prebuild --clean`

- [ ] **Step 2: Build Android debug APK**

Run: `bun expo run:android --variant debug`

Expected: Clean build, app launches with HeroUI Native components

---

## Implementation Notes

### Component Mapping Reference

| Old | New | Notes |
|-----|-----|-------|
| `Box` | `Surface` | Use className for tailwind |
| `Button + ButtonText` | `Button` | Label is children |
| `Input + InputField` | `Input` | Use InputGroup for slots |
| `Textarea + TextareaInput` | `TextArea` | Standalone component |
| `Badge + BadgeText` | `Chip` | variant="solid" |
| `Divider` | `Separator` | |
| `Heading` | `Text size="xl" weight="bold"` | |
| `VStack` | `View className="flex-col"` | |
| `HStack` | `View className="flex-row"` | |

### Styling Notes

- Use `className` for Tailwind/Uniwind classes on all HeroUI Native components
- For layout: `flex-1`, `flex-col`, `flex-row`, `gap-2`, `gap-4`, `px-4`, `py-4`
- For spacing: `p-4`, `m-4`, `mb-2`, `mt-4`
- For borders: `border border-border rounded-xl`
- For backgrounds: `bg-background`, `bg-surface`
- Keep some StyleSheet for: scanner camera container, safe area, code font family

### Toast Variants

HeroUI Native toast uses `variant` and `color` props:
- `variant`: `'flat'` | `'bordered'` | `'solid'`
- `color`: `'default'` | `'success'` | `'warning'` | `'danger'`