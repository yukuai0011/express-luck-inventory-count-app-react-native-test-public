import { Alert } from 'react-native';
import { Button, Card, HStack, Text, useToast } from 'heroui-native';

type Props = {
  count: number;
  empty: boolean;
  onSync: () => void;
  onClear: () => void;
};

export function OutboxList({ count, empty, onSync, onClear }: Props) {
  const toast = useToast();

  const confirmClear = () => {
    Alert.alert('Confirm', 'Clear all pending submissions?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'OK',
        style: 'destructive',
        onPress: async () => {
          await onClear();
          toast.show({ placement: 'top', variant: 'default', message: 'Queue cleared' });
        },
      },
    ]);
  };

  return (
    <Card>
      <Card.Header>
        <Card.Title>Offline queue</Card.Title>
        <Card.Description>Pending submissions: {count}</Card.Description>
      </Card.Header>
      <Card.Body className="gap-3">
        <HStack className="gap-2 flex-wrap">
          <Button variant="secondary" isDisabled={empty} onPress={onSync}>
            <Button.Label>Sync now</Button.Label>
          </Button>
          <Button variant="tertiary" isDisabled={empty} onPress={confirmClear}>
            <Button.Label>Clear</Button.Label>
          </Button>
        </HStack>
        {empty ? (
          <Text className="text-muted">No pending submissions.</Text>
        ) : null}
      </Card.Body>
    </Card>
  );
}
