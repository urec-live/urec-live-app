import { act, fireEvent, render, screen } from "@testing-library/react-native";
import React from "react";

import MachineDetails from "@/app/machine/[id]";
import { clearCache, patchCachedMachine, writeCached } from "@/services/resourceCache";

const mockRouter = { push: jest.fn(), back: jest.fn() };

jest.mock("expo-router", () => {
  const { useEffect } = jest.requireActual("react");
  return {
    useRouter: () => mockRouter,
    useLocalSearchParams: () => ({ id: "12" }),
    useFocusEffect: (effect: () => void | (() => void)) => useEffect(effect, [effect]),
  };
});

const mockGetMachineById = jest.fn();
const mockGetExercises = jest.fn();
jest.mock("@/services/machineAPI", () => ({
  machineAPI: {
    getMachineById: (...args: unknown[]) => mockGetMachineById(...args),
    getExercisesByEquipmentId: (...args: unknown[]) => mockGetExercises(...args),
    updateMachineStatus: jest.fn(),
  },
}));

const mockGetMachineIssueStatus = jest.fn();
jest.mock("@/services/issueAPI", () => ({
  issueAPI: { getMachineIssueStatus: (...args: unknown[]) => mockGetMachineIssueStatus(...args) },
}));

// The machine page also shows the Call staff card, which reads the open help request
jest.mock("@/contexts/HelpRequestContext", () => ({
  useHelpRequest: () => ({ activeRequest: null, callStaff: jest.fn() }),
}));

jest.mock("@expo/vector-icons", () => ({ MaterialCommunityIcons: () => null }));
jest.mock("@react-native-async-storage/async-storage", () =>
  jest.requireActual("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

const NOTHING_OPEN = { equipmentId: 12, openReportCount: 0, worstSeverity: null, status: null };

describe("Machine details screen", () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    // Saved machine data would otherwise carry over from the previous test
    await clearCache();
    mockGetMachineById.mockResolvedValue({ id: 12, name: "Leg Press", status: "Available", exercise: "Leg Press" });
    mockGetExercises.mockResolvedValue([]);
  });

  it("warns members about open issues on the machine", async () => {
    mockGetMachineIssueStatus.mockResolvedValue({
      equipmentId: 12,
      openReportCount: 2,
      worstSeverity: "OUT_OF_ORDER",
      status: "IN_PROGRESS",
    });
    render(<MachineDetails />);

    expect(await screen.findByText("Reported not working")).toBeTruthy();
    expect(screen.getByText("2 reports · Repair in progress")).toBeTruthy();
    expect(mockGetMachineIssueStatus).toHaveBeenCalledWith(12);
  });

  it("shows no warning when nothing is open", async () => {
    mockGetMachineIssueStatus.mockResolvedValue(NOTHING_OPEN);
    render(<MachineDetails />);

    await screen.findByText("Leg Press");
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("still shows the machine when the issue summary can't be loaded", async () => {
    mockGetMachineIssueStatus.mockRejectedValue(new Error("offline"));
    render(<MachineDetails />);

    expect(await screen.findByText("Leg Press")).toBeTruthy();
    expect(screen.getByText("Report a problem")).toBeTruthy();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("replaces check-in with a notice when the machine is out of order", async () => {
    mockGetMachineById.mockResolvedValue({ id: 12, name: "Leg Press", status: "Out of Order", exercise: "Leg Press" });
    mockGetMachineIssueStatus.mockResolvedValue(NOTHING_OPEN);
    render(<MachineDetails />);

    expect(
      await screen.findByText("Staff have taken this machine out of service, so check-in is unavailable.")
    ).toBeTruthy();
    expect(screen.getByText("OUT OF ORDER")).toBeTruthy();
    expect(screen.queryByText("Scan QR to Check In")).toBeNull();
    // Members can still add a report about it
    expect(screen.getByText("Report a problem")).toBeTruthy();
  });

  it("swaps check-in for the notice when staff take the machine out of service while it's open", async () => {
    // Live updates find machines by id among saved data that has a QR code, as the backend always sends
    mockGetMachineById.mockResolvedValue({ id: 12, code: "LP01", name: "Leg Press", status: "Available", exercise: "Leg Press" });
    mockGetMachineIssueStatus.mockResolvedValue(NOTHING_OPEN);
    render(<MachineDetails />);
    expect(await screen.findByText("Scan QR to Check In")).toBeTruthy();

    act(() => patchCachedMachine({ id: 12, code: "LP01", status: "Out of Order", exercise: "Leg Press" }));

    expect(
      screen.getByText("Staff have taken this machine out of service, so check-in is unavailable.")
    ).toBeTruthy();
    expect(screen.queryByText("Scan QR to Check In")).toBeNull();
    expect(mockGetMachineById).toHaveBeenCalledTimes(1);
  });

  it("shows the notice straight away when the Equipment tab's saved list has the machine out of order", async () => {
    writeCached("machines", [
      { id: 12, code: "LP01", name: "Leg Press", status: "Out of Order", exercise: "Leg Press", exerciseNames: ["Leg Press"], muscleGroups: ["Quads"] },
    ]);
    mockGetMachineById.mockReturnValue(new Promise(() => {}));
    mockGetMachineIssueStatus.mockResolvedValue(NOTHING_OPEN);
    render(<MachineDetails />);

    expect(screen.queryByText("Loading machine details...")).toBeNull();
    expect(
      screen.getByText("Staff have taken this machine out of service, so check-in is unavailable.")
    ).toBeTruthy();
    // The issue banner still loads on its own
    await act(async () => {});
    expect(mockGetMachineIssueStatus).toHaveBeenCalledWith(12);
  });

  it("offers check-in for machines that are in service", async () => {
    mockGetMachineIssueStatus.mockResolvedValue(NOTHING_OPEN);
    render(<MachineDetails />);

    expect(await screen.findByText("Scan QR to Check In")).toBeTruthy();
    expect(screen.queryByText("Staff have taken this machine out of service, so check-in is unavailable.")).toBeNull();
  });

  it("opens the report form for this machine", async () => {
    mockGetMachineIssueStatus.mockResolvedValue(NOTHING_OPEN);
    render(<MachineDetails />);

    fireEvent.press(await screen.findByText("Report a problem"));

    expect(mockRouter.push).toHaveBeenCalledWith({ pathname: "/report-issue", params: { id: "12" } });
  });
});
