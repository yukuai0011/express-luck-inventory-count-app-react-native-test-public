import { useCallback } from 'react';
import { router } from 'expo-router';
import {
  Button,
  Card,
  HStack,
  Label,
  Switch,
  Text,
  TextField,
} from 'heroui-native';
import { registerScanHandler } from '../lib/scanBridge';

type Props = {
  packageNo: string;
  setPackageNo: (v: string) => void;
  intact: boolean;
  setIntact: (v: boolean) => void;
  quantity: number;
  setQuantity: (v: number) => void;
  onSubmit: () => void;
};

export function PackageForm({
  packageNo,
  setPackageNo,
  intact,
  setIntact,
  quantity,
  setQuantity,
  onSubmit,
}: Props) {
  const openBarcodeScanner = useCallback(() => {
    registerScanHandler((value) => {
      const trimmed = value.trim();
      if (trimmed) setPackageNo(trimmed);
    });
    router.push('/(modal)/scan?mode=barcode');
  }, [setPackageNo]);

  return (
    <Card>
      <Card.Header>
        <Card.Title>Work</Card.Title>
        <Card.Description>Use your saved profile to submit package records.</Card.Description>
      </Card.Header>
      <Card.Body className="gap-3">
        <HStack className="gap-2 items-center">
          <TextField className="flex-1">
            <TextField.Input
              value={packageNo}
              onChangeText={setPackageNo}
              placeholder="Scan or type package number"
            />
          </TextField>
          <Button variant="secondary" onPress={openBarcodeScanner}>
            <Button.Label>Scan</Button.Label>
          </Button>
        </HStack>

        <HStack className="gap-2 items-center">
          <Switch isSelected={intact} onSelectedChange={setIntact} />
          <Label>Package intact</Label>
        </HStack>

        <HStack className="gap-2 items-center">
          <Button
            isIconOnly
            variant="secondary"
            size="md"
            isDisabled={intact}
            onPress={() => setQuantity(Math.max(0, quantity - 1))}
            accessibilityLabel="Decrease quantity"
          >
            <Text>-</Text>
          </Button>
          <TextField className="w-32" isDisabled={intact}>
            <TextField.Input
              value={String(quantity)}
              editable={false}
              textAlign="center"
              placeholder="Quantity"
            />
          </TextField>
          <Button
            isIconOnly
            variant="secondary"
            size="md"
            isDisabled={intact}
            onPress={() => setQuantity(quantity + 1)}
            accessibilityLabel="Increase quantity"
          >
            <Text>+</Text>
          </Button>
        </HStack>

        <Button onPress={onSubmit}>
          <Button.Label>Submit</Button.Label>
        </Button>
      </Card.Body>
    </Card>
  );
}
