import { useCallback, useMemo, useState } from "react";
import { Alert, View } from "react-native";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Text } from "@/components/ui/text";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/toast/toast-provider";
import { ScanModal } from "@/components/scan-modal";
import { SummaryText } from "@/components/summary-text";
import { useAppState } from "@/lib/app-state";
import { parseJson, parseRecordingInfo, sanitizeEndpoint, type RecordingInfo } from "@/lib/qr";

export const ProfileCard = () => {
  const { profile, setProfile } = useAppState();
  const toast = useToast();
  const [scannedApi, setScannedApi] = useState<string | null>(null);
  const [scannedInfo, setScannedInfo] = useState<RecordingInfo | null>(null);
  const [pasteJson, setPasteJson] = useState("");
  const [bearerToken, setBearerToken] = useState("");
  const [scanOpen, setScanOpen] = useState(false);

  const handleQrText = useCallback(
    (text: string) => {
      const obj = parseJson(text);
      if (!obj) return false;
      if (typeof obj.apiEndpoint === "string") {
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

  const bothReady = Boolean(scannedApi && scannedInfo);

  const onSave = useCallback(async () => {
    if (!scannedApi || !scannedInfo) return;
    await setProfile({
      apiEndpoint: scannedApi,
      orderNo: scannedInfo.orderNo,
      recordingNo: scannedInfo.recordingNo,
      locationCode: scannedInfo.locationCode,
      bearerToken: bearerToken.trim() ? bearerToken.trim() : null,
    });
    toast.show("Profile saved");
  }, [bearerToken, scannedApi, scannedInfo, setProfile, toast]);

  const onClearSaved = useCallback(() => {
    Alert.alert("Confirm", "Clear saved profile?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "OK",
        style: "destructive",
        onPress: async () => {
          await setProfile(null);
        },
      },
    ]);
  }, [setProfile]);

  const profileSummary = useMemo(() => {
    if (!profile) return "(No profile saved)";
    return JSON.stringify(
      {
        apiEndpoint: profile.apiEndpoint ?? "",
        orderNo: profile.orderNo ?? "",
        recordingNo: profile.recordingNo ?? "",
        locationCode: profile.locationCode ?? "",
        bearerToken: profile.bearerToken ? "(stored)" : "(none)",
      },
      null,
      2
    );
  }, [profile]);

  return (
    <Card className="gap-2">
      <Text className="text-lg font-semibold">1) Recording Profile</Text>
      <Text className="text-sm text-muted-foreground">
        Scan two QR codes in any order to establish a profile: API Endpoint and Recording
        Info. Then save.
      </Text>

      <View className="flex-row flex-wrap gap-2">
        <Badge variant={scannedApi ? "default" : "secondary"}>
          <Text>API Endpoint: {scannedApi ? "ready" : "missing"}</Text>
        </Badge>
        <Badge variant={scannedInfo ? "default" : "secondary"}>
          <Text>Recording Info: {scannedInfo ? "ready" : "missing"}</Text>
        </Badge>
      </View>

      <View className="flex-row flex-wrap gap-2">
        <Button size="sm" onPress={() => setScanOpen(true)}>
          <Text>Scan QR</Text>
        </Button>
        <Button
          size="sm"
          variant="outline"
          onPress={() => {
            setScannedApi(null);
            setScannedInfo(null);
          }}
        >
          <Text>Reset</Text>
        </Button>
      </View>

      <Separator />

      <Text className="text-sm font-medium">Paste JSON instead</Text>
      <Textarea
        value={pasteJson}
        onChangeText={setPasteJson}
        placeholder='{"apiEndpoint":"<https://...>"} or {"orderNo":"1234","recordingNo":1,"locationCode":"FG HU"}'
        autoCapitalize="none"
      />
      <Button
        size="sm"
        variant="outline"
        onPress={() => {
          if (!handleQrText(pasteJson.trim())) {
            toast.show("Not valid JSON or unexpected format");
          }
        }}
      >
        <Text>Detect</Text>
      </Button>

      <Separator />

      <Text className="text-sm font-medium">Advanced: Optional Bearer Token</Text>
      <Input
        value={bearerToken}
        onChangeText={setBearerToken}
        placeholder="Bearer token (optional)"
        secureTextEntry
        autoCapitalize="none"
      />

      <View className="flex-row flex-wrap gap-2">
        <Button size="sm" disabled={!bothReady} onPress={onSave}>
          <Text>Save Profile</Text>
        </Button>
        <Button size="sm" variant="outline" onPress={onClearSaved}>
          <Text>Clear Saved Profile</Text>
        </Button>
      </View>

      <Text className="mt-2 text-sm font-medium">Current Profile</Text>
      <SummaryText>{profileSummary}</SummaryText>

      <ScanModal
        visible={scanOpen}
        title="Scan QR"
        mode="qr"
        onClose={() => setScanOpen(false)}
        onScan={(data) => {
          if (handleQrText(data)) return true;
          toast.show("Not JSON or unexpected structure; keep scanning…");
          return false;
        }}
      />
    </Card>
  );
};
