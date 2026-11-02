import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import React from "react";
import { Alert, AlertButton } from "react-native";

import MachinePicker from "@/app/(tabs)/workout/equipment/[exercise]";
import { cacheKeys } from "@/services/cachedResources";
import type { MachineDto } from "@/services/machineAPI";
import { clearCache, patchCachedMachine, peekCached, setLiveSinceSource, writeCached } from "@/services/resourceCache";

const mockRouter = { push: jest.fn(), replace: jest.fn(), back: jest.fn() };
let mockParams: Record<string, string> = {};
jest.mock("expo-router", () => ({
  useRouter: () => mockRouter,
  useLocalSearchParams: () => mockParams,
}));

const mockApi = {
  getByExercise: jest.fn(),
  getFloorPlans: jest.fn(),
  getFloorPlan: jest.fn(),
  checkIn: jest.fn(),
  checkOut: jest.fn(),
};
jest.mock("@/services/machineAPI", () => ({
  machineAPI: new Proxy({}, { get: (_target, name: string) => (...args: unknown[]) => mockApi[name as keyof typeof mockApi](...args) }),
}));
jest.mock("@/services/sessionAPI", () => ({ sessionAPI: { getMyHistory: jest.fn() } }));

let mockSession: { exerciseName: string; machineCode: string; muscleGroup: string; startTime: number } | null = null;
const mockWorkout = { checkIn: jest.fn(), checkOut: jest.fn() };
jest.mock("@/contexts/WorkoutContext", () => ({
  useWorkout: () => ({ ...mockWorkout, currentSession: mockSession, todayWorkouts: [] }),
}));
jest.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { username: "sam" } }) }));

jest.mock("@/services/watchService", () => ({ WatchService: { syncWorkout: jest.fn() } }));
jest.mock("@/components/MapModal", () => () => null);
jest.mock("@expo/vector-icons", () => ({ MaterialCommunityIcons: () => null }));
jest.mock("expo-linear-gradient", () => ({ LinearGradient: jest.requireActual("react-native").View }));
jest.mock("@react-native-async-storage/async-storage", () =>
  jest.requireActual("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

const machine = (id: number, status: string, exercise: string, extra: Partial<MachineDto> = {}): MachineDto => ({
  id,
  code: `M${id}`,
  name: `Machine ${id}`,
  status,
  exercise,
  ...extra,
});

const never = () => new Promise<never>(() => {});

const MACHINES: Record<string, MachineDto[]> = {
  "Bench Press": [machine(1, "Available", "Bench Press"), machine(2, "In Use", "Bench Press")],
  "Chest Fly": [machine(3, "Available", "Chest Fly")],
  "Cable Crossover": [],
};

beforeEach(async () => {
  jest.clearAllMocks();
  await clearCache();
  // Live updates connected the whole time, so saved machine lists stay fresh between screens
  setLiveSinceSource(() => 0);
  mockSession = null;
  mockApi.getByExercise.mockImplementation((name: string) => Promise.resolve(MACHINES[name]));
  mockApi.getFloorPlans.mockResolvedValue([]);
});

describe("Machine picker", () => {
  beforeEach(() => {
    mockParams = { exercise: "Bench Press", muscle: "Chest" };
  });

  it("opens straight from a saved list, without a request or spinner (e.g. after ending a workout)", async () => {
    writeCached(cacheKeys.machinesFor("Bench Press"), MACHINES["Bench Press"]);

    render(<MachinePicker />);

    expect(screen.queryByText("Loading machines...")).toBeNull();
    expect(screen.getByText("Machine 1")).toBeTruthy();
    await act(async () => {});
    expect(mockApi.getByExercise).not.toHaveBeenCalled();
  });

  it("shows the machines without waiting for the floor plans", async () => {
    mockApi.getFloorPlans.mockImplementation(never);
    render(<MachinePicker />);

    expect(screen.getByText("Loading machines...")).toBeTruthy();
    expect(await screen.findByText("Machine 1")).toBeTruthy();
    expect(screen.getByText("Machine 2")).toBeTruthy();
  });

  it("checks in from the response, without reloading the list", async () => {
    mockApi.checkIn.mockResolvedValue(machine(1, "In Use", "Bench Press"));
    render(<MachinePicker />);
    await screen.findByText("Machine 1");

    fireEvent.press(screen.getByText("Start"));

    await waitFor(() => expect(mockWorkout.checkIn).toHaveBeenCalled());

    expect(mockApi.checkIn).toHaveBeenCalledWith("M1");
    // No catalog exercise id or logging mode in this route's params
    expect(mockWorkout.checkIn).toHaveBeenCalledWith("Bench Press", "M1", "Chest", undefined, undefined);
    expect(peekCached<MachineDto[]>(cacheKeys.machinesFor("Bench Press"))?.data[0].status).toBe("In Use");
    expect(screen.queryByText("Start")).toBeNull();
    expect(mockApi.getByExercise).toHaveBeenCalledTimes(1);
  });

  it("applies live updates for machines whose main exercise is a different one", async () => {
    render(<MachinePicker />);
    await screen.findByText("Machine 1");
    expect(screen.getByText("Start")).toBeTruthy();

    // Machine 1 is primarily a Chest Fly station; the old screen ignored its updates
    act(() => patchCachedMachine(machine(1, "In Use", "Chest Fly")));

    expect(screen.queryByText("Start")).toBeNull();
    expect(peekCached<MachineDto[]>(cacheKeys.machinesFor("Bench Press"))?.data[0].exercise).toBe("Bench Press");
  });

  describe("Stop on the member's own machine", () => {
    let alertSpy: jest.SpyInstance;
    const alertButton = (text: string): AlertButton =>
      (alertSpy.mock.calls[0][2] as AlertButton[]).find((b) => b.text === text)!;

    beforeEach(() => {
      alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});
      mockSession = { exerciseName: "Bench Press", machineCode: "M1", muscleGroup: "Chest", startTime: Date.now() - 60_000 };
      MACHINES["Bench Press"] = [machine(1, "In Use", "Bench Press", { heldByMe: true }), machine(2, "In Use", "Bench Press")];
      mockApi.checkOut.mockResolvedValue(machine(1, "Available", "Bench Press"));
    });

    afterEach(() => {
      alertSpy.mockRestore();
      MACHINES["Bench Press"] = [machine(1, "Available", "Bench Press"), machine(2, "In Use", "Bench Press")];
    });

    it("warns before ending with nothing logged, and stays put on Keep going", async () => {
      render(<MachinePicker />);
      fireEvent.press(await screen.findByText("Stop"));

      // Not inside act: the handler waits for an answer to the prompt
      fireEvent.press(screen.getByText("Skip & Stop"));
      await waitFor(() => expect(alertSpy).toHaveBeenCalled());

      expect(alertSpy.mock.calls[0][0]).toBe("End without saving?");
      await act(async () => alertButton("Keep going").onPress?.());
      expect(mockApi.checkOut).not.toHaveBeenCalled();
      expect(mockRouter.back).not.toHaveBeenCalled();
    });

    it("ends an empty session on End: frees the machine and goes back without reloading", async () => {
      render(<MachinePicker />);
      fireEvent.press(await screen.findByText("Stop"));
      // Not inside act: the handler waits for an answer to the prompt
      fireEvent.press(screen.getByText("Skip & Stop"));
      await waitFor(() => expect(alertSpy).toHaveBeenCalled());

      await act(async () => alertButton("End").onPress?.());

      expect(mockApi.checkOut).toHaveBeenCalledWith("M1");
      expect(mockWorkout.checkOut).toHaveBeenCalledWith(undefined);
      expect(mockRouter.back).toHaveBeenCalled();
      expect(mockApi.getByExercise).toHaveBeenCalledTimes(1);
    });

    it("stops straight away when sets were logged", async () => {
      render(<MachinePicker />);
      fireEvent.press(await screen.findByText("Stop"));
      fireEvent.changeText(screen.getByPlaceholderText("e.g. 3"), "3");
      fireEvent.changeText(screen.getByPlaceholderText("e.g. 10"), "10");

      fireEvent.press(screen.getByText("Save & Stop"));

      await waitFor(() => expect(mockRouter.back).toHaveBeenCalled());
      expect(alertSpy).not.toHaveBeenCalled();
      expect(mockWorkout.checkOut).toHaveBeenCalledWith({
        setDetails: [
          { reps: 10, weightLbs: undefined },
          { reps: 10, weightLbs: undefined },
          { reps: 10, weightLbs: undefined },
        ],
      });
      expect(mockRouter.back).toHaveBeenCalled();
    });
  });
});
