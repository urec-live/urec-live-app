import { act, fireEvent, render, screen, within } from "@testing-library/react-native";
import React from "react";
import { RefreshControl } from "react-native";

import MyReportsScreen from "@/app/my-reports";
import type { IssueReport } from "@/services/issueAPI";

const mockRouter = { back: jest.fn(), replace: jest.fn(), canGoBack: jest.fn(() => true) };

jest.mock("expo-router", () => {
  const { useEffect } = jest.requireActual("react");
  return {
    useRouter: () => mockRouter,
    // Behave like a first focus: run the effect once on mount
    useFocusEffect: (effect: () => void) => useEffect(effect, [effect]),
  };
});

const mockGetMyReports = jest.fn();
jest.mock("@/services/issueAPI", () => ({
  issueAPI: { getMyReports: (...args: unknown[]) => mockGetMyReports(...args) },
}));

jest.mock("@expo/vector-icons", () => ({ MaterialCommunityIcons: () => null }));

const NOW = new Date().toISOString();

function report(overrides: Partial<IssueReport>): IssueReport {
  return {
    id: 1,
    equipmentId: 12,
    equipmentName: "Leg Press",
    equipmentCode: "LP01",
    severity: "DAMAGED",
    description: "Seat padding is torn",
    status: "REPORTED",
    reporterUsername: "jdoe",
    reportedAt: NOW,
    updatedAt: NOW,
    resolvedAt: null,
    ...overrides,
  };
}

describe("My Equipment Reports screen", () => {
  beforeEach(() => jest.clearAllMocks());

  it("lists each report with its machine, problem and repair status", async () => {
    mockGetMyReports.mockResolvedValue([
      report({ id: 1, equipmentName: "Leg Press", severity: "OUT_OF_ORDER", status: "IN_PROGRESS", description: "Cable snapped" }),
      report({ id: 2, equipmentName: "Bench Press", severity: "DAMAGED", status: "ACKNOWLEDGED", description: "Torn seat" }),
    ]);
    render(<MyReportsScreen />);

    const legPress = await screen.findByTestId("report-1");
    expect(within(legPress).getByText("Leg Press")).toBeTruthy();
    expect(within(legPress).getByText("Not working")).toBeTruthy();
    expect(within(legPress).getByText("Cable snapped")).toBeTruthy();
    expect(within(legPress).getByText("Repair on the way")).toBeTruthy();

    const bench = screen.getByTestId("report-2");
    expect(within(bench).getByText("Bench Press")).toBeTruthy();
    expect(within(bench).getByText("Damaged")).toBeTruthy();
    expect(within(bench).getByText("Seen by staff")).toBeTruthy();
  });

  it.each([
    ["REPORTED", "Submitted"],
    ["ACKNOWLEDGED", "Seen by staff"],
    ["IN_PROGRESS", "Repair on the way"],
    ["RESOLVED", "Fixed"],
  ] as const)("shows %s to the member as \"%s\"", async (status, label) => {
    mockGetMyReports.mockResolvedValue([report({ id: 7, status })]);
    render(<MyReportsScreen />);

    const card = await screen.findByTestId("report-7");
    expect(within(card).getAllByText(label).length).toBeGreaterThan(0);
  });

  it("fills the progress strip up to the current status", async () => {
    mockGetMyReports.mockResolvedValue([report({ id: 1, status: "IN_PROGRESS" })]);
    render(<MyReportsScreen />);

    const card = await screen.findByTestId("report-1");
    for (const step of ["Submitted", "Seen", "Repairing"]) {
      expect(within(card).getByText(step)).toHaveStyle({ color: "#1a1a1a" });
    }
    expect(within(card).getByText("Fixed")).toHaveStyle({ color: "#aaa" });
  });

  it("offers no way to withdraw, edit or delete a report once it's made", async () => {
    mockGetMyReports.mockResolvedValue([
      report({ id: 1, status: "REPORTED" }),
      report({ id: 2, status: "IN_PROGRESS" }),
    ]);
    render(<MyReportsScreen />);

    for (const id of [1, 2]) {
      const card = await screen.findByTestId(`report-${id}`);
      expect(within(card).queryAllByRole("button")).toHaveLength(0);
    }
    expect(screen.queryByText(/withdraw|delete|remove|edit|undo|cancel|mistake/i)).toBeNull();
  });

  it("shows an empty state when the member hasn't reported anything", async () => {
    mockGetMyReports.mockResolvedValue([]);
    render(<MyReportsScreen />);

    expect(await screen.findByText("No reports yet")).toBeTruthy();
  });

  it("shows an error state when reports can't be loaded", async () => {
    mockGetMyReports.mockRejectedValue(new Error("offline"));
    render(<MyReportsScreen />);

    expect(await screen.findByText("Couldn't load your reports")).toBeTruthy();
  });

  it("reloads on pull-to-refresh so status changes show up", async () => {
    mockGetMyReports
      .mockResolvedValueOnce([report({ id: 1, status: "REPORTED" })])
      .mockResolvedValueOnce([report({ id: 1, status: "IN_PROGRESS" })]);
    render(<MyReportsScreen />);
    await screen.findByTestId("report-1");

    await act(async () => {
      screen.UNSAFE_getByType(RefreshControl).props.onRefresh();
    });

    expect(mockGetMyReports).toHaveBeenCalledTimes(2);
    expect(within(screen.getByTestId("report-1")).getByText("Repair on the way")).toBeTruthy();
  });

  it("goes back from the header", async () => {
    mockGetMyReports.mockResolvedValue([]);
    render(<MyReportsScreen />);
    await screen.findByText("No reports yet");

    fireEvent.press(screen.getByText("← Back"));
    expect(mockRouter.back).toHaveBeenCalled();
  });
});
