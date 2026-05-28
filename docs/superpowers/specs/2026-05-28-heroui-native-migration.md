---
name: heroui-native-migration
description: Migrate inventory app from GlueStack to HeroUI Native
metadata:
  type: project
---

# HeroUI Native Migration Design

**Date**: 2026-05-28

## Overview

Migrate the Express Luck Inventory app from GlueStack UI to HeroUI Native UI library. Keep Expo/Bun stack, remove web support.

## Components

### Provider Setup
- Wrap app with `GestureHandlerRootView` → `HeroUINativeProvider`
- Remove `GluestackUIProvider` and `@gluestack-ui/config`

### Component Mapping

| GlueStack | HeroUI Native |
|-----------|--------------|
| `Box` | `Surface` |
| `Button/ButtonText` | `Button` (label built-in) |
| `Input/InputField` | `Input` with `InputGroup` |
| `Textarea/TextareaInput` | `TextArea` |
| `Switch` | `Switch` |
| `Badge/BadgeText` | `Chip` (variant: solid) |
| `Divider` | `Separator` |
| `Heading` | `Text` (size: xl, weight: bold) |
| `VStack/HStack` | Tailwind classes (`flex-col`, `flex-row`, `gap`) |
| `useToast` | `useToast` hook from `heroui-native/toast` |

### Styling Approach
- Layout via Tailwind/Uniwind classes (flex, gap, padding, margin)
- HeroUI Native components use `className` prop
- Keep `StyleSheet.create` for: scanner container, code font, safe area

### File Structure
- `App.tsx` — refactored, same logic, new components
- `index.ts` — unchanged
- `app.json` — remove web section, experiments.baseUrl
- `package.json` — update dependencies

## Dependencies

### Remove
- `@gluestack-ui/config`
- `@gluestack-ui/themed`
- `react-dom` (web not supported)

### Add
- `heroui-native`
- `react-native-reanimated@^4.1.1`
- `react-native-gesture-handler@^2.28.0`
- `react-native-worklets@^0.5.1`
- `react-native-safe-area-context@^5.6.0`
- `tailwind-variants@^3.2.2`
- `tailwind-merge@^3.4.0`

### Keep
- `expo-camera`
- `expo-status-bar`
- `expo-constants`
- `@expo/vector-icons`
- `@react-native-async-storage/async-storage`

## App Configuration (app.json)

- Remove `web` section
- Remove `experiments.baseUrl`
- Keep iOS/Android config unchanged

## Implementation Order

1. Update `package.json` dependencies
2. Create `global.css` with HeroUI Native styles
3. Refactor `App.tsx` with HeroUI Native components
4. Update `app.json`
5. Update `index.ts` if needed for babel/metro config
6. Test build