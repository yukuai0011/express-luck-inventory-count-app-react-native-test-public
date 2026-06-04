import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import "../global.css";
import { AppStateProvider } from "@/lib/app-state";
import { ToastProvider } from "@/components/toast/toast-provider";
import { ThemeProvider } from "@/components/theme/theme-provider";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AppStateProvider>
          <ToastProvider>
            <StatusBar style="auto" />
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="scan" options={{ presentation: "modal" }} />
            </Stack>
          </ToastProvider>
        </AppStateProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
