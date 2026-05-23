# GlueStack UI v1 → v3 Migration (NativeWind Path)

## Overview
Migrate the Expo React Native app from GlueStack UI v1 (`@gluestack-ui/themed` 1.x with token-prop styling) to GlueStack UI v3's NativeWind approach (Tailwind CSS + className-based styling).

## Current State
- **Package**: `@gluestack-ui/themed` v1.1.73, `@gluestack-ui/config` v1.1.20
- **File**: Single `App.tsx` file using 13 GlueStack components
- **Styling**: Token props (`$backgroundLight0`, `$md`, `$4`, etc.)
- **Provider**: `GluestackUIProvider config={config}` from `@gluestack-ui/themed`

## Target State
- **Packages**: GlueStack v3 local components via CLI, NativeWind v4, Tailwind CSS v3
- **Styling**: Tailwind classNames (`bg-white`, `rounded-md`, `px-4`, etc.)
- **Provider**: Local `GluestackUIProvider` from `@/components/ui/gluestack-ui-provider`
- **Components**: Imported from local `@/components/ui/` directory

## Migration Steps

### Step 1: Install NativeWind + Tailwind dependencies
```bash
bunx expo install nativewind tailwindcss react-native-css-interop
```

### Step 2: Configure Tailwind CSS
Create `tailwind.config.js`:
```js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./App.tsx', './components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: { extend: {} },
  plugins: [],
};
```

Create `global.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

### Step 3: Configure NativeWind babel preset
Create or update `babel.config.js` to include `nativewind/babel`:
```js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo', 'nativewind/babel'],
  };
};
```

Create `nativewind-env.d.ts`:
```ts
/// <reference types="nativewind/types" />
```

### Step 4: Initialize GlueStack v3 via CLI
```bash
bunx gluestack-ui init --use-bun
bunx gluestack-ui add box vstack hstack button heading text input textarea badge switch divider toast
```
This creates local component files in `components/ui/` and the `GluestackUIProvider`.

### Step 5: Update App.tsx

**Imports**: Change from `@gluestack-ui/themed` to local paths:
```ts
// Before
import { Box, VStack, HStack, ... } from '@gluestack-ui/themed';
import { config } from '@gluestack-ui/config';

// After
import { GluestackUIProvider } from '@/components/ui/gluestack-ui-provider';
import { Box } from '@/components/ui/box';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Button, ButtonText } from '@/components/ui/button';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { Input, InputField } from '@/components/ui/input';
import { Textarea, TextareaInput } from '@/components/ui/textarea';
import { Badge, BadgeText } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Divider } from '@/components/ui/divider';
import { useToast } from '@/components/ui/toast';
import '@/global.css';
```

**Provider**: Remove `config` prop:
```tsx
// Before
<GluestackUIProvider config={config}>

// After
<GluestackUIProvider>
```

**Style conversion** (token props → Tailwind classNames):
| v1 Token | v3 className |
|----------|-------------|
| `bg="$backgroundLight0"` | `className="bg-white"` |
| `bg="$backgroundLight100"` | `className="bg-gray-100"` |
| `bg="$backgroundDark900"` | `className="bg-gray-900"` |
| `borderColor="$borderLight200"` | `className="border-gray-200"` |
| `color="$textLight0"` | `className="text-white"` |
| `px="$4"` | `className="px-4"` |
| `py="$3"` | `className="py-3"` |
| `p="$3"` | `className="p-3"` |
| `my="$2"` | `className="my-2"` |
| `borderRadius="$md"` | `className="rounded-md"` |
| `space="md"` | `className="gap-4"` or `space="md"` |
| `space="sm"` | `className="gap-2"` or `space="sm"` |
| `size="sm"` | `size="sm"` (unchanged) |
| `size="md"` | `size="md"` (unchanged) |
| `size="lg"` | `size="lg"` (unchanged) |
| `flex={1}` | `className="flex-1"` |
| `width={120}` | `className="w-[120px]"` |
| `opacity={0.5}` | `className="opacity-50"` |

### Step 6: Remove old packages
```bash
bun remove @gluestack-ui/config @gluestack-ui/themed
```

## Files Modified
- `package.json` — dependency changes
- `App.tsx` — imports, provider, styling
- `tailwind.config.js` — new file
- `global.css` — new file
- `babel.config.js` — new or updated file
- `nativewind-env.d.ts` — new file
- `components/ui/` — new directory (CLI-generated)

## Risks
- GlueStack CLI may generate components with slightly different APIs than expected
- NativeWind v4 compatibility with Expo SDK 54 needs verification
- Toast API may differ between v1 and v3
