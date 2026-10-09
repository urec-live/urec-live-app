import { act, fireEvent, render, screen, within } from "@testing-library/react-native";
import { AxiosError, AxiosHeaders } from "axios";
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
const mockWithdrawReport = jest.fn();
jest.mock("@/services/issueAPI", () => ({
  issueAPI: {
    getMyReports: (...args: unknown[]) => mockGetMyReports(...args),
    withdrawReport: (...args: unknown[]) => mockWithdrawReport(...args),
  },
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
    withdrawnAt: null,
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

const withdrawLink = (card: ReturnType<typeof screen.getByTestId>) =>
  within(card).queryByRole("button", { name: "Reported by mistake? Withdraw" });

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

  // ── Withdrawing a report filed by mistake ─────────────────────────────────

  it("lets the member withdraw an open report they filed by mistake", async () => {
    const withdrawnAt = new Date().toISOString();
    mockGetMyReports.mockResolvedValue([report({ id: 1, status: "ACKNOWLEDGED" })]);
    mockWithdrawReport.mockResolvedValue(
      report({ id: 1, status: "RESOLVED", resolvedAt: withdrawnAt, withdrawnAt })
    );
    render(<MyReportsScreen />);
    const card = await screen.findByTestId("report-1");

    fireEvent.press(withdrawLink(card)!);
    expect(within(card).getByText("Withdraw this report?")).toBeTruthy();
    expect(within(card).getByText("Staff will see that you reported it by mistake. You can't undo this.")).toBeTruthy();
    expect(mockWithdrawReport).not.toHaveBeenCalled(); // nothing is sent until they confirm

    await act(async () => {
      fireEvent.press(within(card).getByRole("button", { name: "Withdraw report" }));
    });

    expect(mockWithdrawReport).toHaveBeenCalledWith(1);
    const updated = screen.getByTestId("report-1");
    expect(within(updated).getByText("Withdrawn")).toBeTruthy();
    expect(within(updated).getByText(/You withdrew this report on/)).toBeTruthy();
    expect(within(updated).queryByText("Withdraw this report?")).toBeNull();
    expect(withdrawLink(updated)).toBeNull();
  });

  it("leaves the report alone when the member chooses to keep it", async () => {
    mockGetMyReports.mockResolvedValue([report({ id: 1, status: "REPORTED" })]);
    render(<MyReportsScreen />);
    const card = await screen.findByTestId("report-1");

    fireEvent.press(withdrawLink(card)!);
    fireEvent.press(within(card).getByRole("button", { name: "Keep report" }));

    expect(mockWithdrawReport).not.toHaveBeenCalled();
    expect(within(card).queryByText("Withdraw this report?")).toBeNull();
    expect(within(card).getAllByText("Submitted").length).toBeGreaterThan(0);
    expect(withdrawLink(card)).toBeTruthy();
  });

  it("only offers to withdraw reports that are still open", async () => {
    const closedAt = new Date().toISOString();
    mockGetMyReports.mockResolvedValue([
      report({ id: 1, status: "REPORTED" }),
      report({ id: 2, status: "IN_PROGRESS" }),
      report({ id: 3, status: "RESOLVED", resolvedAt: closedAt }),
      report({ id: 4, status: "RESOLVED", resolvedAt: closedAt, withdrawnAt: closedAt }),
    ]);
    render(<MyReportsScreen />);

    expect(withdrawLink(await screen.findByTestId("report-1"))).toBeTruthy();
    expect(withdrawLink(screen.getByTestId("report-2"))).toBeTruthy();
    // Fixed by staff
    const fixed = screen.getByTestId("report-3");
    expect(withdrawLink(fixed)).toBeNull();
    expect(within(fixed).getAllByText("Fixed").length).toBeGreaterThan(0);
    // Already withdrawn: labelled as such, without the repair progress strip
    const withdrawn = screen.getByTestId("report-4");
    expect(withdrawLink(withdrawn)).toBeNull();
    expect(within(withdrawn).getByText("Withdrawn")).toBeTruthy();
    expect(within(withdrawn).queryByText("Fixed")).toBeNull();
    expect(within(withdrawn).queryByText("Repairing")).toBeNull();
  });

  it("says why withdrawing failed and keeps the report open so the member can retry", async () => {
    mockGetMyReports.mockResolvedValue([report({ id: 1, status: "REPORTED" })]);
    mockWithdrawReport.mockRejectedValue(new AxiosError("Network Error", "ERR_NETWORK"));
    render(<MyReportsScreen />);
    const card = await screen.findByTestId("report-1");

    fireEvent.press(withdrawLink(card)!);
    await act(async () => {
      fireEvent.press(within(card).getByRole("button", { name: "Withdraw report" }));
    });

    expect(within(card).getByText("Can't reach the server. Check your connection and try again.")).toBeTruthy();
    expect(within(card).getAllByText("Submitted").length).toBeGreaterThan(0);
    expect(within(card).getByRole("button", { name: "Withdraw report" })).toBeEnabled();
    expect(mockGetMyReports).toHaveBeenCalledTimes(1);
  });

  it("shows the latest status when the report was closed in the meantime", async () => {
    mockGetMyReports
      .mockResolvedValueOnce([report({ id: 1, status: "IN_PROGRESS" })])
      .mockResolvedValueOnce([report({ id: 1, status: "RESOLVED", resolvedAt: new Date().toISOString() })]);
    mockWithdrawReport.mockRejectedValue(httpError(409));
    render(<MyReportsScreen />);
    const card = await screen.findByTestId("report-1");

    fireEvent.press(withdrawLink(card)!);
    await act(async () => {
      fireEvent.press(within(card).getByRole("button", { name: "Withdraw report" }));
    });

    expect(mockGetMyReports).toHaveBeenCalledTimes(2);
    const updated = screen.getByTestId("report-1");
    expect(within(updated).getByText("This report is already closed.")).toBeTruthy();
    expect(within(updated).getAllByText("Fixed").length).toBeGreaterThan(0);
    expect(withdrawLink(updated)).toBeNull();
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
