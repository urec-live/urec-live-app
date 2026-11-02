import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Saved copies of backend data, so a screen can show what it last saw right away (even after an app
 * restart) and refresh in the background. Keys that start with USER_PREFIX hold one member's data and
 * are wiped on sign-out; the rest is gym data everyone sees (exercises, floor plans, machines).
 *
 * Screens use it through hooks/useCachedResource.ts.
 */

export interface CacheEntry<T> {
  data: T;
  /** When the data was last fetched from the backend (live updates patch it without changing this) */
  updatedAt: number;
}

export interface Freshness {
  /** How long a fetched copy counts as fresh, in ms. 0 = refetch every time it's used. */
  staleTime: number;
  /**
   * The data holds machine statuses. They're only fresh while live updates have been connected the
   * whole time since the fetch, because a status change while disconnected would be missed.
   */
  live?: boolean;
}

/** A machine as the backend sends it, in lists, floor plans and live updates */
export interface MachineLike {
  id: number;
  code: string;
  status: string;
  exercise?: string;
}

const STORAGE_PREFIX = "cache:v1:";
export const USER_PREFIX = "user:";

// Keys whose data contains machines, kept current by live updates (see patchCachedMachine)
const LIVE_PREFIXES = ["machines", "machine:", "floor-plans"];
// How long a live update is replayed onto fetches that were already running when it arrived
const PATCH_REPLAY_MS = 60_000;

const entries = new Map<string, CacheEntry<unknown>>();
const listeners = new Map<string, Set<() => void>>();
const inFlight = new Map<string, Promise<unknown>>();
const fetchers = new Map<string, () => Promise<unknown>>();
const invalidatedAt = new Map<string, number>();
const recentPatches = new Map<number, { machine: MachineLike; at: number }>();
// Bumped by the clear functions, so a fetch that started before sign-out can't save its result
let generation = 0;
let liveSince: () => number | null = () => null;

export const isLiveKey = (key: string) => LIVE_PREFIXES.some((prefix) => key.startsWith(prefix));

function notify(key: string) {
  listeners.get(key)?.forEach((listener) => listener());
}

function persist(key: string, entry: CacheEntry<unknown>) {
  AsyncStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(entry)).catch(() => {});
}

function parseEntry(raw: string | null | undefined): CacheEntry<unknown> | undefined {
  if (!raw) return undefined;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed.updatedAt === "number" && "data" in parsed ? parsed : undefined;
  } catch {
    return undefined;
  }
}

export function subscribeCached(key: string, listener: () => void): () => void {
  let set = listeners.get(key);
  if (!set) listeners.set(key, (set = new Set()));
  set.add(listener);
  return () => {
    set!.delete(listener);
    if (set!.size === 0) listeners.delete(key);
  };
}

/** The saved copy in memory, if any. The same object comes back until the data changes. */
export function peekCached<T>(key: string): CacheEntry<T> | undefined {
  return entries.get(key) as CacheEntry<T> | undefined;
}

/** The saved copy from memory, or else from phone storage (loading it into memory). */
export async function readCached<T>(key: string): Promise<CacheEntry<T> | undefined> {
  const inMemory = peekCached<T>(key);
  if (inMemory) return inMemory;
  const startedIn = generation;
  const saved = parseEntry(await AsyncStorage.getItem(STORAGE_PREFIX + key).catch(() => null));
  if (!saved || generation !== startedIn) return undefined;
  // A fetch may have finished while storage was being read; it's newer
  if (entries.has(key)) return peekCached<T>(key);
  entries.set(key, saved);
  notify(key);
  return saved as CacheEntry<T>;
}

/** Loads every saved copy from phone storage into memory, so the first screens can show them at once. */
export async function preloadCache(): Promise<void> {
  const startedIn = generation;
  let pairs: readonly (readonly [string, string | null])[];
  try {
    const keys = (await AsyncStorage.getAllKeys()).filter((key) => key.startsWith(STORAGE_PREFIX));
    if (keys.length === 0) return;
    pairs = await AsyncStorage.multiGet(keys);
  } catch {
    return; // nothing saved can be read: screens fetch as usual
  }
  if (generation !== startedIn) return;
  for (const [storageKey, raw] of pairs) {
    const key = storageKey.slice(STORAGE_PREFIX.length);
    const saved = parseEntry(raw);
    if (saved && !entries.has(key)) {
      entries.set(key, saved);
      notify(key);
    }
  }
}

/** Saves freshly fetched data. Listeners only hear about it when it differs from the saved copy. */
export function writeCached<T>(key: string, data: T, updatedAt = Date.now()): void {
  const previous = entries.get(key);
  if (previous && JSON.stringify(previous.data) === JSON.stringify(data)) {
    // Same as what's on screen: just note that it was checked, without a redraw
    previous.updatedAt = updatedAt;
    persist(key, previous);
    return;
  }
  const entry = { data, updatedAt };
  entries.set(key, entry);
  persist(key, entry);
  notify(key);
}

/** Changes a saved copy in place (keeping its fetch time). Does nothing if there's no saved copy. */
export function updateCached<T>(key: string, update: (data: T) => T): void {
  const previous = entries.get(key) as CacheEntry<T> | undefined;
  if (!previous) return;
  const data = update(previous.data);
  if (data === previous.data) return;
  const entry = { data, updatedAt: previous.updatedAt };
  entries.set(key, entry);
  persist(key, entry);
  notify(key);
}

/**
 * Fetches and saves. Callers asking for a key that's already being fetched share that request.
 * Live updates that arrive while the request is running are applied to its result, which may have
 * been read before the change.
 */
export function fetchCached<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  fetchers.set(key, fetcher);
  const running = inFlight.get(key);
  if (running) return running as Promise<T>;

  const startedIn = generation;
  const startedAt = Date.now();
  const promise = fetcher()
    .then((fetched) => {
      let data: unknown = fetched;
      if (isLiveKey(key)) {
        for (const { machine, at } of recentPatches.values()) {
          if (at >= startedAt) data = patchMachines(data, machine);
        }
      }
      if (generation === startedIn) writeCached(key, data);
      return data as T;
    })
    .finally(() => {
      if (inFlight.get(key) === promise) inFlight.delete(key);
    });
  inFlight.set(key, promise);
  return promise;
}

/** Whether a saved copy can be shown without refetching. */
export function isFresh(key: string, entry: CacheEntry<unknown>, { staleTime, live = false }: Freshness): boolean {
  if (Date.now() - entry.updatedAt >= staleTime) return false;
  for (const [prefix, at] of invalidatedAt) {
    if (key.startsWith(prefix) && entry.updatedAt <= at) return false;
  }
  if (live) {
    const since = liveSince();
    return since !== null && entry.updatedAt >= since;
  }
  return true;
}

/** Marks every saved copy whose key starts with the prefix as outdated, so its next use refetches. */
export function invalidateCached(prefix: string): void {
  invalidatedAt.set(prefix, Date.now());
}

/** Tells the cache since when live updates have been connected (null = not connected). */
export function setLiveSinceSource(source: () => number | null): void {
  liveSince = source;
}

function isMachine(value: Record<string, unknown>): boolean {
  return typeof value.id === "number" && typeof value.code === "string" && typeof value.status === "string";
}

function sameFields(a: Record<string, unknown>, b: Record<string, unknown>): boolean {
  const keys = Object.keys(a);
  return keys.length === Object.keys(b).length && keys.every((k) => JSON.stringify(a[k]) === JSON.stringify(b[k]));
}

/**
 * Replaces every machine with the update's id, anywhere in the data. Keeps each copy's own
 * "exercise", because lists of machines for an exercise name that exercise, not the machine's
 * primary one. Returns the same object when nothing changed.
 */
export function patchMachines(value: unknown, update: MachineLike): unknown {
  if (Array.isArray(value)) {
    let changed = false;
    const next = value.map((item) => {
      const patched = patchMachines(item, update);
      if (patched !== item) changed = true;
      return patched;
    });
    return changed ? next : value;
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (isMachine(record) && record.id === update.id) {
      const merged: Record<string, unknown> = { ...record, ...update };
      if ("exercise" in record) merged.exercise = record.exercise;
      else delete merged.exercise;
      return sameFields(merged, record) ? value : merged;
    }
    let changed = false;
    const next: Record<string, unknown> = {};
    for (const [field, item] of Object.entries(record)) {
      const patched = patchMachines(item, update);
      if (patched !== item) changed = true;
      next[field] = patched;
    }
    return changed ? next : value;
  }
  return value;
}

/** Applies a machine from a live update (or a check-in/out response) to every saved copy that has it. */
export function patchCachedMachine(machine: MachineLike): void {
  if (!machine || typeof machine.id !== "number") return;
  const now = Date.now();
  recentPatches.set(machine.id, { machine, at: now });
  for (const [id, patch] of recentPatches) {
    if (now - patch.at > PATCH_REPLAY_MS) recentPatches.delete(id);
  }
  for (const key of [...entries.keys()]) {
    if (isLiveKey(key)) updateCached(key, (data) => patchMachines(data, machine));
  }
}

/**
 * Refetches the machine data that's on screen right now. Used after live updates reconnect, since
 * any change during the gap was missed.
 */
export function revalidateLiveResources(): void {
  for (const [key, set] of listeners) {
    const fetcher = fetchers.get(key);
    if (set.size > 0 && isLiveKey(key) && fetcher) fetchCached(key, fetcher).catch(() => {});
  }
}

async function forget(matches: (key: string) => boolean): Promise<void> {
  generation++;
  inFlight.clear();
  for (const key of [...entries.keys()]) {
    if (!matches(key)) continue;
    entries.delete(key);
    fetchers.delete(key);
    notify(key);
  }
  for (const prefix of [...invalidatedAt.keys()]) {
    if (matches(prefix)) invalidatedAt.delete(prefix);
  }
  try {
    const stored = (await AsyncStorage.getAllKeys()).filter(
      (storageKey) => storageKey.startsWith(STORAGE_PREFIX) && matches(storageKey.slice(STORAGE_PREFIX.length)),
    );
    if (stored.length > 0) await AsyncStorage.multiRemove(stored);
  } catch {
    // Storage unavailable: the memory copies are gone, which is what the running app sees
  }
}

/** Sign-out: forgets every member's data, in memory and in phone storage. Gym data stays. */
export function clearUserCache(): Promise<void> {
  return forget((key) => key.startsWith(USER_PREFIX));
}

/** Forgets everything (used by tests). */
export function clearCache(): Promise<void> {
  recentPatches.clear();
  return forget(() => true);
}
