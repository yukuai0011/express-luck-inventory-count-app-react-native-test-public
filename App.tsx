import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CameraView, BarcodeScanningResult, useCameraPermissions } from 'expo-camera';
import { MaterialIcons } from '@expo/vector-icons';
import { Button, Input, TamaguiProvider, Text, XStack, YStack } from 'tamagui';
import tamaguiConfig from './tamagui.config';

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
  const orderNo =
    typeof value.orderNo === 'string' || typeof value.orderNo === 'number'
      ? String(value.orderNo).trim()
      : '';
  const locationCode =
    typeof value.locationCode === 'string' || typeof value.locationCode === 'number'
      ? String(value.locationCode).trim()
      : '';
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

const pillVariant = (ok: boolean) => (ok ? '#16a34a' : '#64748b');

type OutlineButtonProps = React.ComponentProps<typeof Button>;

const OutlineButton = ({ children, ...props }: OutlineButtonProps) => (
  <Button
    backgroundColor="transparent"
    borderWidth={1}
    borderColor="#cbd5f5"
    color="#1f2937"
    pressStyle={{ backgroundColor: '#e2e8f0' }}
    {...props}
  >
    {children}
  </Button>
);

const Pill = ({ children, backgroundColor }: { children: string; backgroundColor: string }) => (
  <XStack
    backgroundColor={backgroundColor}
    paddingHorizontal="$3"
    paddingVertical="$1"
    borderRadius={999}
  >
    <Text color="white" fontSize={12} fontWeight="600">
      {children}
    </Text>
  </XStack>
);

const Card = ({ children }: { children: React.ReactNode }) => (
  <YStack
    borderWidth={1}
    borderColor="#e2e8f0"
    borderRadius={12}
    padding={16}
    backgroundColor="#ffffff"
    space="$3"
  >
    {children}
  </YStack>
);

const SummaryText = ({ children }: { children: string }) => (
  <YStack
    borderWidth={1}
    borderColor="#e2e8f0"
    borderRadius={12}
    padding={12}
    backgroundColor="#ffffff"
  >
    <Text style={styles.codeText}>{children}</Text>
  </YStack>
);

const ToastBanner = ({ message }: { message: string }) => (
  <XStack
    position="absolute"
    top={12}
    left={12}
    right={12}
    zIndex={50}
    alignItems="center"
    pointerEvents="none"
  >
    <XStack backgroundColor="#0f172a" paddingHorizontal={12} paddingVertical={8} borderRadius={8}>
      <Text color="white">{message}</Text>
    </XStack>
  </XStack>
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
      <YStack flex={1} backgroundColor="#f8fafc">
        <SafeAreaView style={styles.safeArea}>
          <XStack
            alignItems="center"
            justifyContent="space-between"
            paddingHorizontal={16}
            paddingVertical={12}
          >
            <Text fontSize={18} fontWeight="600">
              {title}
            </Text>
            <OutlineButton onPress={onClose}>Close</OutlineButton>
          </XStack>
          <View style={styles.scannerContainer}>
            <CameraView
              style={StyleSheet.absoluteFillObject}
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
      </YStack>
    </Modal>
  );
};

export default function App() {
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
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (toastTimer.current) {
        clearTimeout(toastTimer.current);
      }
    };
  }, []);

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

  const showToast = useCallback((message: string) => {
    setToastMessage(message);
    if (toastTimer.current) {
      clearTimeout(toastTimer.current);
    }
    toastTimer.current = setTimeout(() => setToastMessage(null), 2000);
  }, []);

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
        'Camera scanning is available on Android, iOS, and the Web. On this platform, please paste JSON or type the package number.'
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
    <TamaguiProvider config={tamaguiConfig} defaultTheme="light">
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="dark" />
        <YStack flex={1} backgroundColor="#f8fafc">
          {toastMessage ? <ToastBanner message={toastMessage} /> : null}
          <ScrollView
            style={styles.scrollWrapper}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <YStack space="$4" paddingHorizontal={16} paddingVertical={16}>
              <Text fontSize={24} fontWeight="700">
                Inventory Scanner PoC
              </Text>

              <Card>
                <YStack space="$3">
                  <Text fontSize={18} fontWeight="600">
                    1) Recording Profile
                  </Text>
                  <Text>
                    Scan two QR codes in any order to establish a profile: API Endpoint and Recording Info. Then save.
                  </Text>
                  <XStack space="$2" flexWrap="wrap">
                    <Pill backgroundColor={pillVariant(Boolean(scannedApi))}>
                      API Endpoint: {scannedApi ? 'ready' : 'missing'}
                    </Pill>
                    <Pill backgroundColor={pillVariant(Boolean(scannedInfo))}>
                      Recording Info: {scannedInfo ? 'ready' : 'missing'}
                    </Pill>
                  </XStack>
                  <XStack space="$2" flexWrap="wrap">
                    <Button onPress={() => startScan('qr')}>Scan QR</Button>
                    <OutlineButton
                      onPress={() => {
                        setScannedApi(null);
                        setScannedInfo(null);
                      }}
                    >
                      Reset
                    </OutlineButton>
                  </XStack>

                  <View style={styles.divider} />
                  <Text>Paste JSON instead</Text>
                  <Input
                    value={pasteJson}
                    onChangeText={setPasteJson}
                    placeholder='{"apiEndpoint":"<https://...>"} or {"orderNo":"1234","recordingNo":1,"locationCode":"FG HU"}'
                    autoCapitalize="none"
                    multiline
                    textAlignVertical="top"
                    minHeight={110}
                  />
                  <OutlineButton onPress={onDetectPaste}>Detect</OutlineButton>

                  <View style={styles.divider} />
                  <Text>Advanced: Optional Bearer Token</Text>
                  <Input
                    value={bearerToken}
                    onChangeText={setBearerToken}
                    placeholder="Bearer token (optional)"
                    secureTextEntry
                    autoCapitalize="none"
                  />

                  <XStack space="$2" flexWrap="wrap">
                    <Button onPress={onSaveProfile} disabled={!hasBothScans}>
                      Save Profile
                    </Button>
                    <OutlineButton onPress={onClearSavedProfile}>
                      Clear Saved Profile
                    </OutlineButton>
                  </XStack>

                  <Text>Current Profile</Text>
                  <SummaryText>{profileSummary}</SummaryText>
                </YStack>
              </Card>

              <Card>
                <YStack space="$3">
                  <Text fontSize={18} fontWeight="600">
                    2) Work
                  </Text>
                  <Text>Use your saved profile to submit package records.</Text>
                  <XStack space="$2" alignItems="center">
                    <Input
                      flex={1}
                      value={packageNo}
                      onChangeText={setPackageNo}
                      placeholder="Scan or type package number"
                    />
                    <OutlineButton onPress={() => startScan('barcode')}>Scan</OutlineButton>
                  </XStack>

                  <XStack space="$2" alignItems="center">
                    <Switch value={intact} onValueChange={setIntact} />
                    <Text>Package intact</Text>
                  </XStack>

                  <XStack space="$2" alignItems="center" opacity={intact ? 0.5 : 1}>
                    <Pressable
                      onPress={() => setQuantity((value) => Math.max(0, value - 1))}
                      disabled={intact}
                      style={styles.iconButton}
                    >
                      <MaterialIcons name="remove-circle-outline" size={26} color="#444" />
                    </Pressable>
                    <Input
                      width={120}
                      value={String(quantity)}
                      editable={false}
                      textAlign="center"
                      placeholder="Quantity"
                      disabled={intact}
                    />
                    <Pressable
                      onPress={() => setQuantity((value) => value + 1)}
                      disabled={intact}
                      style={styles.iconButton}
                    >
                      <MaterialIcons name="add-circle-outline" size={26} color="#444" />
                    </Pressable>
                  </XStack>

                  <Button onPress={onSubmit}>Submit</Button>

                  {result ? <SummaryText>{result}</SummaryText> : null}
                </YStack>
              </Card>

              <Card>
                <YStack space="$3">
                  <Text fontSize={18} fontWeight="600">
                    Offline queue
                  </Text>
                  <Text>Pending submissions: {outbox.length}</Text>
                  <XStack space="$2" flexWrap="wrap">
                    <OutlineButton onPress={onSyncNow}>Sync now</OutlineButton>
                    <OutlineButton onPress={onClearOutbox}>Clear</OutlineButton>
                  </XStack>
                </YStack>
              </Card>
            </YStack>
          </ScrollView>
        </YStack>

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
    </TamaguiProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollWrapper: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  scannerContainer: {
    flex: 1,
    overflow: 'hidden',
    marginHorizontal: 16,
    borderRadius: 12,
  },
  iconButton: {
    padding: 4,
  },
  codeText: {
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
    fontSize: 12,
  },
  divider: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginVertical: 8,
  },
});