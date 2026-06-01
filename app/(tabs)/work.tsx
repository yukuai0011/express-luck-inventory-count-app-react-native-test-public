import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useProfile } from '../../hooks/useProfile';
import { useOutbox } from '../../hooks/useOutbox';
import { PackageForm } from '../../components/PackageForm';
import { ResultCard } from '../../components/ResultCard';
import { sanitizeEndpoint } from '../../lib/parse';
import { submitRecord } from '../../lib/submit';
import type { OutboxItem } from '../../lib/types';

export default function WorkScreen() {
  const { profile } = useProfile();
  const { enqueue } = useOutbox();
  const [packageNo, setPackageNo] = useState('');
  const [intact, setIntact] = useState(true);
  const [quantity, setQuantity] = useState(0);
  const [result, setResult] = useState('');

  const onSubmit = async () => {
    setResult('');
    if (!profile) {
      setResult('No profile saved. Please create and save a profile first.');
      return;
    }
    const pkg = packageNo.trim();
    if (!pkg) {
      setResult('Package number is required.');
      return;
    }
    const url = sanitizeEndpoint(profile.apiEndpoint ?? '');
    if (!url.startsWith('http')) {
      setResult('Profile API endpoint is invalid.');
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
      const r = await submitRecord(url, profile.bearerToken, payload);
      setResult(
        `POST ${url}\nPayload:\n${JSON.stringify(payload, null, 2)}\n\nResponse:\n{\n  "status": ${r.status},\n  "ok": ${r.ok},\n  "body": ${JSON.stringify(r.body)}\n}`,
      );
      setPackageNo('');
      setQuantity(0);
      setIntact(true);
    } catch (error) {
      const queued: OutboxItem = {
        url,
        headers: { Authorization: profile.bearerToken ? `Bearer ${profile.bearerToken}` : null },
        payload,
        ts: new Date().toISOString(),
      };
      await enqueue(queued);
      setResult(`Request failed (likely offline). Saved to queue.\n${(error as Error).toString()}`);
    }
  };

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="p-4"
      keyboardShouldPersistTaps="handled"
    >
      <View className="gap-3">
        <PackageForm
          packageNo={packageNo}
          setPackageNo={setPackageNo}
          intact={intact}
          setIntact={setIntact}
          quantity={quantity}
          setQuantity={setQuantity}
          onSubmit={onSubmit}
        />
        {result ? <ResultCard>{result}</ResultCard> : null}
      </View>
    </ScrollView>
  );
}
