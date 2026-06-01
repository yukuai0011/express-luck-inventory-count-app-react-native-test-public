import { HeroUINativeProvider, type HeroUINativeConfig } from 'heroui-native';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';

const config: HeroUINativeConfig = {
  textProps: { allowFontScaling: true, maxFontSizeMultiplier: 1.5 },
};

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <HeroUINativeProvider config={config}>
        <StatusBar style="auto" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="(modal)/scan"
            options={{ presentation: 'fullScreenModal' }}
          />
        </Stack>
      </HeroUINativeProvider>
    </GestureHandlerRootView>
  );
}
