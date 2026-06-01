import { useCallback, useEffect, useState } from 'react';
import { enqueue as enqueuePure, syncOutbox } from '../lib/outbox';
import { loadOutbox, saveOutbox } from '../lib/storage';
import type { OutboxItem } from '../lib/types';

export function useOutbox() {
  const [outbox, setOutbox] = useState<OutboxItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const items = await loadOutbox();
      if (!cancelled) {
        setOutbox(items);
        setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const enqueue = useCallback(
    async (item: OutboxItem) => {
      const next = enqueuePure(item, outbox);
      setOutbox(next);
      await saveOutbox(next);
    },
    [outbox],
  );

  const sync = useCallback(async (): Promise<number> => {
    const { synced, remaining } = await syncOutbox(outbox);
    setOutbox(remaining);
    await saveOutbox(remaining);
    return synced.length;
  }, [outbox]);

  const clear = useCallback(async () => {
    setOutbox([]);
    await saveOutbox([]);
  }, []);

  return { outbox, loaded, enqueue, sync, clear };
}
