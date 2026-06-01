import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useProfile } from '../../hooks/useProfile';
import { ProfileForm } from '../../components/ProfileForm';
import type { RecordingInfo } from '../../lib/types';
import { useToast } from 'heroui-native';

export default function ProfileScreen() {
  const { profile, summary, setProfile, clearProfile } = useProfile();
  const [scannedApi, setScannedApi] = useState<string | null>(null);
  const [scannedInfo, setScannedInfo] = useState<RecordingInfo | null>(null);
  const [bearerToken, setBearerToken] = useState(profile?.bearerToken ?? '');
  const toast = useToast();

  const onSave = async (api: string, info: RecordingInfo, token: string) => {
    await setProfile({
      apiEndpoint: api,
      orderNo: info.orderNo,
      recordingNo: info.recordingNo,
      locationCode: info.locationCode,
      bearerToken: token.trim() ? token.trim() : null,
    });
    toast.show({ placement: 'top', variant: 'success', message: 'Profile saved' });
  };

  const onClear = async () => {
    await clearProfile();
    setBearerToken('');
    setScannedApi(null);
    setScannedInfo(null);
  };

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="p-4"
      keyboardShouldPersistTaps="handled"
    >
      <View className="gap-3">
        <ProfileForm
          scannedApi={scannedApi}
          scannedInfo={scannedInfo}
          setScannedApi={setScannedApi}
          setScannedInfo={setScannedInfo}
          bearerToken={bearerToken}
          setBearerToken={setBearerToken}
          onSave={onSave}
          onClear={onClear}
          summary={summary}
        />
      </View>
    </ScrollView>
  );
}
