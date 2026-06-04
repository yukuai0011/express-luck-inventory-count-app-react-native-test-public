import { Pressable, View } from "react-native";
import { useUniwind } from "uniwind";
import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";
import { setAndPersistTheme } from "./theme-provider";

const THEMES = [
  { name: "light", label: "Light" },
  { name: "dark", label: "Dark" },
  { name: "system", label: "System" },
] as const;

export const ThemeToggle = () => {
  const { theme } = useUniwind();
  const active = theme;

  return (
    <View className="flex-row gap-2">
      {THEMES.map((t) => {
        const isActive = active === t.name;
        return (
          <Pressable
            key={t.name}
            onPress={() => setAndPersistTheme(t.name)}
            className={cn(
              "rounded-md px-3 py-1.5",
              isActive
                ? "bg-blue-600 dark:bg-blue-500"
                : "bg-gray-200 dark:bg-gray-800"
            )}
          >
            <Text
              className={cn(
                "text-xs",
                isActive
                  ? "text-white"
                  : "text-gray-900 dark:text-gray-100"
              )}
            >
              {t.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
};
