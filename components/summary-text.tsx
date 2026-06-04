import { Platform, View } from "react-native";
import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";

export const SummaryText = ({ children, className }: { children: string; className?: string }) => (
  <View
    className={cn(
      "rounded-md border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900",
      className
    )}
  >
    <Text
      className="text-xs"
      style={{
        fontFamily: Platform.select({
          ios: "Menlo",
          android: "monospace",
          default: "monospace",
        }),
      }}
    >
      {children}
    </Text>
  </View>
);
