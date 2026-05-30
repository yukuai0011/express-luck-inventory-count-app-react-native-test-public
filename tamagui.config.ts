import { createTamagui } from 'tamagui';
import { config as baseConfig } from '@tamagui/config';

const tamaguiConfig = createTamagui(baseConfig);

export type TamaguiConfig = typeof tamaguiConfig;

declare module 'tamagui' {
  interface TamaguiCustomConfig extends TamaguiConfig {}
}

export default tamaguiConfig;