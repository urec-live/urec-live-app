import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import React from "react";
import { Alert, AlertButton } from "react-native";

import ActiveExerciseTracker from "@/components/ActiveExerciseTracker";
import { clearCache, peekCached, writeCached } from "@/services/resourceCache";

const mockRouter = { push: jest.fn(), replace: jest.fn() };
jest.mock("expo-router", () => ({ useRouter: () => mockRouter, usePathname: () => "/workout" }));

let mockSession: { exerciseName: string; machineId: string; muscleGroup: string; startTime: number } | null = null;
const mockCheckOut = jest.fn();
jest.mock("@/contexts/WorkoutContext", () => ({
  useWorkout: () => ({
    currentSession: mockSession,
    exerciseStartTime: mockSession?.startTime ?? null,
    restStartTime: null,
    startRest: jest.fn(),
    endRest: jest.fn(),
    checkOut: (...args: unknown[]) => mockCheckOut(...args),
  }),
}));

jest.mock("@/contexts/HelpRequestContext", () => ({
  useHelpRequest: () => ({ activeRequest: null, callStaff: jest.fn() }),
}));

const mockMachineCheckOut = jest.fn();
jest.mock("@/services/machineAPI", () => ({
  machineAPI: { checkOut: (...args: unknown[]) => mockMachineCheckOut(...args) },
}));
jest.mock("@expo/vector-icons", () => ({ MaterialCommunityIcons: () => null }));
jest.mock("@/services/watchService", () => ({
  WatchService: { syncWorkout: jest.fn(), subscribeToWatch: () => () => {} },
}));
jest.mock("@react-native-async-storage/async-storage", () =>
  jest.requireActual("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

let alertSpy: jest.SpyInstance;
const alertTitle = () => alertSpy.mock.calls[0][0];
const alertMessage = () => alertSpy.mock.calls[0][1];
const alertButton = (text: string): AlertButton =>
  (alertSpy.mock.calls[0][2] as AlertButton[]).find((b) => b.text === text)!;

function session(muscleGroup: string, startedSecondsAgo: number) {
  mockSession = {
    exerciseName: muscleGroup === "Cardio" ? "Running" : "Bench Press",
    machineId: muscleGroup === "Cardio" ? "TM001" : "BP001",
    muscleGroup,
    startTime: Date.now() - startedSecondsAgo * 1000,
  };
}

async function pressEnd() {
  fireEvent.press(screen.getByText("End Workout"));
  await waitFor(() => expect(alertSpy).toHaveBeenCalled());
}

beforeEach(async () => {
  jest.clearAllMocks();
  await clearCache();
  alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});
  mockMachineCheckOut.mockResolvedValue({ id: 3, code: "BP001", status: "Available", exercise: "Bench Press" });
  mockCheckOut.mockReturnValue(false);
});

afterEach(() => {
  alertSpy.mockRestore();
});

describe("Workout tracker: End Workout", () => {
  it("warns that a session with no sets won't be saved, and Keep going leaves it running", async () => {
    session("Chest", 600);
    render(<ActiveExerciseTracker />);

    await pressEnd();

    expect(alertTitle()).toBe("End without saving?");
    expect(alertMessage()).toBe("You haven't logged any sets, so this won't be saved as a workout.");
    await act(async () => alertButton("Keep going").onPress?.());
    expect(mockMachineCheckOut).not.toHaveBeenCalled();
    expect(mockCheckOut).not.toHaveBeenCalled();
  });

  it("ending an empty session frees the machine and passes no sets on", async () => {
    session("Chest", 600);
    render(<ActiveExerciseTracker />);
    await pressEnd();

    await act(async () => alertButton("End").onPress?.());

    expect(mockMachineCheckOut).toHaveBeenCalledWith("BP001");
    expect(mockCheckOut).toHaveBeenCalledWith(undefined);
    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith("/workout/exercises/Chest"));
  });

  it("asks the usual question once a set is logged, and sends the sets", async () => {
    session("Chest", 600);
    render(<ActiveExerciseTracker />);
    fireEvent.changeText(screen.getAllByPlaceholderText("—")[0], "10");

    await pressEnd();

    expect(alertTitle()).toBe("End Workout");
    expect(alertMessage()).toBe("Are you sure?");
    await act(async () => alertButton("End").onPress?.());
    expect(mockCheckOut).toHaveBeenCalledWith({ setDetails: [{ reps: 10, weightLbs: undefined }] });
  });

  it("explains the one-minute rule for short cardio", async () => {
    session("Cardio", 20);
    render(<ActiveExerciseTracker />);

    await pressEnd();

    expect(alertTitle()).toBe("End without saving?");
    expect(alertMessage()).toBe("This lasted under a minute, so it won't be saved as a workout.");
  });

  it("asks the usual question for cardio that lasted a minute, with no sets", async () => {
    session("Cardio", 90);
    render(<ActiveExerciseTracker />);

    await pressEnd();

    expect(alertTitle()).toBe("End Workout");
  });

  it("shows the freed machine in saved lists right away, before the live update", async () => {
    writeCached("machines", [{ id: 3, code: "BP001", status: "In Use", exercise: "Bench Press" }]);
    session("Chest", 600);
    render(<ActiveExerciseTracker />);
    fireEvent.changeText(screen.getAllByPlaceholderText("—")[0], "8");
    await pressEnd();

    await act(async () => alertButton("End").onPress?.());

    expect(peekCached<{ status: string }[]>("machines")?.data[0].status).toBe("Available");
  });

  it("still ends the session when the check-out request fails", async () => {
    mockMachineCheckOut.mockRejectedValue(new Error("offline"));
    session("Chest", 600);
    render(<ActiveExerciseTracker />);
    await pressEnd();

    await act(async () => alertButton("End").onPress?.());

    expect(mockCheckOut).toHaveBeenCalledWith(undefined);
  });
});
