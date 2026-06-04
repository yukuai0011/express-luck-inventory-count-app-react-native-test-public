import { sanitizeEndpoint, uuidv4 } from "./qr";
import type { OutboxItem, Profile } from "./storage";

export type SubmitResult = {
  ok: boolean;
  status: number;
  body: string;
};

const buildHeaders = (token: string | null | undefined) => {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    "x-ms-client-tracking-id": uuidv4(),
  };
  const t = (token ?? "").toString().trim();
  if (t) headers.Authorization = `Bearer ${t}`;
  return headers;
};

export const submitPayload = async (
  profile: Profile,
  payload: Record<string, unknown>
): Promise<SubmitResult> => {
  const url = sanitizeEndpoint(profile.apiEndpoint ?? "");
  if (!url.startsWith("http")) {
    throw new Error("Profile API endpoint is invalid");
  }
  const resp = await fetch(url, {
    method: "POST",
    headers: buildHeaders(profile.bearerToken),
    body: JSON.stringify(payload),
  });
  const ct = resp.headers.get("content-type") ?? "";
  const body = ct.includes("application/json")
    ? JSON.stringify(await resp.json(), null, 2)
    : await resp.text();
  return {
    ok: resp.status >= 200 && resp.status < 300,
    status: resp.status,
    body,
  };
};

export const enqueueOutboxItem = (
  outbox: OutboxItem[],
  profile: Profile,
  payload: Record<string, unknown>
): OutboxItem[] => {
  const url = sanitizeEndpoint(profile.apiEndpoint ?? "");
  const token = (profile.bearerToken ?? "").toString().trim();
  const item: OutboxItem = {
    url,
    headers: { Authorization: token ? `Bearer ${token}` : null },
    payload,
    ts: new Date().toISOString(),
  };
  return [...outbox, item];
};

export const syncOutbox = async (
  outbox: OutboxItem[]
): Promise<{ remaining: OutboxItem[]; success: number }> => {
  let success = 0;
  const remaining: OutboxItem[] = [];
  for (const item of outbox) {
    const url = item.url ?? "";
    if (!url.startsWith("http")) {
      remaining.push(item);
      continue;
    }
    try {
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "x-ms-client-tracking-id": uuidv4(),
          ...(item.headers?.Authorization
            ? { Authorization: item.headers.Authorization }
            : {}),
        },
        body: JSON.stringify(item.payload ?? {}),
      });
      if (resp.status >= 200 && resp.status < 300) {
        success += 1;
      } else {
        remaining.push(item);
      }
    } catch {
      remaining.push(item);
    }
  }
  return { remaining, success };
};
