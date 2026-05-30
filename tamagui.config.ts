import { createTamagui } from 'tamagui'
import { defaultConfig } from '@tamagui/config/v4'

const tamagui = createTamagui(defaultConfig)

export type Conf = typeof tamagui

declare module 'tamagui' {
  interface TamaguiCustomConfig extends Conf {}
}

export default tamagui
