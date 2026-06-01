import React, { useEffect, useState } from 'react';
import { Modal, SafeAreaView, StyleSheet, View } from 'react-native';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { Button } from 'heroui-native';
import type { ScanMode } from '@/lib/types';

type Props = {
  visible: boolean;
  title: string;
  mode: ScanMode;
  onClose: () => void;
  onScan: (value: string) => boolean;
};

export const ScanModal = ({ visible, title, mode, onClose, onScan }: Props) => {
  const [handled, setHandled] = useState(false);
  const [permission] = useCameraPermissions();

  useEffect(() => {
    if (!visible) setHandled(false);
  }, [visible]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Button variant="ghost" size="sm" onPress={onClose}>
            <Button.Label>{title}</Button.Label>
          </Button>
          <Button variant="outline" size="sm" onPress={onClose}>
            <Button.Label>Close</Button.Label>
          </Button>
        </View>
        <View style={styles.scanner}>
          {permission?.granted ? (
            <CameraView
              style={StyleSheet.absoluteFill}
              barcodeScannerSettings={
                mode === 'qr' ? { barcodeTypes: ['qr'] } : undefined
              }
              onBarcodeScanned={(event: BarcodeScanningResult) => {
                if (handled) return;
                if (!event?.data) return;
                setHandled(true);
                const shouldClose = onScan(event.data);
                if (shouldClose) onClose();
                else setHandled(false);
              }}
            />
          ) : (
            <Button onPress={onClose}>
              <Button.Label>Camera permission not granted</Button.Label>
            </Button>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#000' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
  },
  scanner: { flex: 1, margin: 16, overflow: 'hidden', borderRadius: 12 },
});
