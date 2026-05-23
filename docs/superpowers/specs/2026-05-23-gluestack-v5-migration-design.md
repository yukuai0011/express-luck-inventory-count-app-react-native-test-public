# gluestack-ui v1 → v5 Alpha Migration Design

**Date:** 2026-05-23
**Status:** Approved
**Scope:** Migrate from `@gluestack-ui/themed` v1 to gluestack-ui v5 alpha with NativeWind v5 + Tailwind CSS v4

## Context

The project is a single-file Expo SDK 54 inventory scanner PoC (`App.tsx`). It uses gluestack-ui v1 with 17 imports (`@gluestack-ui/themed` + `@gluestack-ui/config`), no custom theming, and stock config. The entire app lives in one file, making migration scope small and contained.

The user wants to upgrade to gluestack v5 alpha, which introduces a fundamentally different architecture: NativeWind v5 + Tailwind CSS v4, copy-paste component model, and semantic token system.

## Current State

- **Packages:** `@gluestack-ui/themed@^1.1.73`, `@gluestack-ui/config@^1.1.20`
- **Components used:** GluestackUIProvider, Box, VStack, HStack, Heading, Text, Button, ButtonText, Input, InputField, Textarea, TextareaInput, Switch, Badge, BadgeText, Divider, useToast
- **Theming:** None — uses stock `@gluestack-ui/config`
- **Routing:** None — uses `registerRootComponent`, not Expo Router
- **Entry:** `index.ts` → `App.tsx`

## Target State

- **Packages:** `@gluestack-ui/core`, `@gluestack-ui/utils`, `nativewind`, `react-native-css`, `tailwindcss` v4
- **Components:** Installed locally via `npx gluestack-ui@alpha add`, imported from `@/components/ui/`
- **Theming:** Tailwind CSS v4 via `global.css` with CSS-first configuration
- **Provider:** `GluestackUIProvider` with `mode="light"` prop (no config object)

## Package Changes

### Remove
- `@gluestack-ui/themed`
- `@gluestack-ui/config`

### Add (dependencies)
- `@gluestack-ui/core@^5.0.0-alpha.0`
- `@gluestack-ui/utils@^5.0.1-alpha.0`
- `nativewind@^5.0.0-preview.2`
- `react-native-css@^3.0.4`
- `react-native-reanimated@~4.2.1`
- `react-native-worklets@^0.7.1`
- `@legendapp/motion@^2.4.0`
- `react-aria@^3.45.0`
- `react-stately@^3.39.0`
- `tailwind-variants@^0.1.20`

### Add (dev dependencies)
- `tailwindcss@^4.2.0`
- `@tailwindcss/postcss@^4.2.0`

### Pin via overrides
- `lightningcss@1.30.1`

## New Files

| File | Purpose |
|------|---------|
| `global.css` | Tailwind v4 CSS-first theme with gluestack tokens |
| `postcss.config.js` | PostCSS config for Tailwind CSS v4 |
| `metro.config.js` | Metro bundler with NativeWind v5 wrapper |
| `react-native-css-env.d.ts` | TypeScript declarations for `react-native-css` |
| `components/ui/gluestack-ui-provider/index.tsx` | v5 GluestackUIProvider |
| `components/ui/button/index.tsx` | v5 Button + ButtonText |
| `components/ui/input/index.tsx` | v5 Input + InputField |
| `components/ui/textarea/index.tsx` | v5 Textarea + TextareaInput |
| `components/ui/switch/index.tsx` | v5 Switch |
| `components/ui/badge/index.tsx` | v5 Badge + BadgeText |
| `components/ui/divider/index.tsx` | v5 Divider |
| `components/ui/heading/index.tsx` | v5 Heading |
| `components/ui/text/index.tsx` | v5 Text |
| `components/ui/box/index.tsx` | v5 Box |
| `components/ui/vstack/index.tsx` | v5 VStack |
| `components/ui/hstack/index.tsx` | v5 HStack |
| `components/ui/toast/index.tsx` | v5 Toast |

## App.tsx Migration Details

### Import Changes
```tsx
// Before
import { Box, Button, ButtonText, ... } from '@gluestack-ui/themed';
import { config } from '@gluestack-ui/config';

// After
import { GluestackUIProvider } from '@/components/ui/gluestack-ui-provider';
import { Box } from '@/components/ui/box';
import { Button, ButtonText } from '@/components/ui/button';
import { Input, InputField } from '@/components/ui/input';
import { Textarea, TextareaInput } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge, BadgeText } from '@/components/ui/badge';
import { Divider } from '@/components/ui/divider';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { useToast } from '@/components/ui/toast';
```

### Provider Change
```tsx
// Before
<GluestackUIProvider config={config}>

// After
<GluestackUIProvider mode="light">
```

### Token Migration (approximate mapping)
| v1 Token | v5 Equivalent | Notes |
|----------|--------------|-------|
| `$backgroundLight0` | `$background` or `bg-background-0` | White background |
| `$borderLight200` | `$border` or `border-border-200` | Light border |
| `$textLight0` | `$background` (for white text) | Semantic swap |
| `$backgroundDark900` | `$backgroundDark` or `bg-backgroundDark-900` | Dark toast bg |
| `$success600` | `$success` or `bg-success-600` | Green badge |
| `$backgroundDark500` | `$muted` or `bg-muted-500` | Gray badge |
| Spacing `$2`, `$3`, `$4` | Same tokens or `gap-2`, `p-3`, `px-4` | Check v5 token names |

### Props Changes
- `isDisabled` → `isDisabled` (same, but Button now extends Pressable)
- `variant="outline"` → `variant="outline"` (same)
- `space="md"` on VStack/HStack → may need className `gap-3` or v5 `space` prop
- `size="sm"/"md"/"lg"` → same names, `xs` added as new option

### useToast API
The v5 toast API differs:
- Uses `ToastProvider` wrapping the app
- `toast.show()` uses a component-based approach
- Custom render may change to `toast.show({ render: () => <Toast>...</Toast> })`

## Risks

1. **Alpha instability** — v5 alpha may have breaking changes between releases
2. **NativeWind v5 preview** — some features may not work as expected
3. **Web support** — v5 alpha is native-only; web may not work
4. **Token mapping** — visual differences expected when switching from numerical to semantic tokens
5. **Build complexity** — PostCSS + Metro + NativeWind adds build pipeline complexity

## Migration Steps

1. Run `bunx gluestack-ui@alpha init` to scaffold provider and config
2. Install all new dependencies via bun
3. Create config files (postcss, metro, global.css, type declarations)
4. Add components via `bunx gluestack-ui@alpha add` for each component
5. Update App.tsx (imports, provider, tokens, toast API)
6. Test with `bun start`
