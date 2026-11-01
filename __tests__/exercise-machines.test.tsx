import { fireEvent, render, screen } from "@testing-library/react-native";
import React from "react";

import ExerciseMachines from "@/app/(tabs)/workout/equipment/[exercise]";

const mockRouter = { push: jest.fn(), back: jest.fn(), replace: jest.fn(), dismissTo: jest.fn(), canGoBack: jest.fn() };
jest.mock("expo-router", () => ({
  useRouter: () => mockRouter,
  useLocalSearchParams: () => ({ exercise: "Leg Press", muscle: "Legs" }),
}));

jest.mock("@/contexts/WorkoutContext", () => ({
  useWorkout: () => ({ checkIn: jest.fn(), checkOut: jest.fn(), currentSession: null }),
}));

const mockGetByExercise = jest.fn();
jest.mock("@/services/machineAPI", () => ({
  machineAPI: {
    getByExercise: (...args: unknown[]) => mockGetByExercise(...args),
    getFloorPlans: () => Promise.resolve([]),
    getFloorPlan: () => Promise.reject(new Error("no floor plan")),
    checkIn: jest.fn(),
    checkOut: jest.fn(),
  },
}));

jest.mock("@/services/sessionAPI", () => ({ sessionAPI: { getMyHistory: jest.fn() } }));
jest.mock("@/services/websocketService", () => ({
  __esModule: true,
  default: { subscribe: () => () => {} },
}));
jest.mock("@/components/MapModal", () => () => null);
jest.mock("expo-linear-gradient", () => ({
  LinearGradient: ({ children }: { children?: unknown }) => children,
}));
jest.mock("@expo/vector-icons", () => ({ MaterialCommunityIcons: () => null }));

describe("Machines for an exercise", () => {
  beforeEach(() => { jest.clearAllMocks(); mockGetByExercise.mockResolvedValue([]); });

  it("returns to the previous screen when navigation history exists", async () => {
    mockRouter.canGoBack.mockReturnValue(true);
    render(<ExerciseMachines />);
    await screen.findByText("Leg Press Machines");
    fireEvent.press(screen.getByLabelText("Go back"));
    expect(mockRouter.back).toHaveBeenCalledTimes(1);
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  it("returns to the workout library when opened without history", async () => {
    mockRouter.canGoBack.mockReturnValue(false);
    render(<ExerciseMachines />);
    await screen.findByText("Leg Press Machines");
    fireEvent.press(screen.getByLabelText("Go back"));
    expect(mockRouter.replace).toHaveBeenCalledWith("/workout");
    expect(mockRouter.back).not.toHaveBeenCalled();
  });

  it("offers a direct route to the workout library", async () => {
    render(<ExerciseMachines />);
    await screen.findByText("Leg Press Machines");
    fireEvent.press(screen.getByLabelText("Go to workout library"));
    expect(mockRouter.dismissTo).toHaveBeenCalledWith("/workout");
  });

  it("shows out-of-order machines as unavailable, with no Start button", async () => {
    mockGetByExercise.mockResolvedValue([
      { id: 1, code: "LPA", name: "Leg Press A", status: "Out of Order", exercise: "Leg Press" },
      { id: 2, code: "LPB", name: "Leg Press B", status: "Available", exercise: "Leg Press" },
    ]);
    render(<ExerciseMachines />);

    expect(await screen.findByText("Leg Press A")).toBeTruthy();
    expect(screen.getByText("Out of order")).toBeTruthy();
    expect(screen.getByText("Leg Press A")).toBeDisabled();
    expect(screen.getByText("Leg Press B")).not.toBeDisabled();
    // Only the available machine can be started
    expect(screen.getAllByText("Start")).toHaveLength(1);
  });
});
