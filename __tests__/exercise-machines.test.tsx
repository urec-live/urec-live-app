import { render, screen } from "@testing-library/react-native";
import React from "react";

import ExerciseMachines from "@/app/(tabs)/workout/equipment/[exercise]";
import { clearCache } from "@/services/resourceCache";

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
  useLocalSearchParams: () => ({ exercise: "Leg Press", muscle: "Legs" }),
}));

jest.mock("@/contexts/WorkoutContext", () => ({
  useWorkout: () => ({ checkIn: jest.fn(), checkOut: jest.fn(), currentSession: null }),
}));
// The picker keys the member's saved history by username
jest.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { username: "sam" } }) }));

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
jest.mock("@react-native-async-storage/async-storage", () =>
  jest.requireActual("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

describe("Machines for an exercise", () => {
  beforeEach(async () => {
    await clearCache();
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
