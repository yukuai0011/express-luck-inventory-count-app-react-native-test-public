import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import {
  clearProfile,
  loadOutbox,
  loadProfile,
  saveOutbox,
  saveProfile,
  type OutboxItem,
  type Profile,
} from "./storage";

type AppState = {
  profile: Profile | null;
  outbox: OutboxItem[];
  setProfile: (next: Profile | null) => Promise<void>;
  setOutbox: (next: OutboxItem[]) => Promise<void>;
};

const AppStateContext = createContext<AppState | null>(null);

export const AppStateProvider = ({ children }: { children: React.ReactNode }) => {
  const [profile, setProfileState] = useState<Profile | null>(null);
  const [outbox, setOutboxState] = useState<OutboxItem[]>([]);

  useEffect(() => {
    void (async () => {
      const [p, o] = await Promise.all([loadProfile(), loadOutbox()]);
      setProfileState(p);
      setOutboxState(o);
    })();
  }, []);

  const setProfile = useCallback(async (next: Profile | null) => {
    if (next) {
      await saveProfile(next);
      setProfileState(next);
    } else {
      await clearProfile();
      setProfileState(null);
    }
  }, []);

  const setOutbox = useCallback(async (next: OutboxItem[]) => {
    setOutboxState(next);
    await saveOutbox(next);
  }, []);

  return (
    <AppStateContext.Provider value={{ profile, outbox, setProfile, setOutbox }}>
      {children}
    </AppStateContext.Provider>
  );
};

export const useAppState = () => {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error("useAppState must be used inside AppStateProvider");
  return ctx;
};
