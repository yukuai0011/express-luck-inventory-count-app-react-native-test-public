import { useCallback, useEffect, useMemo, useState } from 'react';
import { clearProfile as clear, loadProfile, saveProfile } from '../lib/storage';
import type { Profile } from '../lib/types';

export function useProfile() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const p = await loadProfile();
      if (!cancelled) {
        setProfile(p);
        setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const persist = useCallback(async (next: Profile) => {
    setProfile(next);
    await saveProfile(next);
  }, []);

  const reset = useCallback(async () => {
    setProfile(null);
    await clear();
  }, []);

  const summary = useMemo(() => {
    if (!profile) return '(No profile saved)';
    return JSON.stringify(
      {
        apiEndpoint: profile.apiEndpoint ?? '',
        orderNo: profile.orderNo ?? '',
        recordingNo: profile.recordingNo ?? '',
        locationCode: profile.locationCode ?? '',
        bearerToken: profile.bearerToken ? '(stored)' : '(none)',
      },
      null,
      2,
    );
  }, [profile]);

  return { profile, loaded, setProfile: persist, clearProfile: reset, summary };
}
