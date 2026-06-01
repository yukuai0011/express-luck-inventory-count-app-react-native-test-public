import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { Button, CloseButton, Text, useToast } from 'heroui-native';
import { consumeScanHandler } from '../../lib/scanBridge';
import { parseJson, parseRecordingInfo, sanitizeEndpoint } from '../../lib/parse';

export default function ScanScreen() {
  const { mode } = useLocalSearchParams<{ mode?: 'qr' | 'barcode' }>();
  const isQr = mode === 'qr';
  const [permission, requestPermission] = useCameraPermissions();
  const [handled, setHandled] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (!permission) return;
    if (!permission.granted && permission.canAskAgain) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  const onClose = () => router.back();

  const onBarcode = (event: BarcodeScanningResult) => {
    if (handled) return;
    const value = event?.data;
    if (!value) return;
    setHandled(true);
    if (isQr) {
      const obj = parseJson(value);
      let ok = false;
      if (obj) {
        if (typeof obj.apiEndpoint === 'string') {
          sanitizeEndpoint(obj.apiEndpoint);
          ok = true;
        } else if (parseRecordingInfo(obj)) {
          ok = true;
        }
      }
      if (!ok) {
        toast.show({ placement: 'top', variant: 'default', message: 'Not JSON or unexpected structure; keep scanning…' });
        setHandled(false);
        return;
      }
    }
    consumeScanHandler()?.(value);
    onClose();
  };

  if (!permission) {
    return <View style={styles.center}><Text>Initializing…</Text></View>;
  }

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <View style={styles.deny}>
          <Text className="text-foreground">
            Camera permission is required to scan. Grant it in system settings, or paste JSON instead.
          </Text>
          <Button variant="secondary" onPress={onClose}>
            <Button.Label>Close</Button.Label>
          </Button>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <Text className="text-foreground">{isQr ? 'Scan QR' : 'Scan Package Barcode'}</Text>
        <CloseButton onPress={onClose} />
      </View>
      <View style={styles.cameraBox}>
        <CameraView
          style={StyleSheet.absoluteFillObject}
          barcodeScannerSettings={isQr ? { barcodeTypes: ['qr'] } : undefined}
          onBarcodeScanned={onBarcode}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 },
  deny: { gap: 12, alignItems: 'center' },
  topBar: {
    paddingTop: 48,
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#000',
  },
  cameraBox: { flex: 1, margin: 16, borderRadius: 12, overflow: 'hidden' },
});
