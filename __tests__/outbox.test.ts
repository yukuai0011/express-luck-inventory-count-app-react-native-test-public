import { test, expect, describe, beforeEach, mock } from 'bun:test';
import { enqueueOutbox, drainOutbox } from '../lib/outbox';
import type { OutboxItem } from '../lib/types';

const baseItem: Omit<OutboxItem, 'ts'> = {
  url: 'https://example.test/submit',
  headers: { Authorization: 'Bearer t' },
  payload: { orderNo: '1', recordingNo: 1, locationCode: 'A', packageNo: 'P', quantity: 0, packageIntact: true },
};

describe('enqueueOutbox', () => {
  test('appends a new item with an ISO timestamp', () => {
    const before = new Date().toISOString();
    const next = enqueueOutbox([], { ...baseItem });
    expect(next).toHaveLength(1);
    expect(next[0].ts >= before).toBe(true);
    expect(next[0].url).toBe(baseItem.url);
  });
  test('does not mutate the input array', () => {
    const original: OutboxItem[] = [];
    enqueueOutbox(original, { ...baseItem });
    expect(original).toHaveLength(0);
  });
});

describe('drainOutbox', () => {
  let originalFetch: typeof fetch;
  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });
  test('removes successfully POSTed items', async () => {
    globalThis.fetch = mock(async () =>
      new Response('{}', { status: 200 })
    ) as unknown as typeof fetch;
    const items: OutboxItem[] = [
      { ...baseItem, ts: '2025-01-01T00:00:00.000Z' },
    ];
    const result = await drainOutbox(items);
    expect(result.success).toBe(1);
    expect(result.remaining).toEqual([]);
  });
  test('keeps items on HTTP 500', async () => {
    globalThis.fetch = mock(async () =>
      new Response('boom', { status: 500 })
    ) as unknown as typeof fetch;
    const items: OutboxItem[] = [
      { ...baseItem, ts: '2025-01-01T00:00:00.000Z' },
    ];
    const result = await drainOutbox(items);
    expect(result.success).toBe(0);
    expect(result.remaining).toHaveLength(1);
  });
  test('keeps items on network error', async () => {
    globalThis.fetch = mock(async () => {
      throw new Error('offline');
    }) as unknown as typeof fetch;
    const items: OutboxItem[] = [
      { ...baseItem, ts: '2025-01-01T00:00:00.000Z' },
    ];
    const result = await drainOutbox(items);
    expect(result.success).toBe(0);
    expect(result.remaining).toHaveLength(1);
  });
  test('keeps items with non-http url', async () => {
    const items: OutboxItem[] = [
      { ...baseItem, url: 'notaurl', ts: '2025-01-01T00:00:00.000Z' },
    ];
    const result = await drainOutbox(items);
    expect(result.success).toBe(0);
    expect(result.remaining).toHaveLength(1);
  });
  test('mixed batch returns per-item result', async () => {
    let call = 0;
    globalThis.fetch = mock(async () => {
      call += 1;
      return new Response('{}', { status: call === 1 ? 200 : 500 });
    }) as unknown as typeof fetch;
    const items: OutboxItem[] = [
      { ...baseItem, ts: '2025-01-01T00:00:00.000Z' },
      { ...baseItem, ts: '2025-01-01T00:00:01.000Z' },
    ];
    const result = await drainOutbox(items);
    expect(result.success).toBe(1);
    expect(result.remaining).toHaveLength(1);
  });
  test('preserves Authorization header when present', async () => {
    let capturedAuth: string | null = null;
    globalThis.fetch = mock(async (_url: any, init: any) => {
      capturedAuth = init?.headers?.Authorization ?? null;
      return new Response('{}', { status: 200 });
    }) as unknown as typeof fetch;
    const items: OutboxItem[] = [
      { ...baseItem, ts: '2025-01-01T00:00:00.000Z' },
    ];
    await drainOutbox(items);
    expect(capturedAuth).toBe('Bearer t');
  });
});
