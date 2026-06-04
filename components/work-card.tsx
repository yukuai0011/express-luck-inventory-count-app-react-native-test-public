import { useCallback, useState } from "react";
import { Pressable, View } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Text } from "@/components/ui/text";
import { ScanModal } from "@/components/scan-modal";
import { SummaryText } from "@/components/summary-text";
import { useToast } from "@/components/toast/toast-provider";
import { useAppState } from "@/lib/app-state";
import { enqueueOutboxItem, submitPayload } from "@/lib/api";

export const WorkCard = () => {
  const { profile, outbox, setOutbox } = useAppState();
  const toast = useToast();
  const [packageNo, setPackageNo] = useState("");
  const [intact, setIntact] = useState(true);
  const [quantity, setQuantity] = useState(0);
  const [result, setResult] = useState("");
  const [scanOpen, setScanOpen] = useState(false);

  const onSubmit = useCallback(async () => {
    setResult("");
    if (!profile) {
      toast.show("No profile saved. Please create and save a profile first.");
      return;
    }
    const pkg = packageNo.trim();
    if (!pkg) {
      toast.show("Package number is required.");
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
      const r = await submitPayload(profile, payload);
      setResult(
        `POST ${profile.apiEndpoint}\nPayload:\n${JSON.stringify(
          payload,
          null,
          2
        )}\n\nResponse:\n{\n  "status": ${r.status},\n  "ok": ${r.ok},\n  "body": ${JSON.stringify(r.body)}\n}`
      );
    } catch (error) {
      const next = enqueueOutboxItem(outbox, profile, payload);
      await setOutbox(next);
      setResult(`Request failed (likely offline). Saved to queue.\n${(error as Error).toString()}`);
    }
  }, [intact, outbox, packageNo, profile, quantity, setOutbox, toast]);

  return (
    <Card className="gap-2">
      <Text className="text-lg font-semibold">2) Work</Text>
      <Text className="text-sm text-muted-foreground">
        Use your saved profile to submit package records.
      </Text>

      <View className="flex-row items-center gap-2">
        <View className="flex-1">
          <Input
            value={packageNo}
            onChangeText={setPackageNo}
            placeholder="Scan or type package number"
          />
        </View>
        <Button size="sm" variant="outline" onPress={() => setScanOpen(true)}>
          <Text>Scan</Text>
        </Button>
      </View>

      <View className="flex-row items-center gap-2">
        <Switch checked={intact} onCheckedChange={setIntact} />
        <Text className="text-sm">Package intact</Text>
      </View>

      <View
        className="flex-row items-center gap-2"
        style={{ opacity: intact ? 0.5 : 1 }}
      >
        <Pressable
          onPress={() => setQuantity((v) => Math.max(0, v - 1))}
          disabled={intact}
          className="p-1"
        >
          <MaterialIcons name="remove-circle-outline" size={26} color="#444" />
        </Pressable>
        <View className="w-32">
          <Input
            value={String(quantity)}
            editable={false}
            className="text-center"
            placeholder="Quantity"
          />
        </View>
        <Pressable
          onPress={() => setQuantity((v) => v + 1)}
          disabled={intact}
          className="p-1"
        >
          <MaterialIcons name="add-circle-outline" size={26} color="#444" />
        </Pressable>
      </View>

      <Button onPress={onSubmit}>
        <Text>Submit</Text>
      </Button>

      {result ? <SummaryText>{result}</SummaryText> : null}

      <ScanModal
        visible={scanOpen}
        title="Scan Package Barcode"
        mode="barcode"
        onClose={() => setScanOpen(false)}
        onScan={(data) => {
          const trimmed = data.trim();
          if (trimmed) setPackageNo(trimmed);
          return true;
        }}
      />
    </Card>
  );
};
