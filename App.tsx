import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CameraView, BarcodeScanningResult, useCameraPermissions } from 'expo-camera';
import { MaterialIcons } from '@expo/vector-icons';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { HeroUINativeProvider } from 'heroui-native/provider';
import { useToast } from 'heroui-native/toast';
import Button from 'heroui-native/button';
import Chip from 'heroui-native/chip';
import Input from 'heroui-native/input';
import TextArea from 'heroui-native/text-area';
import Switch from 'heroui-native/switch';
import Separator from 'heroui-native/separator';
import Card from 'heroui-native/card';
import Text from 'heroui-native/text';

type RecordingInfo = {
  orderNo: string;
  recordingNo: number;
  locationCode: string;
};

type Profile = RecordingInfo & {
  apiEndpoint: string;
  bearerToken?: string | null;
};

type OutboxItem = {
  url: string;
  headers: { Authorization?: string | null };
  payload: Record<string, unknown>;
  ts: string;
};

type ScanMode = 'qr' | 'barcode';

const STORAGE_PROFILE = 'inventory_profile';
const STORAGE_OUTBOX = 'inventory_outbox';

const sanitizeEndpoint = (input: string) => {
  let value = input.trim();
  if (value.startsWith('<') && value.endsWith('>')) {
    value = value.slice(1, -1);
  }
  return value;
};

const uuidv4 = () => {
  const rand = (max: number) =>
    (Date.now() + Math.floor(Math.random() * max)) % max;
  const hex = (num: number, width: number) =>
    num.toString(16).padStart(width, '0');
  const p1 = hex(rand(0xffffffff), 8);
  const p2 = hex(rand(0xffff), 4);
  const p3 = hex((rand(0x0fff) & 0x0fff) | 0x4000, 4);
  const p4 = hex((rand(0x3fff) & 0x3fff) | 0x8000, 4);
  const p5 = hex(rand(0xffffffffffff), 12);
  return `${p1}-${p2}-${p3}-${p4}-${p5}`;
};

const parseJson = (text: string) => {
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return null;
  }
};

const parseRecordingInfo = (value: Record<string, unknown>): RecordingInfo | null => {
  const orderNo = `${value.orderNo ?? ''}`.trim();
  const locationCode = `${value.locationCode ?? ''}`.trim();
  const recordingNo = Number(value.recordingNo);
  if (!orderNo || !locationCode || Number.isNaN(recordingNo)) {
    return null;
  }
  return {
    orderNo,
    recordingNo: Math.trunc(recordingNo),
    locationCode,
  };
};

const SummaryText = ({ children }: { children: React.ReactNode }) => (
  <View className="border border-gray-200 rounded-md p-3 bg-white">
    <Text className="font-mono text-xs text-black">{children}</Text>
  </View>
);

const ScanModal = ({
  visible,
  title,
  mode,
  onClose,
  onScan,
}: {
  visible: boolean;
  title: string;
  mode: ScanMode;
  onClose: () => void;
  onScan: (value: string) => boolean;
}) => {
  const [handled, setHandled] = useState(false);

  useEffect(() => {
    if (!visible) {
      setHandled(false);
    }
  }, [visible]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-white">
        <SafeAreaView style={{ flex: 1 }}>
          <View className="flex-row items-center justify-between px-4 py-3">
            <Text.Heading className="text-lg font-semibold text-black">
              {title}
            </Text.Heading>
            <Button size="sm" variant="outline" onPress={onClose}>
              <Button.Label>Close</Button.Label>
            </Button>
          </View>
          <View className="flex-1 overflow-hidden mx-4 rounded-xl">
            <CameraView
              style={{ flex: 1 }}
              barcodeScannerSettings={
                mode === 'qr' ? { barcodeTypes: ['qr'] } : undefined
              }
              onBarcodeScanned={(event: BarcodeScanningResult) => {
                if (handled) return;
                if (!event?.data) return;
                setHandled(true);
                const shouldClose = onScan(event.data);
                if (shouldClose) {
                  onClose();
                } else {
                  setHandled(false);
                }
              }}
            />
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
};

export default function App() {
  const toast = useToast();
  const [permission, requestPermission] = useCameraPermissions();
  const [scannedApi, setScannedApi] = useState<string | null>(null);
  const [scannedInfo, setScannedInfo] = useState<RecordingInfo | null>(null);
  const [pasteJson, setPasteJson] = useState('');
  const [bearerToken, setBearerToken] = useState('');
  const [packageNo, setPackageNo] = useState('');
  const [intact, setIntact] = useState(true);
  const [quantity, setQuantity] = useState(0);
  const [result, setResult] = useState('');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [outbox, setOutbox] = useState<OutboxItem[]>([]);
  const [scanMode, setScanMode] = useState<ScanMode | null>(null);
  const [scanTitle, setScanTitle] = useState('');

  const hasBothScans = useMemo(
    () => Boolean(scannedApi && scannedInfo),
    [scannedApi, scannedInfo]
  );

  const profileSummary = useMemo(() => {
    if (!profile) return '(No profile saved)';
    const safe = {
      apiEndpoint: profile.apiEndpoint ?? '',
      orderNo: profile.orderNo ?? '',
      recordingNo: profile.recordingNo ?? '',
      locationCode: profile.locationCode ?? '',
      bearerToken: profile.bearerToken ? '(stored)' : '(none)',
    };
    return JSON.stringify(safe, null, 2);
  }, [profile]);

  const showToast = useCallback(
    (message: string) => {
      toast.show({
        title: message,
        placement: 'top',
        timeout: 2000,
      });
    },
    [toast]
  );

  const loadProfile = useCallback(async () => {
    const raw = await AsyncStorage.getItem(STORAGE_PROFILE);
    if (!raw) {
      setProfile(null);
      return;
    }
    try {
      const parsed = JSON.parse(raw) as Profile;
      setProfile(parsed);
    } catch {
      setProfile(null);
    }
  }, []);

  const loadOutbox = useCallback(async () => {
    const raw = await AsyncStorage.getItem(STORAGE_OUTBOX);
    if (!raw) {
      setOutbox([]);
      return;
    }
    try {
      const parsed = JSON.parse(raw) as OutboxItem[];
      setOutbox(parsed ?? []);
    } catch {
      setOutbox([]);
    }
  }, []);

  const saveOutbox = useCallback(async (items: OutboxItem[]) => {
    setOutbox(items);
    await AsyncStorage.setItem(STORAGE_OUTBOX, JSON.stringify(items));
  }, []);

  useEffect(() => {
    void loadProfile();
    void loadOutbox();
  }, [loadOutbox, loadProfile]);

  const handleQrText = useCallback(
    (text: string) => {
      const obj = parseJson(text);
      if (!obj) return false;
      if (typeof obj.apiEndpoint === 'string') {
        setScannedApi(sanitizeEndpoint(obj.apiEndpoint));
        return true;
      }
      const info = parseRecordingInfo(obj);
      if (info) {
        setScannedInfo(info);
        return true;
      }
      return false;
    },
    []
  );

  const requestCameraPermission = useCallback(async () => {
    if (permission?.granted) return true;
    const response = await requestPermission();
    if (response.status !== 'granted') {
      Alert.alert(
        'Info',
        'Camera scanning is available on Android and iOS. On this platform, please paste JSON or type the package number.'
      );
      return false;
    }
    return true;
  }, [permission?.granted, requestPermission]);

  const startScan = useCallback(
    async (mode: ScanMode) => {
      if (!(await requestCameraPermission())) return;
      setScanTitle(mode === 'qr' ? 'Scan QR' : 'Scan Package Barcode');
      setScanMode(mode);
    },
    [requestCameraPermission]
  );

  const onScanResult = useCallback(
    (data: string) => {
      if (!scanMode) return true;
      if (scanMode === 'qr') {
        const ok = handleQrText(data);
        if (!ok) {
          showToast('Not JSON or unexpected structure; keep scanning…');
        }
        return ok;
      }
      const trimmed = data.trim();
      if (trimmed) {
        setPackageNo(trimmed);
      }
      return true;
    },
    [handleQrText, scanMode, showToast]
  );

  const onDetectPaste = useCallback(() => {
    const ok = handleQrText(pasteJson.trim());
    if (!ok) {
      showToast('Not valid JSON or unexpected format');
    }
  }, [handleQrText, pasteJson, showToast]);

  const onSaveProfile = useCallback(async () => {
    if (!scannedApi || !scannedInfo) return;
    const nextProfile: Profile = {
      apiEndpoint: scannedApi,
      orderNo: scannedInfo.orderNo,
      recordingNo: scannedInfo.recordingNo,
      locationCode: scannedInfo.locationCode,
      bearerToken: bearerToken.trim() ? bearerToken.trim() : null,
    };
    await AsyncStorage.setItem(STORAGE_PROFILE, JSON.stringify(nextProfile));
    setProfile(nextProfile);
    showToast('Profile saved');
  }, [bearerToken, scannedApi, scannedInfo, showToast]);

  const onClearSavedProfile = useCallback(async () => {
    await AsyncStorage.removeItem(STORAGE_PROFILE);
    setProfile(null);
  }, []);

  const onSubmit = useCallback(async () => {
    setResult('');
    if (!profile) {
      showToast('No profile saved. Please create and save a profile first.');
      return;
    }
    const pkg = packageNo.trim();
    if (!pkg) {
      showToast('Package number is required.');
      return;
    }
    const url = sanitizeEndpoint(profile.apiEndpoint ?? '');
    if (!url.startsWith('http')) {
      showToast('Profile API endpoint is invalid.');
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
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'x-ms-client-tracking-id': uuidv4(),
      };
      const token = (profile.bearerToken ?? '').toString().trim();
      if (token) headers.Authorization = `Bearer ${token}`;
      const resp = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });
      const ct = resp.headers.get('content-type') ?? '';
      let bodyOut = '';
      if (ct.includes('application/json')) {
        const json = await resp.json();
        bodyOut = JSON.stringify(json, null, 2);
      } else {
        bodyOut = await resp.text();
      }
      setResult(
        `POST ${url}\nPayload:\n${JSON.stringify(payload, null, 2)}\n\nResponse:\n{\n  "status": ${resp.status},\n  "ok": ${resp.status >= 200 && resp.status < 300},\n  "body": ${JSON.stringify(bodyOut)}\n}`
      );
    } catch (error) {
      const token = (profile.bearerToken ?? '').toString().trim();
      const queued: OutboxItem = {
        url,
        headers: {
          Authorization: token ? `Bearer ${token}` : null,
        },
        payload,
        ts: new Date().toISOString(),
      };
      const nextOutbox = [...outbox, queued];
      await saveOutbox(nextOutbox);
      setResult(
        `Request failed (likely offline). Saved to queue.\n${(error as Error).toString()}`
      );
    }
  }, [intact, outbox, packageNo, profile, quantity, saveOutbox, showToast]);

  const onSyncNow = useCallback(async () => {
    if (!outbox.length) {
      showToast('Nothing synced');
      return;
    }
    let success = 0;
    const remaining: OutboxItem[] = [];
    for (const item of outbox) {
      const url = item.url ?? '';
      if (!url.startsWith('http')) {
        remaining.push(item);
        continue;
      }
      try {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'x-ms-client-tracking-id': uuidv4(),
        };
        const auth = item.headers?.Authorization ?? '';
        if (auth) headers.Authorization = auth;
        const resp = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify(item.payload ?? {}),
        });
        if (resp.status >= 200 && resp.status < 300) {
          success += 1;
        } else {
          remaining.push(item);
        }
      } catch {
        remaining.push(item);
      }
    }
    await saveOutbox(remaining);
    showToast(success > 0 ? `Synced ${success} item(s)` : 'Nothing synced');
  }, [outbox, saveOutbox, showToast]);

  const onClearOutbox = useCallback(() => {
    Alert.alert('Confirm', 'Clear all pending submissions?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'OK',
        style: 'destructive',
        onPress: async () => {
          await saveOutbox([]);
        },
      },
    ]);
  }, [saveOutbox]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <HeroUINativeProvider>
        <SafeAreaView style={{ flex: 1 }}>
          <StatusBar style="dark" />
          <ScrollView className="flex-1" contentContainerClassName="pb-6" keyboardShouldPersistTaps="handled">
            <View className="flex-col gap-3 px-4 py-4">
              <Text.Heading className="text-2xl font-bold text-black">
                Inventory Scanner PoC
              </Text.Heading>

              <Card className="border border-gray-200 rounded-xl p-4 bg-white">
                <View className="flex-col gap-2">
                  <Text.Heading className="text-lg font-semibold text-black">
                    1) Recording Profile
                  </Text.Heading>
                  <Text.Paragraph className="text-sm text-black/70">
                    Scan two QR codes in any order to establish a profile: API
                    Endpoint and Recording Info. Then save.
                  </Text.Paragraph>
                  <View className="flex-row gap-2">
                    <Chip color={scannedApi ? 'success' : 'default'} size="sm">
                      API Endpoint: {scannedApi ? 'ready' : 'missing'}
                    </Chip>
                    <Chip color={scannedInfo ? 'success' : 'default'} size="sm">
                      Recording Info: {scannedInfo ? 'ready' : 'missing'}
                    </Chip>
                  </View>
                  <View className="flex-row gap-2 flex-wrap">
                    <Button size="sm" onPress={() => startScan('qr')}>
                      <Button.Label>Scan QR</Button.Label>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onPress={() => {
                        setScannedApi(null);
                        setScannedInfo(null);
                      }}
                    >
                      <Button.Label>Reset</Button.Label>
                    </Button>
                  </View>

                  <Separator className="my-2" />

                  <Text.Paragraph className="text-sm text-black">
                    Paste JSON instead
                  </Text.Paragraph>
                  <TextArea
                    placeholder='{"apiEndpoint":"<https://...>"} or {"orderNo":"1234","recordingNo":1,"locationCode":"FG HU"}'
                    value={pasteJson}
                    onChangeText={setPasteJson}
                    autoCapitalize="none"
                  />
                  <Button size="sm" variant="outline" onPress={onDetectPaste}>
                    <Button.Label>Detect</Button.Label>
                  </Button>

                  <Separator className="my-2" />

                  <Text.Paragraph className="text-sm text-black">
                    Advanced: Optional Bearer Token
                  </Text.Paragraph>
                  <Input
                    placeholder="Bearer token (optional)"
                    value={bearerToken}
                    onChangeText={setBearerToken}
                    secureTextEntry
                    autoCapitalize="none"
                  />

                  <View className="flex-row gap-2 flex-wrap">
                    <Button
                      size="sm"
                      onPress={onSaveProfile}
                      isDisabled={!hasBothScans}
                    >
                      <Button.Label>Save Profile</Button.Label>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onPress={onClearSavedProfile}
                    >
                      <Button.Label>Clear Saved Profile</Button.Label>
                    </Button>
                  </View>

                  <Text.Paragraph className="text-sm text-black">
                    Current Profile
                  </Text.Paragraph>
                  <SummaryText>{profileSummary}</SummaryText>
                </View>
              </Card>

              <Card className="border border-gray-200 rounded-xl p-4 bg-white">
                <View className="flex-col gap-2">
                  <Text.Heading className="text-lg font-semibold text-black">
                    2) Work
                  </Text.Heading>
                  <Text.Paragraph className="text-sm text-black/70">
                    Use your saved profile to submit package records.
                  </Text.Paragraph>
                  <View className="flex-row gap-2 items-center">
                    <View className="flex-1">
                      <Input
                        placeholder="Scan or type package number"
                        value={packageNo}
                        onChangeText={setPackageNo}
                      />
                    </View>
                    <Button
                      size="sm"
                      variant="outline"
                      onPress={() => startScan('barcode')}
                    >
                      <Button.Label>Scan</Button.Label>
                    </Button>
                  </View>

                  <View className="flex-row gap-2 items-center">
                    <Switch value={intact} onValueChange={setIntact} />
                    <Text.Paragraph className="text-sm text-black">
                      Package intact
                    </Text.Paragraph>
                  </View>

                  <View
                    className={`flex-row gap-2 items-center ${
                      intact ? 'opacity-50' : ''
                    }`}
                  >
                    <Pressable
                      onPress={() =>
                        setQuantity((value) => Math.max(0, value - 1))
                      }
                      disabled={intact}
                      className="p-1"
                    >
                      <MaterialIcons
                        name="remove-circle-outline"
                        size={26}
                        color="#444"
                      />
                    </Pressable>
                    <View className="w-[120px]">
                      <Input
                        value={String(quantity)}
                        editable={false}
                        textAlign="center"
                        placeholder="Quantity"
                      />
                    </View>
                    <Pressable
                      onPress={() => setQuantity((value) => value + 1)}
                      disabled={intact}
                      className="p-1"
                    >
                      <MaterialIcons
                        name="add-circle-outline"
                        size={26}
                        color="#444"
                      />
                    </Pressable>
                  </View>

                  <Button onPress={onSubmit}>
                    <Button.Label>Submit</Button.Label>
                  </Button>

                  {result ? <SummaryText>{result}</SummaryText> : null}
                </View>
              </Card>

              <Card className="border border-gray-200 rounded-xl p-4 bg-white">
                <View className="flex-col gap-2">
                  <Text.Heading className="text-lg font-semibold text-black">
                    Offline queue
                  </Text.Heading>
                  <Text.Paragraph className="text-sm text-black">
                    Pending submissions: {outbox.length}
                  </Text.Paragraph>
                  <View className="flex-row gap-2 flex-wrap">
                    <Button size="sm" variant="outline" onPress={onSyncNow}>
                      <Button.Label>Sync now</Button.Label>
                    </Button>
                    <Button size="sm" variant="outline" onPress={onClearOutbox}>
                      <Button.Label>Clear</Button.Label>
                    </Button>
                  </View>
                </View>
              </Card>
            </View>
          </ScrollView>

          {scanMode ? (
            <ScanModal
              visible={Boolean(scanMode)}
              title={scanTitle}
              mode={scanMode}
              onClose={() => setScanMode(null)}
              onScan={onScanResult}
            />
          ) : null}
        </SafeAreaView>
      </HeroUINativeProvider>
    </GestureHandlerRootView>
  );
}
