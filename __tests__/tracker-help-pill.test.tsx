import { fireEvent, render, screen } from "@testing-library/react-native";
import { AxiosError, AxiosHeaders } from "axios";
import React from "react";

import ActiveExerciseTracker from "@/components/ActiveExerciseTracker";
import type { HelpRequest } from "@/services/helpRequestAPI";

const mockRouter = { push: jest.fn(), replace: jest.fn() };
let mockPathname = "/workout";
jest.mock("expo-router", () => ({ useRouter: () => mockRouter, usePathname: () => mockPathname }));

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

const mockContext = {
  activeRequest: null as HelpRequest | null,
  callStaff: jest.fn(),
};
jest.mock("@/contexts/HelpRequestContext", () => ({ useHelpRequest: () => mockContext }));

jest.mock("@/services/machineAPI", () => ({ machineAPI: { checkOut: jest.fn() } }));
jest.mock("@expo/vector-icons", () => ({ MaterialCommunityIcons: () => null }));

function httpError(status: number): AxiosError {
  return new AxiosError("Request failed", "ERR_BAD_REQUEST", undefined, undefined, {
    status,
    statusText: "",
    headers: {},
    config: { headers: new AxiosHeaders() },
    data: "",
  });
}

const pill = (name: string) => screen.getByRole("button", { name });

describe("Workout tracker: call staff", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    mockPathname = "/workout";
    // machineId holds the machine's QR code (see WorkoutContext)
    mockSession = { exerciseName: "Leg Press", machineId: "LP01", muscleGroup: "Legs", startTime: Date.now() };
    mockContext.activeRequest = null;
    mockContext.callStaff.mockResolvedValue({ id: 7 });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("calls staff to the machine in use, by its QR code, with the exercise", async () => {
    render(<ActiveExerciseTracker />);

    fireEvent.press(pill("Call staff for help"));

    await screen.findByRole("button", { name: "Call staff for help" });
    expect(mockContext.callStaff).toHaveBeenCalledWith({ equipmentCode: "LP01", exerciseName: "Leg Press" });
    expect(mockRouter.push).toHaveBeenCalledWith("/help-request");
  });

  it("shows the open request's status and opens it without calling again", () => {
    mockContext.activeRequest = { id: 7, status: "TOO_BUSY" } as HelpRequest;
    render(<ActiveExerciseTracker />);

    expect(screen.getByText("Help: Too busy")).toBeTruthy();
    fireEvent.press(pill("View your help request"));

    expect(mockRouter.push).toHaveBeenCalledWith("/help-request");
    expect(mockContext.callStaff).not.toHaveBeenCalled();
  });

  it("opens the existing request on a 409", async () => {
    mockContext.callStaff.mockRejectedValue(httpError(409));
    render(<ActiveExerciseTracker />);

    fireEvent.press(pill("Call staff for help"));

    await screen.findByRole("button", { name: "Call staff for help" });
    expect(mockRouter.push).toHaveBeenCalledWith("/help-request");
  });

  it("shows other failures in the tracker", async () => {
    mockContext.callStaff.mockRejectedValue(new AxiosError("Network Error", "ERR_NETWORK"));
    render(<ActiveExerciseTracker />);

    fireEvent.press(pill("Call staff for help"));

    expect(await screen.findByText("Can't reach the server. Check your connection and try again.")).toBeTruthy();
    expect(mockRouter.push).not.toHaveBeenCalled();
  });

  it.each(["/help-request", "/demo-player"])("hides on %s", (pathname) => {
    mockPathname = pathname;
    render(<ActiveExerciseTracker />);

    expect(screen.toJSON()).toBeNull();
  });
});
