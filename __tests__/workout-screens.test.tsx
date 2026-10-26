import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import React from "react";
import { Alert, AlertButton } from "react-native";

import MachinePicker from "@/app/(tabs)/workout/equipment/[exercise]";
import MuscleExercises from "@/app/(tabs)/workout/exercises/[muscle]";
import StrengthWorkout from "@/app/(tabs)/workout/strength";
import type { MachineDto } from "@/services/machineAPI";
import { clearCache, patchCachedMachine, peekCached, setLiveSinceSource } from "@/services/resourceCache";

const mockRouter = { push: jest.fn(), replace: jest.fn(), back: jest.fn() };
let mockParams: Record<string, string> = {};
jest.mock("expo-router", () => ({
  useRouter: () => mockRouter,
  useLocalSearchParams: () => mockParams,
}));

const mockApi = {
  getMuscleGroups: jest.fn(),
  getExercisesByMuscleGroup: jest.fn(),
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

let mockSession: { exerciseName: string; machineId: string; muscleGroup: string; startTime: number } | null = null;
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

const exercise = (id: number, name: string) => ({ id, name, muscleGroup: "Chest", gifUrl: "" });
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
  mockApi.getMuscleGroups.mockResolvedValue(["Back", "Chest"]);
  mockApi.getExercisesByMuscleGroup.mockResolvedValue([
    exercise(1, "Bench Press"),
    exercise(2, "Chest Fly"),
    exercise(3, "Cable Crossover"),
  ]);
  mockApi.getByExercise.mockImplementation((name: string) => Promise.resolve(MACHINES[name]));
  mockApi.getFloorPlans.mockResolvedValue([]);
});

describe("Strength", () => {
  it("loads the muscle groups once, then shows the saved list on the next visit", async () => {
    const first = render(<StrengthWorkout />);
    expect(screen.getByText("Loading muscle groups...")).toBeTruthy();
    expect(await screen.findByText("Chest")).toBeTruthy();
    first.unmount();

    render(<StrengthWorkout />);

    expect(screen.queryByText("Loading muscle groups...")).toBeNull();
    expect(screen.getByText("Chest")).toBeTruthy();
    await act(async () => {});
    expect(mockApi.getMuscleGroups).toHaveBeenCalledTimes(1);
  });

  it("shows Retry when nothing is saved and the request fails", async () => {
    mockApi.getMuscleGroups.mockRejectedValueOnce(new Error("offline"));
    render(<StrengthWorkout />);

    fireEvent.press(await screen.findByText("Retry"));

    expect(await screen.findByText("Chest")).toBeTruthy();
    expect(mockApi.getMuscleGroups).toHaveBeenCalledTimes(2);
  });
});

describe("Muscle group exercises", () => {
  beforeEach(() => {
    mockParams = { muscle: "Chest" };
  });

  it("shows each exercise's availability, and 'No machines' for one without any", async () => {
    render(<MuscleExercises />);

    expect(await screen.findByText("1/2 Available")).toBeTruthy();
    expect(screen.getByText("1/1 Available")).toBeTruthy();
    expect(screen.getByText("No machines")).toBeTruthy();
    expect(mockApi.getExercisesByMuscleGroup).toHaveBeenCalledTimes(1);
    expect(mockApi.getByExercise).toHaveBeenCalledTimes(3);
  });

  it("updates the counts from a live update without refetching anything", async () => {
    render(<MuscleExercises />);
    await screen.findByText("1/2 Available");

    act(() => patchCachedMachine(machine(2, "Available", "Bench Press")));

    expect(screen.getByText("2/2 Available")).toBeTruthy();
    await act(async () => {});
    expect(mockApi.getByExercise).toHaveBeenCalledTimes(3);
    expect(mockApi.getExercisesByMuscleGroup).toHaveBeenCalledTimes(1);
  });

  it("opens straight from saved data on the next visit (e.g. after ending a workout)", async () => {
    const first = render(<MuscleExercises />);
    await screen.findByText("1/2 Available");
    first.unmount();

    render(<MuscleExercises />);

    expect(screen.queryByText("Loading exercises...")).toBeNull();
    expect(screen.getByText("1/2 Available")).toBeTruthy();
    await act(async () => {});
    expect(mockApi.getExercisesByMuscleGroup).toHaveBeenCalledTimes(1);
    expect(mockApi.getByExercise).toHaveBeenCalledTimes(3);
  });

  it("refetches the machine lists when live updates weren't connected", async () => {
    const first = render(<MuscleExercises />);
    await screen.findByText("1/2 Available");
    first.unmount();
    setLiveSinceSource(() => null);

    render(<MuscleExercises />);

    expect(screen.getByText("1/2 Available")).toBeTruthy(); // the saved copy, while it refetches
    await waitFor(() => expect(mockApi.getByExercise).toHaveBeenCalledTimes(6));
    expect(mockApi.getExercisesByMuscleGroup).toHaveBeenCalledTimes(1); // the exercise list is still fresh
  });
});

describe("Machine picker", () => {
  beforeEach(() => {
    mockParams = { exercise: "Bench Press", muscle: "Chest" };
  });

  it("opens with the list the muscle group screen saved, without a request or spinner", async () => {
    const muscle = render(<MuscleExercises />);
    await screen.findByText("1/2 Available");
    muscle.unmount();

    render(<MachinePicker />);

    expect(screen.queryByText("Loading machines...")).toBeNull();
    expect(screen.getByText("Machine 1")).toBeTruthy();
    await act(async () => {});
    expect(mockApi.getByExercise).toHaveBeenCalledTimes(3); // only the muscle screen's
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
    expect(mockWorkout.checkIn).toHaveBeenCalledWith("Bench Press", "M1", "Chest");
    expect(peekCached<MachineDto[]>("machines-by-exercise:bench press")?.data[0].status).toBe("In Use");
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
    expect(peekCached<MachineDto[]>("machines-by-exercise:bench press")?.data[0].exercise).toBe("Bench Press");
  });

  describe("Stop on the member's own machine", () => {
    let alertSpy: jest.SpyInstance;
    const alertButton = (text: string): AlertButton =>
      (alertSpy.mock.calls[0][2] as AlertButton[]).find((b) => b.text === text)!;

    beforeEach(() => {
      alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});
      mockSession = { exerciseName: "Bench Press", machineId: "M1", muscleGroup: "Chest", startTime: Date.now() - 60_000 };
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
