import { useCallback, useEffect, useState } from 'react';
import {
  clearProfile as clearProfileStorage,
  loadProfile,
  saveProfile,
} from '@/lib/storage';
import type { Profile } from '@/lib/types';

export const useProfile = () => {
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    void loadProfile().then(setProfile);
  }, []);

  const save = useCallback(async (next: Profile) => {
    await saveProfile(next);
    setProfile(next);
  }, []);

  const clear = useCallback(async () => {
    await clearProfileStorage();
    setProfile(null);
  }, []);

  const reload = useCallback(async () => {
    setProfile(await loadProfile());
  }, []);

  return { profile, save, clear, reload };
};
