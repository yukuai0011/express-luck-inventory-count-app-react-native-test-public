import { uuidv4 } from './uuid';
import type { OutboxItem } from './types';

export const enqueueOutbox = (
  current: OutboxItem[],
  item: Omit<OutboxItem, 'ts'>
): OutboxItem[] => [
  ...current,
  { ...item, ts: new Date().toISOString() },
];

export type DrainResult = {
  success: number;
  remaining: OutboxItem[];
};

export const drainOutbox = async (items: OutboxItem[]): Promise<DrainResult> => {
  let success = 0;
  const remaining: OutboxItem[] = [];
  for (const item of items) {
    const url = item.url ?? '';
    if (!url.startsWith('http')) {
      remaining.push(item);
      continue;
    }
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'x-ms-client-tracking-id': uuidv4(),
    };
    const auth = item.headers?.Authorization ?? '';
    if (auth) headers.Authorization = auth;
    try {
      const resp = await fetch(url, {
        method: 'POST',
        headers,
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
  return { success, remaining };
};
