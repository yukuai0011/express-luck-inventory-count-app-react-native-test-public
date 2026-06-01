import AsyncStorage from '@react-native-async-storage/async-storage';
import type { OutboxItem, Profile } from './types';

export const STORAGE_PROFILE = 'inventory_profile';
export const STORAGE_OUTBOX = 'inventory_outbox';

export const loadProfile = async (): Promise<Profile | null> => {
  const raw = await AsyncStorage.getItem(STORAGE_PROFILE);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Profile;
  } catch {
    return null;
  }
};

export const saveProfile = async (profile: Profile): Promise<void> => {
  await AsyncStorage.setItem(STORAGE_PROFILE, JSON.stringify(profile));
};

export const clearProfile = async (): Promise<void> => {
  await AsyncStorage.removeItem(STORAGE_PROFILE);
};

export const loadOutbox = async (): Promise<OutboxItem[]> => {
  const raw = await AsyncStorage.getItem(STORAGE_OUTBOX);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as OutboxItem[];
    return parsed ?? [];
  } catch {
    return [];
  }
};

export const saveOutbox = async (items: OutboxItem[]): Promise<void> => {
  await AsyncStorage.setItem(STORAGE_OUTBOX, JSON.stringify(items));
};
