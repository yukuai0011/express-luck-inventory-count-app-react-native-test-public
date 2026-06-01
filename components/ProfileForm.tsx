import { useCallback, useState } from 'react';
import { router } from 'expo-router';
import {
  Button,
  Card,
  HStack,
  Separator,
  Text,
  TextArea,
  TextField,
  useToast,
} from 'heroui-native';
import { parseJson, parseRecordingInfo, sanitizeEndpoint } from '../lib/parse';
import { registerScanHandler } from '../lib/scanBridge';
import type { RecordingInfo } from '../lib/types';
import { Pill } from './Pill';
import { ResultCard } from './ResultCard';

type Props = {
  scannedApi: string | null;
  scannedInfo: RecordingInfo | null;
  setScannedApi: (v: string | null) => void;
  setScannedInfo: (v: RecordingInfo | null) => void;
  bearerToken: string;
  setBearerToken: (v: string) => void;
  onSave: (api: string, info: RecordingInfo, token: string) => void;
  onClear: () => void;
  summary: string;
};

export function ProfileForm({
  scannedApi,
  scannedInfo,
  setScannedApi,
  setScannedInfo,
  bearerToken,
  setBearerToken,
  onSave,
  onClear,
  summary,
}: Props) {
  const toast = useToast();
  const [pasteJson, setPasteJson] = useState('');

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
    [setScannedApi, setScannedInfo],
  );

  const openQrScanner = useCallback(() => {
    registerScanHandler((value) => {
      const ok = handleQrText(value);
      if (!ok) {
        toast.show({ placement: 'top', variant: 'default', message: 'Not JSON or unexpected structure' });
      }
    });
    router.push('/(modal)/scan?mode=qr');
  }, [handleQrText, toast]);

  const onDetectPaste = useCallback(() => {
    const ok = handleQrText(pasteJson.trim());
    if (!ok) {
      toast.show({ placement: 'top', variant: 'default', message: 'Not valid JSON or unexpected format' });
    }
  }, [handleQrText, pasteJson, toast]);

  const onReset = useCallback(() => {
    setScannedApi(null);
    setScannedInfo(null);
    toast.show({ placement: 'top', variant: 'default', message: 'Reset' });
  }, [setScannedApi, setScannedInfo, toast]);

  const canSave = Boolean(scannedApi && scannedInfo);

  return (
    <Card>
      <Card.Header>
        <Card.Title>Recording Profile</Card.Title>
        <Card.Description>
          Scan two QR codes in any order to establish a profile: API Endpoint and Recording Info. Then save.
        </Card.Description>
      </Card.Header>
      <Card.Body className="gap-3">
        <HStack className="gap-2 flex-wrap">
          <Pill ok={Boolean(scannedApi)} label={`API Endpoint: ${scannedApi ? 'ready' : 'missing'}`} />
          <Pill ok={Boolean(scannedInfo)} label={`Recording Info: ${scannedInfo ? 'ready' : 'missing'}`} />
        </HStack>

        <HStack className="gap-2 flex-wrap">
          <Button onPress={openQrScanner}>
            <Button.Label>Scan QR</Button.Label>
          </Button>
          <Button variant="tertiary" onPress={onReset}>
            <Button.Label>Reset</Button.Label>
          </Button>
        </HStack>

        <Separator className="my-1" />

        <Text className="text-foreground">Paste JSON instead</Text>
        <TextArea>
          <TextArea.Input
            value={pasteJson}
            onChangeText={setPasteJson}
            placeholder='{"apiEndpoint":"<https://...>"} or {"orderNo":"1234","recordingNo":1,"locationCode":"FG HU"}'
            autoCapitalize="none"
          />
        </TextArea>
        <Button variant="secondary" onPress={onDetectPaste}>
          <Button.Label>Detect</Button.Label>
        </Button>

        <Separator className="my-1" />

        <Text className="text-foreground">Advanced: Optional Bearer Token</Text>
        <TextField>
          <TextField.Input
            value={bearerToken}
            onChangeText={setBearerToken}
            placeholder="Bearer token (optional)"
            secureTextEntry
            autoCapitalize="none"
          />
        </TextField>

        <HStack className="gap-2 flex-wrap">
          <Button isDisabled={!canSave} onPress={() => onSave(scannedApi!, scannedInfo!, bearerToken)}>
            <Button.Label>Save Profile</Button.Label>
          </Button>
          <Button variant="tertiary" onPress={onClear}>
            <Button.Label>Clear Saved Profile</Button.Label>
          </Button>
        </HStack>

        <Text className="text-foreground">Current Profile</Text>
        <ResultCard>{summary}</ResultCard>
      </Card.Body>
    </Card>
  );
}
