import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import {
  Button,
  Chip,
  Input,
  Label,
  Text,
  TextField,
  useToast,
} from 'heroui-native';
import { useProfile } from '@/hooks/useProfile';
import {
  parseJson,
  parseRecordingInfo,
  sanitizeEndpoint,
} from '@/lib/profile';
import { ProfileSummary } from '@/components/ProfileSummary';
import { ScanModal } from '@/components/ScanModal';
import type { RecordingInfo, ScanMode } from '@/lib/types';
import { useCameraPermission } from '@/hooks/useCameraPermission';

const ProfileTab = () => {
  const { toast } = useToast();
  const { profile, save, clear } = useProfile();
  const { ensure } = useCameraPermission();

  const [scannedApi, setScannedApi] = useState<string | null>(null);
  const [scannedInfo, setScannedInfo] = useState<RecordingInfo | null>(null);
  const [pasteJson, setPasteJson] = useState('');
  const [bearerToken, setBearerToken] = useState('');
  const [scanMode, setScanMode] = useState<ScanMode | null>(null);

  const hasBoth = Boolean(scannedApi && scannedInfo);

  const profileSummary = useMemo(() => {
    if (!profile) return '(No profile saved)';
    return JSON.stringify(
      {
        apiEndpoint: profile.apiEndpoint ?? '',
        orderNo: profile.orderNo ?? '',
        recordingNo: profile.recordingNo ?? '',
        locationCode: profile.locationCode ?? '',
        bearerToken: profile.bearerToken ? '(stored)' : '(none)',
      },
      null,
      2
    );
  }, [profile]);

  const handleQrText = useCallback((text: string) => {
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
  }, []);

  const onScanResult = useCallback(
    (data: string) => {
      const ok = handleQrText(data);
      if (!ok) {
        toast.show({ variant: 'warning', label: 'Not JSON — keep scanning…' });
      }
      return ok;
    },
    [handleQrText, toast]
  );

  const startScan = useCallback(
    async (mode: ScanMode) => {
      if (!(await ensure())) return;
      setScanMode(mode);
    },
    [ensure]
  );

  const onDetectPaste = useCallback(() => {
    const ok = handleQrText(pasteJson.trim());
    if (!ok) toast.show({ variant: 'warning', label: 'Not valid JSON' });
  }, [handleQrText, pasteJson, toast]);

  const onSave = useCallback(async () => {
    if (!scannedApi || !scannedInfo) return;
    await save({
      apiEndpoint: scannedApi,
      orderNo: scannedInfo.orderNo,
      recordingNo: scannedInfo.recordingNo,
      locationCode: scannedInfo.locationCode,
      bearerToken: bearerToken.trim() ? bearerToken.trim() : null,
    });
    toast.show({ variant: 'success', label: 'Profile saved' });
  }, [bearerToken, save, scannedApi, scannedInfo, toast]);

  const onClearSaved = useCallback(async () => {
    await clear();
    toast.show({ variant: 'default', label: 'Saved profile cleared' });
  }, [clear, toast]);

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="p-4 gap-4"
      keyboardShouldPersistTaps="handled"
    >
      <Text className="text-2xl font-bold">Recording Profile</Text>

      <View className="gap-3 rounded-xl border border-border p-4">
        <Text className="text-base font-semibold">1) Recording Profile</Text>
        <Text className="text-sm text-muted">
          Scan two QR codes in any order: API Endpoint and Recording Info. Then save.
        </Text>
        <View className="flex-row gap-2">
          <Chip variant={scannedApi ? 'success' : 'secondary'}>
            API: {scannedApi ? 'ready' : 'missing'}
          </Chip>
          <Chip variant={scannedInfo ? 'success' : 'secondary'}>
            Info: {scannedInfo ? 'ready' : 'missing'}
          </Chip>
        </View>
        <View className="flex-row flex-wrap gap-2">
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

        <Text className="mt-2 font-semibold">Paste JSON instead</Text>
        <TextField>
          <Label>JSON</Label>
          <Input
            value={pasteJson}
            onChangeText={setPasteJson}
            placeholder='{"apiEndpoint":"https://…"} or {"orderNo":"1234","recordingNo":1,"locationCode":"FG HU"}'
            multiline
            autoCapitalize="none"
          />
        </TextField>
        <Button size="sm" variant="outline" onPress={onDetectPaste}>
          <Button.Label>Detect</Button.Label>
        </Button>

        <Text className="mt-2 font-semibold">Optional Bearer Token</Text>
        <TextField>
          <Label>Bearer token</Label>
          <Input
            value={bearerToken}
            onChangeText={setBearerToken}
            placeholder="Bearer token (optional)"
            secureTextEntry
            autoCapitalize="none"
          />
        </TextField>

        <View className="flex-row flex-wrap gap-2">
          <Button size="sm" isDisabled={!hasBoth} onPress={onSave}>
            <Button.Label>Save Profile</Button.Label>
          </Button>
          <Button size="sm" variant="outline" onPress={onClearSaved}>
            <Button.Label>Clear Saved Profile</Button.Label>
          </Button>
        </View>

        <Text className="mt-2 font-semibold">Current Profile</Text>
        <ProfileSummary>{profileSummary}</ProfileSummary>
      </View>

      {scanMode === 'qr' ? (
        <ScanModal
          visible
          title="Scan QR"
          mode="qr"
          onClose={() => setScanMode(null)}
          onScan={onScanResult}
        />
      ) : null}
    </ScrollView>
  );
};

export default ProfileTab;
