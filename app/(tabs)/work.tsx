import React, { useCallback, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import {
  Button,
  Input,
  Label,
  Switch,
  Text,
  TextField,
  useToast,
} from 'heroui-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useProfile } from '@/hooks/useProfile';
import { useOutbox } from '@/hooks/useOutbox';
import { useCameraPermission } from '@/hooks/useCameraPermission';
import { sanitizeEndpoint } from '@/lib/profile';
import { ResultBlock } from '@/components/ResultBlock';
import { ScanModal } from '@/components/ScanModal';

const WorkTab = () => {
  const { toast } = useToast();
  const { profile } = useProfile();
  const { enqueue } = useOutbox();
  const { ensure } = useCameraPermission();

  const [packageNo, setPackageNo] = useState('');
  const [intact, setIntact] = useState(true);
  const [quantity, setQuantity] = useState(0);
  const [result, setResult] = useState('');
  const [scannerOpen, setScannerOpen] = useState(false);

  const onScanResult = useCallback(
    (data: string) => {
      const trimmed = data.trim();
      if (trimmed) setPackageNo(trimmed);
      return true;
    },
    []
  );

  const startScan = useCallback(async () => {
    if (!(await ensure())) return;
    setScannerOpen(true);
  }, [ensure]);

  const onSubmit = useCallback(async () => {
    setResult('');
    if (!profile) {
      toast.show({ variant: 'warning', label: 'Save a profile first.' });
      return;
    }
    const pkg = packageNo.trim();
    if (!pkg) {
      toast.show({ variant: 'warning', label: 'Package number required.' });
      return;
    }
    const url = sanitizeEndpoint(profile.apiEndpoint ?? '');
    if (!url.startsWith('http')) {
      toast.show({ variant: 'danger', label: 'Profile API endpoint invalid.' });
      return;
    }
    const payload = {
      orderNo: profile.orderNo,
      recordingNo: profile.recordingNo,
      locationCode: profile.locationCode,
      packageNo: pkg,
      quantity: intact ? 0 : quantity,
      packageIntact: intact,
    };
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
    const token = (profile.bearerToken ?? '').toString().trim();
    if (token) headers.Authorization = `Bearer ${token}`;
    try {
      const resp = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });
      const ct = resp.headers.get('content-type') ?? '';
      const bodyOut = ct.includes('application/json')
        ? JSON.stringify(await resp.json(), null, 2)
        : await resp.text();
      setResult(
        `POST ${url}\nPayload:\n${JSON.stringify(payload, null, 2)}\n\nResponse:\n{\n  "status": ${resp.status},\n  "ok": ${resp.status >= 200 && resp.status < 300},\n  "body": ${JSON.stringify(bodyOut)}\n}`
      );
    } catch (error) {
      await enqueue({
        url,
        headers: { Authorization: token ? `Bearer ${token}` : null },
        payload,
      });
      setResult(
        `Request failed (likely offline). Saved to queue.\n${(error as Error).toString()}`
      );
    }
  }, [enqueue, intact, packageNo, profile, quantity, toast]);

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="p-4 gap-4"
      keyboardShouldPersistTaps="handled"
    >
      <Text className="text-2xl font-bold">Work</Text>

      <View className="gap-3 rounded-xl border border-border p-4">
        <Text className="text-base font-semibold">2) Work</Text>
        <Text className="text-sm text-muted">
          Use your saved profile to submit package records.
        </Text>

        <View className="flex-row items-center gap-2">
          <View className="flex-1">
            <TextField>
              <Label>Package number</Label>
              <Input
                value={packageNo}
                onChangeText={setPackageNo}
                placeholder="Scan or type package number"
              />
            </TextField>
          </View>
          <Button size="sm" variant="outline" onPress={startScan}>
            <Button.Label>Scan</Button.Label>
          </Button>
        </View>

        <View className="flex-row items-center gap-3">
          <Switch isSelected={intact} onSelectedChange={setIntact} />
          <Text>Package intact</Text>
        </View>

        <View
          className="flex-row items-center gap-3"
          style={{ opacity: intact ? 0.5 : 1 }}
        >
          <Pressable
            disabled={intact}
            onPress={() => setQuantity((q) => Math.max(0, q - 1))}
            className="p-1"
          >
            <MaterialIcons name="remove-circle-outline" size={26} color="#444" />
          </Pressable>
          <View className="w-[120px]">
            <TextField>
              <Label>Quantity</Label>
              <Input
                value={String(quantity)}
                editable={false}
                className="text-center"
              />
            </TextField>
          </View>
          <Pressable
            disabled={intact}
            onPress={() => setQuantity((q) => q + 1)}
            className="p-1"
          >
            <MaterialIcons name="add-circle-outline" size={26} color="#444" />
          </Pressable>
        </View>

        <Button onPress={onSubmit}>
          <Button.Label>Submit</Button.Label>
        </Button>

        {result ? <ResultBlock>{result}</ResultBlock> : null}
      </View>

      {scannerOpen ? (
        <ScanModal
          visible
          title="Scan Package"
          mode="barcode"
          onClose={() => setScannerOpen(false)}
          onScan={onScanResult}
        />
      ) : null}
    </ScrollView>
  );
};

export default WorkTab;
