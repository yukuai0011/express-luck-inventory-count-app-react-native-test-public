import { useCallback, useEffect, useState } from 'react';
import { loadOutbox, saveOutbox as persistOutbox } from '@/lib/storage';
import { drainOutbox, enqueueOutbox } from '@/lib/outbox';
import type { OutboxItem } from '@/lib/types';

export const useOutbox = () => {
  const [outbox, setOutbox] = useState<OutboxItem[]>([]);

  useEffect(() => {
    void loadOutbox().then(setOutbox);
  }, []);

  const set = useCallback(async (next: OutboxItem[]) => {
    setOutbox(next);
    await persistOutbox(next);
  }, []);

  const enqueue = useCallback(
    async (item: Omit<OutboxItem, 'ts'>) => {
      const next = enqueueOutbox(outbox, item);
      await set(next);
    },
    [outbox, set]
  );

  const drain = useCallback(async () => {
    const result = await drainOutbox(outbox);
    await set(result.remaining);
    return result;
  }, [outbox, set]);

  const clear = useCallback(async () => {
    await set([]);
  }, [set]);

  const reload = useCallback(async () => {
    setOutbox(await loadOutbox());
  }, []);

  return { outbox, enqueue, drain, clear, reload, set };
};
