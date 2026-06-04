import { useEffect, useState } from "react";
import { Modal, Platform, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from "expo-camera";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { useToast } from "@/components/toast/toast-provider";

type ScanMode = "qr" | "barcode";

type Props = {
  visible: boolean;
  title: string;
  mode: ScanMode;
  onClose: () => void;
  onScan: (value: string) => boolean;
};

export const ScanModal = ({ visible, title, mode, onClose, onScan }: Props) => {
  const [handled, setHandled] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const toast = useToast();

  useEffect(() => {
    if (!visible) setHandled(false);
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    if (permission?.granted) return;
    void (async () => {
      const result = await requestPermission();
      if (!result.granted) {
        toast.show("Camera permission denied");
        onClose();
      }
    })();
  }, [visible, permission?.granted, requestPermission, toast, onClose]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-white dark:bg-gray-950">
        <SafeAreaView className="flex-1">
          <View className="flex-row items-center justify-between px-4 py-3">
            <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {title}
            </Text>
            <Button variant="outline" size="sm" onPress={onClose}>
              <Text>Close</Text>
            </Button>
          </View>

          {Platform.OS === "web" ? (
            <View className="flex-1 items-center justify-center p-6">
              <Text className="text-center text-base text-gray-700 dark:text-gray-300">
                Camera scanning is not available on web. Please paste JSON or type the
                package number.
              </Text>
            </View>
          ) : (
            <View className="mx-4 flex-1 overflow-hidden rounded-xl">
              <CameraView
                style={{ flex: 1 }}
                barcodeScannerSettings={mode === "qr" ? { barcodeTypes: ["qr"] } : undefined}
                onBarcodeScanned={(event: BarcodeScanningResult) => {
                  if (handled) return;
                  if (!event?.data) return;
                  setHandled(true);
                  const shouldClose = onScan(event.data);
                  if (shouldClose) onClose();
                  else setHandled(false);
                }}
              />
            </View>
          )}
        </SafeAreaView>
      </View>
    </Modal>
  );
};
