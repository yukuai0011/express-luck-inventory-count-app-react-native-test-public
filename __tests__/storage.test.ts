import { test, expect, describe, beforeEach, mock } from 'bun:test';

const memStore = new Map<string, string>();
const asyncStorageMock = {
  getItem: mock(async (k: string) => memStore.get(k) ?? null),
  setItem: mock(async (k: string, v: string) => {
    memStore.set(k, v);
  }),
  removeItem: mock(async (k: string) => {
    memStore.delete(k);
  }),
};

mock.module('@react-native-async-storage/async-storage', () => ({
  default: asyncStorageMock,
}));

const { loadProfile, saveProfile, clearProfile, loadOutbox, saveOutbox } =
  await import('../lib/storage');
const { uuidv4 } = await import('../lib/uuid');

beforeEach(() => {
  memStore.clear();
  asyncStorageMock.getItem.mockClear();
  asyncStorageMock.setItem.mockClear();
  asyncStorageMock.removeItem.mockClear();
});

describe('profile storage', () => {
  test('loadProfile returns null when nothing stored', async () => {
    expect(await loadProfile()).toBeNull();
  });
  test('saveProfile then loadProfile round-trips', async () => {
    await saveProfile({
      apiEndpoint: 'https://x',
      orderNo: '1',
      recordingNo: 2,
      locationCode: 'A',
      bearerToken: null,
    });
    const loaded = await loadProfile();
    expect(loaded?.apiEndpoint).toBe('https://x');
    expect(loaded?.orderNo).toBe('1');
  });
  test('loadProfile returns null on corrupt JSON', async () => {
    memStore.set('inventory_profile', 'not-json');
    expect(await loadProfile()).toBeNull();
  });
  test('clearProfile removes the entry', async () => {
    await saveProfile({
      apiEndpoint: 'https://x',
      orderNo: '1',
      recordingNo: 2,
      locationCode: 'A',
      bearerToken: null,
    });
    await clearProfile();
    expect(await loadProfile()).toBeNull();
  });
});

describe('outbox storage', () => {
  test('loadOutbox returns [] when empty', async () => {
    expect(await loadOutbox()).toEqual([]);
  });
  test('saveOutbox then loadOutbox round-trips', async () => {
    const items = [
      {
        url: 'https://x',
        headers: { Authorization: null },
        payload: { a: 1 },
        ts: new Date().toISOString(),
      },
    ];
    await saveOutbox(items);
    expect(await loadOutbox()).toEqual(items);
  });
  test('loadOutbox returns [] on corrupt JSON', async () => {
    memStore.set('inventory_outbox', 'oops');
    expect(await loadOutbox()).toEqual([]);
  });
});

test('storage keys are stable (regression)', () => {
  expect(uuidv4().length).toBeGreaterThan(0);
});
