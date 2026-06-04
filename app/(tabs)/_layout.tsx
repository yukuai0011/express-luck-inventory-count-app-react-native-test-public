import { Tabs } from "expo-router";
import { Text } from "@/components/ui/text";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarLabel: ({ children }) => (
          <Text className="text-xs">{children}</Text>
        ),
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Profile" }} />
      <Tabs.Screen name="work" options={{ title: "Work" }} />
      <Tabs.Screen name="outbox" options={{ title: "Outbox" }} />
    </Tabs>
  );
}
