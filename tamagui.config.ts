import { createTamagui } from 'tamagui';
import * as tamaguiConfig from '@tamagui/config';

const baseConfig =
  (tamaguiConfig as { config?: unknown }).config ??
  (tamaguiConfig as { default?: unknown }).default ??
  tamaguiConfig;

const config = createTamagui(baseConfig);

export default config;
export type AppConfig = typeof config;
