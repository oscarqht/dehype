import { CacheEntry, CacheStore } from './types';

const STORAGE_KEY = 'dehype_lru_cache_v1';
export const MAX_CACHE_SIZE = 500;

/**
 * Fast deterministic string hash function for fallback tweet IDs
 */
export function computeTextHash(text: string): string {
  let hash = 5381;
  const str = text.trim();
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }
  return 'hash_' + (hash >>> 0).toString(16);
}

async function getRawStore(): Promise<CacheStore> {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEY);
    const store = result[STORAGE_KEY] as Partial<CacheStore> | undefined;
    if (store && typeof store === 'object' && Array.isArray(store.order) && store.entries) {
      return store as CacheStore;
    }
  } catch (err) {
    console.warn('[Dehype] Failed to read cache from storage:', err);
  }
  return { entries: {}, order: [] };
}

async function saveRawStore(store: CacheStore): Promise<void> {
  try {
    await chrome.storage.local.set({ [STORAGE_KEY]: store });
  } catch (err) {
    console.error('[Dehype] Failed to save cache to storage:', err);
  }
}

let cacheOpQueue: Promise<unknown> = Promise.resolve();

function enqueueCacheOp<T>(fn: () => Promise<T>): Promise<T> {
  const next = cacheOpQueue.then(fn, fn);
  cacheOpQueue = next.catch(() => {});
  return next;
}

/**
 * Retrieves cached entries for the given keys.
 * Updates LRU order for retrieved items.
 */
export async function getCachedTweets(keys: string[]): Promise<Map<string, CacheEntry>> {
  const hits = new Map<string, CacheEntry>();
  if (!keys.length) return hits;

  return enqueueCacheOp(async () => {
    const store = await getRawStore();
    let updated = false;

    for (const key of keys) {
      const entry = store.entries[key];
      if (entry) {
        hits.set(key, entry);
        // Move key to the end of LRU order
        const idx = store.order.indexOf(key);
        if (idx !== -1) {
          store.order.splice(idx, 1);
        }
        store.order.push(key);
        entry.timestamp = Date.now();
        updated = true;
      }
    }

    if (updated) {
      await saveRawStore(store);
    }

    return hits;
  });
}

/**
 * Saves new dehyped items into the LRU cache.
 * Evicts oldest items if cache exceeds MAX_CACHE_SIZE.
 */
export async function setCachedTweets(
  items: Array<{ key: string; originalText: string; dehypedText: string; isHype?: boolean }>
): Promise<void> {
  if (!items.length) return;

  return enqueueCacheOp(async () => {
    const store = await getRawStore();
    const now = Date.now();

    for (const item of items) {
      const existingIdx = store.order.indexOf(item.key);
      if (existingIdx !== -1) {
        store.order.splice(existingIdx, 1);
      }

      store.entries[item.key] = {
        id: item.key,
        originalText: item.originalText,
        dehypedText: item.dehypedText,
        isHype: item.isHype,
        timestamp: now,
      };
      store.order.push(item.key);
    }

    // Evict oldest entries if capacity exceeded
    while (store.order.length > MAX_CACHE_SIZE) {
      const oldestKey = store.order.shift();
      if (oldestKey && store.entries[oldestKey]) {
        delete store.entries[oldestKey];
      }
    }

    await saveRawStore(store);
  });
}

/**
 * Returns current cache count and max capacity
 */
export async function getCacheStats(): Promise<{ count: number; maxSize: number }> {
  const store = await getRawStore();
  return {
    count: store.order.length,
    maxSize: MAX_CACHE_SIZE,
  };
}

/**
 * Clears all cached tweets
 */
export async function clearCache(): Promise<void> {
  await chrome.storage.local.remove(STORAGE_KEY);
}
