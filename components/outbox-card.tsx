import { useCallback } from "react";
import { Alert, View } from "react-native";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Text } from "@/components/ui/text";
import { useToast } from "@/components/toast/toast-provider";
import { useAppState } from "@/lib/app-state";
import { syncOutbox } from "@/lib/api";

export const OutboxCard = () => {
  const { outbox, setOutbox } = useAppState();
  const toast = useToast();

  const onSync = useCallback(async () => {
    if (!outbox.length) {
      toast.show("Nothing to sync");
      return;
    }
    const { remaining, success } = await syncOutbox(outbox);
    await setOutbox(remaining);
    toast.show(success > 0 ? `Synced ${success} item(s)` : "Nothing synced");
  }, [outbox, setOutbox, toast]);

  const onClear = useCallback(() => {
    Alert.alert("Confirm", "Clear all pending submissions?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "OK",
        style: "destructive",
        onPress: async () => {
          await setOutbox([]);
        },
      },
    ]);
  }, [setOutbox]);

  return (
    <Card className="gap-2">
      <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100">
        Offline queue
      </Text>
      <Text className="text-sm text-gray-600 dark:text-gray-400">
        Pending submissions: {outbox.length}
      </Text>
      <View className="flex-row flex-wrap gap-2">
        <Button size="sm" variant="outline" onPress={onSync}>
          <Text>Sync now</Text>
        </Button>
        <Button size="sm" variant="outline" onPress={onClear}>
          <Text>Clear</Text>
        </Button>
      </View>
    </Card>
  );
};
