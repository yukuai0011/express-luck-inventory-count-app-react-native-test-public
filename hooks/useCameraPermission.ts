import { Alert } from 'react-native';
import { useCameraPermissions } from 'expo-camera';

export const useCameraPermission = () => {
  const [permission, requestPermission] = useCameraPermissions();

  const ensure = async (): Promise<boolean> => {
    if (permission?.granted) return true;
    const response = await requestPermission();
    if (response.status !== 'granted') {
      Alert.alert(
        'Info',
        'Camera scanning requires permission. Please grant camera access or paste JSON instead.'
      );
      return false;
    }
    return true;
  };

  return { permission, ensure };
};
