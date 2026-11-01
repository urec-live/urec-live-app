import React from "react";
import { act, render, waitFor } from "@testing-library/react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { WorkoutProvider, useWorkout } from "@/contexts/WorkoutContext";
import { sessionAPI } from "@/services/sessionAPI";
let mockAccount = { username: "alice", email: "alice@example.com" };
jest.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ isSignedIn: true, user: mockAccount }),
}));
jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);
jest.mock("@/services/sessionAPI", () => ({
  sessionAPI: { postSession: jest.fn() },
}));
let workout: ReturnType<typeof useWorkout>;
function Probe() {
  workout = useWorkout();
  return null;
}
describe("Account-scoped completed workout outbox", () => {
  beforeEach(async () => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    await AsyncStorage.clear();
    mockAccount = { username: "alice", email: "alice@example.com" };
    (sessionAPI.postSession as jest.Mock).mockRejectedValue(
      new Error("offline"),
    );
  });
  afterEach(() => jest.useRealTimers());
  it("keeps the same retry ID, retains pending sessions after reset, and never replays them as another account", async () => {
    const { rerender } = render(
      <WorkoutProvider>
        <Probe />
      </WorkoutProvider>,
    );
    await act(async () => {});
    act(() => workout.checkIn("Plank", undefined, "Core", 51, "DURATION"));
    await act(async () => {
      await workout.checkOut({ setDetails: [{ durationSeconds: 45 }] });
    });
    const saved = JSON.parse(
      (await AsyncStorage.getItem("pending_workout_sessions:alice")) || "[]",
    );
    expect(saved).toHaveLength(1);
    expect(saved[0].ownerUsername).toBe("alice");
    expect(saved[0].machineCode).toBeUndefined();
    act(() => workout.resetWorkout());
    expect(
      JSON.parse(
        (await AsyncStorage.getItem("pending_workout_sessions:alice")) || "[]",
      ),
    ).toHaveLength(1);
    (sessionAPI.postSession as jest.Mock).mockClear();
    mockAccount = { username: "bob", email: "bob@example.com" };
    rerender(
      <WorkoutProvider>
        <Probe />
      </WorkoutProvider>,
    );
    await act(async () => {});
    expect(sessionAPI.postSession).not.toHaveBeenCalled();
    mockAccount = { username: "alice", email: "alice@example.com" };
    (sessionAPI.postSession as jest.Mock).mockResolvedValue({ id: 1 });
    rerender(
      <WorkoutProvider>
        <Probe />
      </WorkoutProvider>,
    );
    await act(async () => {});
    await waitFor(() =>
      expect(sessionAPI.postSession).toHaveBeenCalledWith(
        expect.objectContaining({
          clientSessionId: saved[0].clientSessionId,
          ownerUsername: "alice",
        }),
      ),
    );
    expect(
      JSON.parse(
        (await AsyncStorage.getItem("pending_workout_sessions:alice")) || "[]",
      ),
    ).toEqual([]);
  });
  it("does not assign an unowned legacy queue to the signed-in user", async () => {
    await AsyncStorage.setItem(
      "pending_workout_sessions",
      JSON.stringify([{ exerciseName: "Unknown owner" }]),
    );
    render(
      <WorkoutProvider>
        <Probe />
      </WorkoutProvider>,
    );
    await act(async () => {});
    expect(sessionAPI.postSession).not.toHaveBeenCalled();
    expect(
      await AsyncStorage.getItem("pending_workout_sessions"),
    ).not.toBeNull();
  });
});
