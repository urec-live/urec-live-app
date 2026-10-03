import { fireEvent, render, screen } from "@testing-library/react-native";
import React from "react";

import MachineDetails from "@/app/machine/[id]";

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

jest.mock("@expo/vector-icons", () => ({ MaterialCommunityIcons: () => null }));

const NOTHING_OPEN = { equipmentId: 12, openReportCount: 0, worstSeverity: null, status: null };

describe("Machine details screen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
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

  it("opens the report form for this machine", async () => {
    mockGetMachineIssueStatus.mockResolvedValue(NOTHING_OPEN);
    render(<MachineDetails />);

    fireEvent.press(await screen.findByText("Report a problem"));

    expect(mockRouter.push).toHaveBeenCalledWith({ pathname: "/report-issue", params: { id: "12" } });
  });
});
