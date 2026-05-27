---
name: gluestack-v3-migration
description: Upgrade gluestack from v1 to v3 using new components/ui API
metadata:
  type: project
---

# gluestack v3 Migration Design

## Context
Upgrade this inventory scanner app from gluestack v1 (`@gluestack-ui/themed` + `@gluestack-ui/config`) to gluestack v3 using the new `components/ui` pattern.

## Decision

**Approach: Full rewrite with v3 components/ui pattern**

- Replace all imports from `@gluestack-ui/themed` with `@gluestack-ui/react`
- Use `components/ui` for Input, Textarea, Switch, Badge
- Remove `@gluestack-ui/config` (v3 doesn't need it)
- Keep identical business logic and visual layout
- Extract Profile, Work, OfflineQueue into sub-components

## Component Mapping

| v1 | v3 |
|---|---|
| `@gluestack-ui/themed` Box, Text, VStack, HStack | `@gluestack-ui/react` |
| `@gluestack-ui/themed` Button, ButtonText | `@gluestack-ui/react` |
| `@gluestack-ui/themed` Input, InputField | `@gluestack-ui/react/components/ui` Input |
| `@gluestack-ui/themed` Textarea, TextareaInput | `@gluestack-ui/react/components/ui` Textarea |
| `@gluestack-ui/themed` Switch | `@gluestack-ui/react/components/ui` Switch |
| `@gluestack-ui/themed` Badge, BadgeText | `@gluestack-ui/react/components/ui` Badge |
| `@gluestack-ui/themed` Divider | `@gluestack-ui/react/components/ui` Divider |
| `@gluestack-ui/themed` Heading | `@gluestack-ui/react` Heading |
| `@gluestack-ui/themed` GluestackUIProvider + config | `@gluestack-ui/react` GluestackUIProvider |
| `@gluestack-ui/themed` useToast | `@gluestack-ui/react` useToast |
| `@expo/vector-icons` MaterialIcons | unchanged |

## File Changes
- `App.tsx` — rewrite with new imports and sub-components
- `package.json` — update gluestack dependencies to v3

## Out of Scope
- Visual redesign (layout stays the same)
- Business logic changes
- New features

## Verification
- App runs with `bun start`
- All three sections render: Profile, Work, Offline Queue
- Camera scanning works
- Offline queue persists and syncs