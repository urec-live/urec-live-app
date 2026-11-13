import { FloorPlanResponse, machineAPI } from "./machineAPI";
import { invalidateCached, USER_PREFIX } from "./resourceCache";
import { SessionResponse, sessionAPI } from "./sessionAPI";

/**
 * The backend data the app keeps saved copies of (see resourceCache.ts): their keys, how long each
 * stays fresh, and how to fetch the ones several screens share.
 */

export const STALE_MS = {
  /** Exercises, muscle groups, each machine's exercises: they change only when staff edit them */
  catalog: 10 * 60 * 1000,
  /** A member's stats, history and league: refreshed after a workout anyway (invalidateUserData) */
  user: 30 * 1000,
  /**
   * Machine statuses: fresh while live updates stay connected (Freshness.live), but at most this
   * long, since a few changes (staff edits) aren't broadcast
   */
  live: 2 * 60 * 1000,
};

// Machines and floor plans belong to the member's gym, so their keys end in "@<gym id>" ("@none"
// without one). The suffix keeps the prefixes that make them live keys (see resourceCache).
let gymScope = "none";
const GYM_PREFIXES = ["machines", "machine:", "floor-plans"];
const inGym = (key: string) => `${key}@${gymScope}`;

/**
 * Sets the gym whose machines and floor plans the keys below refer to; the root layout calls it
 * with the member's gym. When it changes, that gym's saved copies are marked stale: live updates
 * only arrive for the current gym, so a copy saved while another gym was selected may have missed
 * some, even though the connection never dropped.
 */
export function setCacheGymScope(gymId: number | null): void {
  const next = gymId === null ? "none" : String(gymId);
  if (next === gymScope) return;
  gymScope = next;
  for (const prefix of GYM_PREFIXES) invalidateCached(prefix);
}

export const cacheKeys = {
  muscleGroups: "muscle-groups",
  exerciseDetail: (username: string, id: number) => `${USER_PREFIX}${username}:exercise:${id}`,
  exerciseNote: (username: string, id: number) => `${USER_PREFIX}${username}:exercise-note:${id}`,
  exerciseHistory: (username: string) => `${USER_PREFIX}${username}:exercise-history`,
  exercisesFor: (muscleGroup: string) => `exercises:${muscleGroup.toLowerCase()}`,
  get machines() {
    return inGym("machines");
  },
  machine: (id: number) => inGym(`machine:${id}`),
  machinesFor: (exerciseName: string) => inGym(`machines-by-exercise:${exerciseName.toLowerCase()}`),
  /** A machine's exercises don't depend on the gym */
  machineExercises: (id: number) => `machine-exercises:${id}`,
  get floorPlans() {
    return inGym("floor-plans");
  },
  /** Everything for one member starts with this */
  userPrefix: (username: string) => `${USER_PREFIX}${username}:`,
  user: (username: string, name: "history" | "profile" | "league" | "dm-conversations") =>
    `${USER_PREFIX}${username}:${name}`,
};

/** All floors, or the legacy single floor on a backend without the list endpoint */
export async function fetchFloorPlans(): Promise<FloorPlanResponse[]> {
  try {
    return await machineAPI.getFloorPlans();
  } catch {
    return [await machineAPI.getFloorPlan()];
  }
}

/** The member's latest 100 sessions, newest first */
export async function fetchHistory(): Promise<SessionResponse[]> {
  return (await sessionAPI.getMyHistory(0, 100)).content;
}


// Full history for exercise records: the latest 100 alone can hide older PRs.
export async function fetchExerciseHistory(): Promise<SessionResponse[]> {
  const items: SessionResponse[] = [];
  let page = 0;
  let totalPages = 1;
  while (page < totalPages) {
    const result = await sessionAPI.getMyHistory(page, 100);
    items.push(...result.content);
    totalPages = result.totalPages;
    page++;
  }
  return [...new Map(items.map(item => [item.id, item])).values()];
}
