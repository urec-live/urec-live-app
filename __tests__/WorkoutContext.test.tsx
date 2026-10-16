import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, render, waitFor } from "@testing-library/react-native";
import React from "react";

import { useWorkout, WorkoutProvider } from "@/contexts/WorkoutContext";
import { clearCache, isFresh, peekCached, writeCached } from "@/services/resourceCache";

jest.mock("@react-native-async-storage/async-storage", () =>
  jest.requireActual("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);
jest.mock("@/services/authAPI", () => ({ __esModule: true, default: {} }));

const mockPostSession = jest.fn();
jest.mock("@/services/sessionAPI", () => ({
  sessionAPI: { postSession: (...args: unknown[]) => mockPostSession(...args) },
}));

jest.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ isSignedIn: true, user: { username: "sam", email: "sam@example.com" } }),
}));

let workout: ReturnType<typeof useWorkout>;
function Probe() {
  workout = useWorkout();
  return null;
}

const T0 = 1_700_000_000_000;
let now = T0;

async function start(exerciseName: string, muscleGroup: string) {
  render(
    <WorkoutProvider>
      <Probe />
    </WorkoutProvider>,
  );
  await act(async () => {}); // the provider's offline-queue flush on sign-in
  act(() => workout.checkIn(exerciseName, "BP001", muscleGroup));
}

function end(details?: Parameters<ReturnType<typeof useWorkout>["checkOut"]>[0], afterSeconds = 120) {
  now = T0 + afterSeconds * 1000;
  let saved = false;
  act(() => {
    saved = workout.checkOut(details);
  });
  return saved;
}

beforeEach(async () => {
  jest.clearAllMocks();
  await clearCache();
  await AsyncStorage.clear();
  now = T0;
  jest.spyOn(Date, "now").mockImplementation(() => now);
  mockPostSession.mockResolvedValue({ id: 1 });
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("ending a session", () => {
  it("saves a session with sets: today's list, history and the backend", async () => {
    await start("Bench Press", "Chest");

    expect(end({ setDetails: [{ reps: 10, weightLbs: 135 }] })).toBe(true);

    expect(workout.currentSession).toBeNull();
    expect(workout.todayWorkouts).toHaveLength(1);
    expect(workout.workoutHistory[0].sessions).toHaveLength(1);
    await waitFor(() => expect(mockPostSession).toHaveBeenCalledTimes(1));
    expect(mockPostSession).toHaveBeenCalledWith(
      expect.objectContaining({
        exerciseName: "Bench Press",
        machineCode: "BP001",
        muscleGroup: "Chest",
        durationSeconds: 120,
        setDetails: [{ reps: 10, weightLbs: 135 }],
      }),
    );
  });

  it("ends an empty session without saving it anywhere", async () => {
    await start("Bench Press", "Chest");

    expect(end(undefined, 15 * 60)).toBe(false);
    expect(end()).toBe(false); // nothing left to end

    expect(workout.currentSession).toBeNull();
    expect(workout.exerciseStartTime).toBeNull();
    expect(workout.todayWorkouts).toEqual([]);
    expect(workout.workoutHistory).toEqual([]);
    await act(async () => {});
    expect(mockPostSession).not.toHaveBeenCalled();
    expect(await AsyncStorage.getItem("pending_workout_sessions")).toBeNull();
  });

  it("treats an empty set list like no sets", async () => {
    await start("Bench Press", "Chest");

    expect(end({ setDetails: [] })).toBe(false);
    await act(async () => {});
    expect(mockPostSession).not.toHaveBeenCalled();
  });

  it("saves cardio without sets once it lasted a minute, but not before", async () => {
    await start("Running", "Cardio");
    expect(end(undefined, 59)).toBe(false);

    now = T0;
    act(() => workout.checkIn("Running", "TM001", "Cardio"));
    expect(end(undefined, 60)).toBe(true);
    await waitFor(() => expect(mockPostSession).toHaveBeenCalledTimes(1));
    expect(mockPostSession).toHaveBeenCalledWith(expect.objectContaining({ exerciseName: "Running", durationSeconds: 60 }));
  });

  it("marks the member's saved stats and history outdated once the session is saved", async () => {
    writeCached("user:sam:history", [], T0);
    writeCached("user:sam:profile", { streak: 1 }, T0);
    writeCached("user:alex:history", [], T0);
    const fresh = (key: string) => isFresh(key, peekCached(key)!, { staleTime: 60 * 60 * 1000 });
    await start("Bench Press", "Chest");

    end({ setDetails: [{ reps: 5 }] });
    await waitFor(() => expect(fresh("user:sam:history")).toBe(false));

    expect(fresh("user:sam:profile")).toBe(false);
    expect(fresh("user:alex:history")).toBe(true);
  });

  it("queues a session the backend didn't take, and still marks the saved data outdated", async () => {
    mockPostSession.mockRejectedValue(new Error("offline"));
    writeCached("user:sam:history", [], T0);
    await start("Bench Press", "Chest");

    end({ setDetails: [{ reps: 5 }] });

    await waitFor(() => expect(isFresh("user:sam:history", peekCached("user:sam:history")!, { staleTime: 3_600_000 })).toBe(false));
    // Outdated only after the queue write, so it's already there
    const queued = JSON.parse((await AsyncStorage.getItem("pending_workout_sessions"))!);
    expect(queued).toEqual([expect.objectContaining({ exerciseName: "Bench Press", setDetails: [{ reps: 5 }] })]);
  });
});

describe("rest timer", () => {
  it("starts from the given time (e.g. the watch's) or from now", async () => {
    await start("Bench Press", "Chest");

    act(() => workout.startRest(T0 - 5_000));
    expect(workout.restStartTime).toBe(T0 - 5_000);

    act(() => workout.endRest());
    now = T0 + 1_000;
    act(() => workout.startRest());
    expect(workout.restStartTime).toBe(T0 + 1_000);
  });
});
