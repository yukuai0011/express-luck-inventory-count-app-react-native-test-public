import { ScrollView, View } from 'react-native';
import { useToast } from 'heroui-native';
import { useOutbox } from '../../hooks/useOutbox';
import { OutboxList } from '../../components/OutboxList';

export default function OutboxScreen() {
  const { outbox, sync, clear } = useOutbox();
  const { toast } = useToast();
  const empty = outbox.length === 0;

  const onSync = async () => {
    const n = await sync();
    toast.show({
      placement: 'top',
      variant: n > 0 ? 'success' : 'default',
      label: n > 0 ? `Synced ${n} item(s)` : 'Nothing synced',
    });
  };

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="p-4"
      keyboardShouldPersistTaps="handled"
    >
      <View className="gap-3">
        <OutboxList count={outbox.length} empty={empty} onSync={onSync} onClear={clear} />
      </View>
    </ScrollView>
  );
}
