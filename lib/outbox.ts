import { submitRecord } from './submit';
import type { OutboxItem } from './types';

export const enqueue = (item: OutboxItem, current: OutboxItem[]): OutboxItem[] => {
  return [...current, item];
};

export const clearOutbox = (): OutboxItem[] => [];

export async function syncOutbox(
  items: OutboxItem[],
): Promise<{ synced: OutboxItem[]; remaining: OutboxItem[] }> {
  const synced: OutboxItem[] = [];
  const remaining: OutboxItem[] = [];
  for (const item of items) {
    const url = item.url ?? '';
    if (!url.startsWith('http')) {
      remaining.push(item);
      continue;
    }
    try {
      const auth = item.headers?.Authorization ?? null;
      const result = await submitRecord(url, auth, item.payload ?? {});
      if (result.ok) {
        synced.push(item);
      } else {
        remaining.push(item);
      }
    } catch {
      remaining.push(item);
    }
  }
  return { synced, remaining };
}
