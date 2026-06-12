/**
 * Simple in-memory TTL cache for API responses.
 *
 * Why: Every Google Apps Script call takes 1-3s. Caching means
 * navigating between pages feels instant — data is served from memory
 * and refreshed silently in the background.
 *
 * Cache is per-tab (module-level singleton). It is intentionally NOT
 * persisted to localStorage because attendance/task data changes
 * frequently and stale persisted data would be confusing.
 */

interface Entry {
  data: unknown;
  expiry: number;
}

const store = new Map<string, Entry>();

export const cache = {
  get(key: string): unknown | null {
    const entry = store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiry) {
      store.delete(key);
      return null;
    }
    return entry.data;
  },

  set(key: string, data: unknown, ttlMs = 45_000) {
    store.set(key, { data, expiry: Date.now() + ttlMs });
  },

  del(...keys: string[]) {
    keys.forEach(k => store.delete(k));
  },

  /** Invalidate every key that starts with the given prefix. */
  delPrefix(prefix: string) {
    for (const key of store.keys()) {
      if (key.startsWith(prefix)) store.delete(key);
    }
  },

  /** Fetch from cache; if missing, call loader(), cache result, return it. */
  async getOrFetch<T>(key: string, loader: () => Promise<T>, ttlMs?: number): Promise<T> {
    const hit = cache.get(key);
    if (hit !== null) return hit as T;
    const data = await loader();
    cache.set(key, data, ttlMs);
    return data;
  },
};
