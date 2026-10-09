import { fireEvent, render, screen } from "@testing-library/react-native";
import { AxiosError, AxiosHeaders } from "axios";
import React from "react";

import MachineDetails from "@/app/machine/[id]";
import CallStaffCard from "@/components/CallStaffCard";
import type { HelpRequest } from "@/services/helpRequestAPI";

const mockRouter = { back: jest.fn(), replace: jest.fn(), push: jest.fn() };
jest.mock("expo-router", () => {
  const { useEffect } = jest.requireActual("react");
  return {
    useRouter: () => mockRouter,
    useLocalSearchParams: () => ({ id: "12" }),
    // The machine page loads its equipment-issue banner on focus; behave like a first focus
    useFocusEffect: (effect: () => void | (() => void)) => useEffect(effect, [effect]),
  };
});

const mockContext = {
  activeRequest: null as HelpRequest | null,
  callStaff: jest.fn(),
};
jest.mock("@/contexts/HelpRequestContext", () => ({ useHelpRequest: () => mockContext }));

const mockGetMachineById = jest.fn();
const mockGetExercises = jest.fn();
jest.mock("@/services/machineAPI", () => ({
  machineAPI: {
    getMachineById: (...args: unknown[]) => mockGetMachineById(...args),
    getExercisesByEquipmentId: (...args: unknown[]) => mockGetExercises(...args),
  },
}));

// The machine page also shows the equipment-issue banner; nothing is reported here
jest.mock("@/services/issueAPI", () => ({
  issueAPI: {
    getMachineIssueStatus: () =>
      Promise.resolve({ equipmentId: 12, openReportCount: 0, worstSeverity: null, status: null }),
  },
}));

jest.mock("@expo/vector-icons", () => ({ MaterialCommunityIcons: () => null }));

function helpRequest(overrides: Partial<HelpRequest> = {}): HelpRequest {
  return {
    id: 7,
    status: "REQUEST_RECEIVED",
    equipmentId: 12,
    equipmentCode: "LP01",
    equipmentName: "Leg Press",
    exerciseName: null,
    createdAt: "2026-10-04T12:00:00Z",
    updatedAt: "2026-10-04T12:00:00Z",
    firstResponseAt: null,
    closedAt: null,
    closedBy: null,
    demos: [],
    ...overrides,
  };
}

function httpError(status: number): AxiosError {
  return new AxiosError("Request failed", "ERR_BAD_REQUEST", undefined, undefined, {
    status,
    statusText: "",
    headers: {},
    config: { headers: new AxiosHeaders() },
    data: "",
  });
}

const callButton = () => screen.getByRole("button", { name: "Call staff" });

describe("Call staff card", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockContext.activeRequest = null;
    mockContext.callStaff.mockResolvedValue(helpRequest());
  });

  it("offers the call button when the member has no open request", () => {
    render(<CallStaffCard equipmentId={12} />);

    expect(screen.getByText("Not sure how to use this?")).toBeTruthy();
    expect(callButton()).toBeTruthy();
  });

  it("calls staff for this machine and opens the request", async () => {
    render(<CallStaffCard equipmentId={12} exerciseName="Leg Press" />);

    fireEvent.press(callButton());

    await screen.findByRole("button", { name: "Call staff" });
    expect(mockContext.callStaff).toHaveBeenCalledWith({ equipmentId: 12, exerciseName: "Leg Press" });
    expect(mockRouter.push).toHaveBeenCalledWith("/help-request");
  });

  it("opens the existing request when one is already open (409)", async () => {
    mockContext.callStaff.mockRejectedValue(httpError(409));
    render(<CallStaffCard equipmentId={12} />);

    fireEvent.press(callButton());

    await screen.findByRole("button", { name: "Call staff" });
    expect(mockRouter.push).toHaveBeenCalledWith("/help-request");
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("shows other failures inline and stays put", async () => {
    mockContext.callStaff.mockRejectedValue(httpError(404));
    render(<CallStaffCard equipmentId={12} />);

    fireEvent.press(callButton());

    expect(await screen.findByText("This machine couldn't be found.")).toBeTruthy();
    expect(mockRouter.push).not.toHaveBeenCalled();
  });

  it("shows the request's status at this machine instead of the button", () => {
    mockContext.activeRequest = helpRequest({ status: "ON_THE_WAY" });
    render(<CallStaffCard equipmentId={12} />);

    expect(screen.getByText("Help requested: On the way")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Call staff" })).toBeNull();
    fireEvent.press(screen.getByRole("button", { name: "View your help request" }));
    expect(mockRouter.push).toHaveBeenCalledWith("/help-request");
  });

  it("points to a request open at a different machine", () => {
    mockContext.activeRequest = helpRequest({ equipmentId: 99, equipmentName: "Rowing Machine 3" });
    render(<CallStaffCard equipmentId={12} />);

    expect(screen.getByText("You asked for help at Rowing Machine 3")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Call staff" })).toBeNull();
  });
});

describe("Machine page", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockContext.activeRequest = null;
    mockContext.callStaff.mockResolvedValue(helpRequest());
    mockGetMachineById.mockResolvedValue({ id: 12, name: "Leg Press", status: "Available", exercise: "Leg Press" });
  });

  it("shows the Call staff card and sends the machine's only exercise", async () => {
    mockGetExercises.mockResolvedValue([{ id: 1, name: "Leg Press", muscleGroup: "Legs", gifUrl: "" }]);
    render(<MachineDetails />);

    fireEvent.press(await screen.findByRole("button", { name: "Call staff" }));

    await screen.findByRole("button", { name: "Call staff" });
    expect(mockContext.callStaff).toHaveBeenCalledWith({ equipmentId: 12, exerciseName: "Leg Press" });
  });

  it("leaves the exercise out when the machine has several", async () => {
    mockGetExercises.mockResolvedValue([
      { id: 1, name: "Leg Press", muscleGroup: "Legs", gifUrl: "" },
      { id: 2, name: "Leg Press Calf Raise", muscleGroup: "Legs", gifUrl: "" },
    ]);
    render(<MachineDetails />);

    fireEvent.press(await screen.findByRole("button", { name: "Call staff" }));

    await screen.findByRole("button", { name: "Call staff" });
    expect(mockContext.callStaff).toHaveBeenCalledWith({ equipmentId: 12, exerciseName: undefined });
  });
});
