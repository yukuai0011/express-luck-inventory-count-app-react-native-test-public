import AsyncStorage from "@react-native-async-storage/async-storage";

export type Profile = {
  apiEndpoint: string;
  orderNo: string;
  recordingNo: number;
  locationCode: string;
  bearerToken?: string | null;
};

export type OutboxItem = {
  url: string;
  headers: { Authorization?: string | null };
  payload: Record<string, unknown>;
  ts: string;
};

const STORAGE_PROFILE = "inventory_profile";
const STORAGE_OUTBOX = "inventory_outbox";
const STORAGE_THEME = "@theme";

export const storageKeys = {
  profile: STORAGE_PROFILE,
  outbox: STORAGE_OUTBOX,
  theme: STORAGE_THEME,
} as const;

export const loadProfile = async (): Promise<Profile | null> => {
  const raw = await AsyncStorage.getItem(STORAGE_PROFILE);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Profile;
  } catch {
    return null;
  }
};

export const saveProfile = async (profile: Profile) => {
  await AsyncStorage.setItem(STORAGE_PROFILE, JSON.stringify(profile));
};

export const clearProfile = async () => {
  await AsyncStorage.removeItem(STORAGE_PROFILE);
};

export const loadOutbox = async (): Promise<OutboxItem[]> => {
  const raw = await AsyncStorage.getItem(STORAGE_OUTBOX);
  if (!raw) return [];
  try {
    return (JSON.parse(raw) as OutboxItem[]) ?? [];
  } catch {
    return [];
  }
};

export const saveOutbox = async (outbox: OutboxItem[]) => {
  await AsyncStorage.setItem(STORAGE_OUTBOX, JSON.stringify(outbox));
};

export const loadTheme = async (): Promise<"light" | "dark" | "system" | null> => {
  const raw = await AsyncStorage.getItem(STORAGE_THEME);
  if (raw === "light" || raw === "dark" || raw === "system") return raw;
  return null;
};

export const saveTheme = async (theme: "light" | "dark" | "system") => {
  await AsyncStorage.setItem(STORAGE_THEME, theme);
};
