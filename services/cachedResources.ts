import { FloorPlanResponse, machineAPI } from "./machineAPI";
import { USER_PREFIX } from "./resourceCache";
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

export const cacheKeys = {
  muscleGroups: "muscle-groups",
  exercisesFor: (muscleGroup: string) => `exercises:${muscleGroup.toLowerCase()}`,
  machines: "machines",
  machine: (id: number) => `machine:${id}`,
  machinesFor: (exerciseName: string) => `machines-by-exercise:${exerciseName.toLowerCase()}`,
  machineExercises: (id: number) => `machine-exercises:${id}`,
  floorPlans: "floor-plans",
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
