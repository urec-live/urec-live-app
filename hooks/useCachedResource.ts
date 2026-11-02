import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";

import {
  CacheEntry,
  Freshness,
  fetchCached,
  isFresh,
  peekCached,
  readCached,
  subscribeCached,
} from "@/services/resourceCache";

export interface ResourceOptions<T> extends Partial<Freshness> {
  /** Shown while nothing is saved for the key yet, e.g. the machine from the list you tapped */
  initialData?: T;
}

export interface Resource<T> {
  /** The saved copy, then the fetched one. Undefined until there's something to show. */
  data: T | undefined;
  /** Nothing to show yet and a fetch is on its way: the only time a screen needs a spinner */
  loading: boolean;
  /** A pull-to-refresh is running */
  refreshing: boolean;
  /** The last fetch failed. data (if any) is then the saved copy. */
  error: unknown;
  /** Fetches in the background if the saved copy is stale. Call it when a screen comes into focus. */
  revalidate: () => void;
  /** Fetches now, e.g. on pull-to-refresh or Retry. */
  refresh: () => Promise<void>;
}

const noop = () => {};

/**
 * Shows the saved copy of `key` at once, and fetches only when it's stale (see Freshness). Every
 * screen using the same key shares the data and the request. A null key does nothing.
 */
export function useCachedResource<T>(
  key: string | null,
  fetcher: () => Promise<T>,
  { staleTime = 0, live = false, initialData }: ResourceOptions<T> = {},
): Resource<T> {
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const keyRef = useRef(key);
  keyRef.current = key;
  // Set once this screen has fetched the key, so the first load and a focus revalidation in the
  // same moment don't both fetch
  const fetchedKeyRef = useRef<string | null>(null);

  const subscribe = useCallback((onChange: () => void) => (key ? subscribeCached(key, onChange) : noop), [key]);
  const getSnapshot = useCallback(() => (key ? peekCached<T>(key) : undefined), [key]);
  const entry = useSyncExternalStore(subscribe, getSnapshot);

  const [error, setError] = useState<unknown>(null);
  const [refreshing, setRefreshing] = useState(false);

  const run = useCallback(async () => {
    if (!key) return;
    fetchedKeyRef.current = key;
    setError(null);
    try {
      await fetchCached(key, () => fetcherRef.current());
    } catch (e) {
      if (keyRef.current === key) setError(e);
    }
  }, [key]);

  const revalidate = useCallback(() => {
    if (!key) return;
    const saved = peekCached<T>(key);
    if (saved && isFresh(key, saved, { staleTime, live })) return;
    void run();
  }, [key, staleTime, live, run]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await run();
    } finally {
      setRefreshing(false);
    }
  }, [run]);

  // First use of a key: load the saved copy (from memory, else phone storage), then fetch if stale
  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    fetchedKeyRef.current = null;
    setError(null);
    (async () => {
      const saved = peekCached<T>(key) ?? (await readCached<T>(key));
      if (cancelled || fetchedKeyRef.current === key) return; // a focus revalidation got there first
      if (saved && isFresh(key, saved, { staleTime, live })) return;
      await run();
    })();
    return () => {
      cancelled = true;
    };
    // Only a new key starts over; freshness settings are fixed per screen
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const data = entry?.data ?? initialData;
  return { data, loading: !!key && data === undefined && error == null, refreshing, error, revalidate, refresh };
}

export interface ResourceRequest<T> {
  key: string;
  fetcher: () => Promise<T>;
}

/**
 * useCachedResource for a list of keys, e.g. the machines for each exercise on a muscle group
 * screen. A failed fetch leaves that key's data undefined (or its saved copy).
 */
export function useCachedResources<T>(
  requests: ResourceRequest<T>[],
  { staleTime = 0, live = false }: Partial<Freshness> = {},
): { data: Record<string, T | undefined>; revalidate: () => Promise<void>; refresh: () => Promise<void> } {
  const keysId = requests.map((r) => r.key).join("\n");
  const requestsRef = useRef(requests);
  requestsRef.current = requests;
  const snapshotRef = useRef<(CacheEntry<T> | undefined)[]>([]);

  const subscribe = useCallback(
    (onChange: () => void) => {
      const offs = splitKeys(keysId).map((key) => subscribeCached(key, onChange));
      return () => offs.forEach((off) => off());
    },
    [keysId],
  );
  // Must return the same array while nothing changed, or React would re-render forever
  const getSnapshot = useCallback(() => {
    const next = splitKeys(keysId).map((key) => peekCached<T>(key));
    const previous = snapshotRef.current;
    if (previous.length === next.length && previous.every((entry, i) => entry === next[i])) return previous;
    snapshotRef.current = next;
    return next;
  }, [keysId]);
  const entries = useSyncExternalStore(subscribe, getSnapshot);

  const fetchAll = useCallback(
    async (force: boolean) => {
      await Promise.all(
        requestsRef.current.map(async ({ key, fetcher }) => {
          const saved = peekCached<T>(key) ?? (await readCached<T>(key));
          if (!force && saved && isFresh(key, saved, { staleTime, live })) return;
          await fetchCached(key, fetcher).catch(() => undefined);
        }),
      );
    },
    [staleTime, live],
  );

  useEffect(() => {
    void fetchAll(false);
  }, [keysId, fetchAll]);

  const data = useMemo(
    () => Object.fromEntries(splitKeys(keysId).map((key, i) => [key, entries[i]?.data])),
    [keysId, entries],
  );
  const revalidate = useCallback(() => fetchAll(false), [fetchAll]);
  const refresh = useCallback(() => fetchAll(true), [fetchAll]);
  return { data, revalidate, refresh };
}

const splitKeys = (keysId: string) => (keysId ? keysId.split("\n") : []);
