import { ScrollView, View } from "react-native";
import { ProfileCard } from "@/components/profile-card";
import { Text } from "@/components/ui/text";
import { ThemeToggle } from "@/components/theme/theme-toggle";

export default function ProfileTab() {
  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="gap-4 p-4 pb-8"
    >
      <View className="flex-row items-center justify-between">
        <Text className="text-2xl font-bold">Inventory Scanner</Text>
        <ThemeToggle />
      </View>
      <ProfileCard />
    </ScrollView>
  );
}
