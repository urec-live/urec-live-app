import { fireEvent, render, screen } from "@testing-library/react-native";
import React from "react";

import ActiveExerciseTracker from "@/components/ActiveExerciseTracker";

const mockRouter = { push: jest.fn(), replace: jest.fn() };
let mockPathname = "/workout";

jest.mock("expo-router", () => ({
  useRouter: () => mockRouter,
  usePathname: () => mockPathname,
}));

let mockSession: { exerciseName: string; machineId: string; muscleGroup: string; startTime: number } | null = null;

jest.mock("@/contexts/WorkoutContext", () => ({
  useWorkout: () => ({
    currentSession: mockSession,
    exerciseStartTime: mockSession?.startTime ?? null,
    restStartTime: null,
    startRest: jest.fn(),
    endRest: jest.fn(),
    checkOut: jest.fn(),
  }),
}));

jest.mock("@/services/machineAPI", () => ({ machineAPI: { checkOut: jest.fn() } }));
// The tracker header also has the Call staff pill, which reads the open help request
jest.mock("@/contexts/HelpRequestContext", () => ({
  useHelpRequest: () => ({ activeRequest: null, callStaff: jest.fn() }),
}));

jest.mock("@expo/vector-icons", () => ({ MaterialCommunityIcons: () => null }));

describe("ActiveExerciseTracker", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    mockPathname = "/workout";
    // machineId holds the machine's QR code (see WorkoutContext)
    mockSession = { exerciseName: "Leg Press", machineId: "LP01", muscleGroup: "Legs", startTime: Date.now() };
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("renders nothing without an active session", () => {
    mockSession = null;
    render(<ActiveExerciseTracker />);

    expect(screen.toJSON()).toBeNull();
  });

  it("opens the report form for the machine in use, by its QR code", () => {
    render(<ActiveExerciseTracker />);

    fireEvent.press(screen.getByLabelText("Report a problem with this machine"));

    expect(mockRouter.push).toHaveBeenCalledWith({ pathname: "/report-issue", params: { code: "LP01" } });
  });

  it("steps aside on the report form and keeps the sets already entered", () => {
    const { rerender } = render(<ActiveExerciseTracker />);
    fireEvent.changeText(screen.getAllByPlaceholderText("—")[0], "12");

    mockPathname = "/report-issue";
    rerender(<ActiveExerciseTracker />);
    expect(screen.queryByText("Leg Press")).toBeNull();

    mockPathname = "/workout";
    rerender(<ActiveExerciseTracker />);
    expect(screen.getByText("Leg Press")).toBeTruthy();
    expect(screen.getAllByPlaceholderText("—")[0].props.value).toBe("12");
  });
});
