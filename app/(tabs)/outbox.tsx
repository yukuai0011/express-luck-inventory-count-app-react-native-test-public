import React, { useCallback, useState } from 'react';
import { ScrollView, View } from 'react-native';
import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  Text,
  useToast,
} from 'heroui-native';
import { useOutbox } from '@/hooks/useOutbox';

const OutboxTab = () => {
  const { toast } = useToast();
  const { outbox, drain, clear } = useOutbox();
  const [clearOpen, setClearOpen] = useState(false);

  const onSync = useCallback(async () => {
    if (!outbox.length) {
      toast.show({ variant: 'default', label: 'Nothing to sync' });
      return;
    }
    const result = await drain();
    toast.show({
      variant: result.success > 0 ? 'success' : 'default',
      label:
        result.success > 0
          ? `Synced ${result.success} item(s)`
          : 'Nothing synced',
    });
  }, [drain, outbox.length, toast]);

  const onClearConfirm = useCallback(async () => {
    await clear();
    setClearOpen(false);
    toast.show({ variant: 'default', label: 'Outbox cleared' });
  }, [clear, toast]);

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="p-4 gap-4"
    >
      <Text className="text-2xl font-bold">Offline Queue</Text>

      <View className="gap-3 rounded-xl border border-border p-4">
        <Text className="text-base font-semibold">Pending submissions</Text>
        <Text className="text-sm text-muted">Pending: {outbox.length}</Text>
        <View className="flex-row flex-wrap gap-2">
          <Button size="sm" variant="outline" onPress={onSync}>
            <Button.Label>Sync now</Button.Label>
          </Button>

          <Button
            size="sm"
            variant="outline"
            onPress={() => setClearOpen(true)}
          >
            <Button.Label>Clear</Button.Label>
          </Button>
        </View>
      </View>

      <Dialog isOpen={clearOpen} onOpenChange={setClearOpen}>
        <DialogPortal>
          <DialogOverlay />
          <DialogContent>
            <DialogClose variant="ghost" />
            <View className="mb-5 gap-1.5">
              <DialogTitle>Clear all pending submissions?</DialogTitle>
              <DialogDescription>
                This permanently removes every queued request.
              </DialogDescription>
            </View>
            <View className="flex-row justify-end gap-3">
              <Button
                size="sm"
                variant="ghost"
                onPress={() => setClearOpen(false)}
              >
                <Button.Label>Cancel</Button.Label>
              </Button>
              <Button size="sm" onPress={onClearConfirm}>
                <Button.Label>OK</Button.Label>
              </Button>
            </View>
          </DialogContent>
        </DialogPortal>
      </Dialog>
    </ScrollView>
  );
};

export default OutboxTab;
