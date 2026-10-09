import { fireEvent, render, screen } from "@testing-library/react-native";
import { AxiosError, AxiosHeaders } from "axios";
import React from "react";

import ReportIssueScreen from "@/app/report-issue";

const mockRouter = { back: jest.fn(), replace: jest.fn(), push: jest.fn(), canGoBack: jest.fn(() => true) };
let mockParams: { id?: string; code?: string } = {};

jest.mock("expo-router", () => ({
  useRouter: () => mockRouter,
  useLocalSearchParams: () => mockParams,
}));

const mockGetMachineById = jest.fn();
const mockGetMachineByCode = jest.fn();
jest.mock("@/services/machineAPI", () => ({
  machineAPI: {
    getMachineById: (...args: unknown[]) => mockGetMachineById(...args),
    getMachineByCode: (...args: unknown[]) => mockGetMachineByCode(...args),
  },
}));

const mockReportIssue = jest.fn();
jest.mock("@/services/issueAPI", () => ({
  issueAPI: { reportIssue: (...args: unknown[]) => mockReportIssue(...args) },
}));

jest.mock("@expo/vector-icons", () => ({ MaterialCommunityIcons: () => null }));

const LEG_PRESS = { id: 12, name: "Leg Press", status: "Available", exercise: "Leg Press" };

function httpError(status: number): AxiosError {
  return new AxiosError("Request failed", "ERR_BAD_REQUEST", undefined, undefined, {
    status,
    statusText: "",
    headers: {},
    config: { headers: new AxiosHeaders() },
    data: "",
  });
}

async function renderScreen(params: { id?: string; code?: string } = { id: "12" }) {
  mockParams = params;
  render(<ReportIssueScreen />);
  await screen.findByText("Leg Press");
}

const descriptionInput = () => screen.getByLabelText("Problem description");
const sendButton = () => screen.getByRole("button", { name: "Send report" });

function fillForm(severity: "Not working" | "Damaged / hard to use", description: string) {
  fireEvent.press(screen.getByRole("radio", { name: severity }));
  fireEvent.changeText(descriptionInput(), description);
}

describe("Report a problem screen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetMachineById.mockResolvedValue(LEG_PRESS);
    mockGetMachineByCode.mockResolvedValue({ ...LEG_PRESS, code: "LP01" });
  });

  it("loads the machine by id when opened from the machine page", async () => {
    await renderScreen({ id: "12" });

    expect(mockGetMachineById).toHaveBeenCalledWith(12);
    expect(mockGetMachineByCode).not.toHaveBeenCalled();
  });

  it("loads the machine by QR code when opened from the scanner or workout tracker", async () => {
    await renderScreen({ code: "LP01" });

    expect(mockGetMachineByCode).toHaveBeenCalledWith("LP01");
    expect(mockGetMachineById).not.toHaveBeenCalled();
  });

  it("offers a way back when the machine can't be found", async () => {
    mockGetMachineById.mockRejectedValue(httpError(500));
    mockParams = { id: "999" };
    render(<ReportIssueScreen />);

    expect(await screen.findByText("We couldn't find this machine.")).toBeTruthy();
    fireEvent.press(screen.getByText("Go back"));
    expect(mockRouter.back).toHaveBeenCalled();
  });

  it("offers both kinds of problem", async () => {
    await renderScreen();

    expect(screen.getByRole("radio", { name: "Not working" })).toBeTruthy();
    expect(screen.getByRole("radio", { name: "Damaged / hard to use" })).toBeTruthy();
  });

  it("keeps Send disabled until a severity is chosen and the description has 10+ characters", async () => {
    await renderScreen();
    expect(sendButton()).toBeDisabled();

    fireEvent.changeText(descriptionInput(), "Seat padding is torn");
    expect(sendButton()).toBeDisabled(); // no severity yet

    fireEvent.press(screen.getByRole("radio", { name: "Damaged / hard to use" }));
    expect(sendButton()).toBeEnabled();

    fireEvent.changeText(descriptionInput(), "   too short       ");
    expect(sendButton()).toBeDisabled(); // under 10 characters once trimmed

    fireEvent.press(sendButton());
    expect(mockReportIssue).not.toHaveBeenCalled();
  });

  it("shows a character count and the minimum-length hint", async () => {
    await renderScreen();
    expect(screen.getByText("0 / 1000")).toBeTruthy();
    expect(screen.getByText("At least 10 characters")).toBeTruthy();

    fireEvent.changeText(descriptionInput(), "Cable has snapped");

    expect(screen.getByText("17 / 1000")).toBeTruthy();
    expect(screen.queryByText("At least 10 characters")).toBeNull();
  });

  it("marks the chosen severity as selected", async () => {
    await renderScreen();
    const notWorking = screen.getByRole("radio", { name: "Not working" });
    expect(notWorking).not.toBeSelected();

    fireEvent.press(notWorking);

    expect(screen.getByRole("radio", { name: "Not working" })).toBeSelected();
    expect(screen.getByRole("radio", { name: "Damaged / hard to use" })).not.toBeSelected();
  });

  it("sends the trimmed description with the chosen severity, then confirms", async () => {
    mockReportIssue.mockResolvedValue({ id: 1 });
    await renderScreen();

    fillForm("Not working", "  Cable snapped, the stack won't lift  ");
    fireEvent.press(sendButton());

    expect(await screen.findByText("Thanks, staff have been notified")).toBeTruthy();
    expect(mockReportIssue).toHaveBeenCalledTimes(1);
    expect(mockReportIssue).toHaveBeenCalledWith({
      equipmentId: 12,
      severity: "OUT_OF_ORDER",
      description: "Cable snapped, the stack won't lift",
    });

    fireEvent.press(screen.getByText("View my reports"));
    expect(mockRouter.replace).toHaveBeenCalledWith("/my-reports");
  });

  it("tells the member where to withdraw the report if they sent it by mistake", async () => {
    mockReportIssue.mockResolvedValue({ id: 1 });
    await renderScreen();

    fillForm("Not working", "Weights don't move at all");
    fireEvent.press(sendButton());

    expect(await screen.findByText(/Reported it by mistake\? You can withdraw it there\./)).toBeTruthy();
    fireEvent.press(screen.getByText("View my reports"));
    expect(mockRouter.replace).toHaveBeenCalledWith("/my-reports");
  });

  it("goes back when the member taps Done after reporting", async () => {
    mockReportIssue.mockResolvedValue({ id: 1 });
    await renderScreen();

    fillForm("Damaged / hard to use", "Seat padding is torn open");
    fireEvent.press(sendButton());
    fireEvent.press(await screen.findByText("Done"));

    expect(mockRouter.back).toHaveBeenCalled();
  });

  it("tells the member when they've already reported this machine", async () => {
    mockReportIssue.mockRejectedValue(httpError(409));
    await renderScreen();

    fillForm("Damaged / hard to use", "Seat padding is torn open");
    fireEvent.press(sendButton());

    expect(await screen.findByText("You already have an open report for this machine.")).toBeTruthy();
    fireEvent.press(screen.getByText("View my reports"));
    expect(mockRouter.replace).toHaveBeenCalledWith("/my-reports");
  });

  it("keeps the form filled in so the member can retry after a network error", async () => {
    mockReportIssue
      .mockRejectedValueOnce(new AxiosError("Network Error", "ERR_NETWORK"))
      .mockResolvedValueOnce({ id: 1 });
    await renderScreen();

    fillForm("Not working", "Weights don't move at all");
    fireEvent.press(sendButton());

    expect(
      await screen.findByText("Can't reach the server. Check your connection and try again.")
    ).toBeTruthy();
    expect(descriptionInput().props.value).toBe("Weights don't move at all");

    fireEvent.press(sendButton());
    expect(await screen.findByText("Thanks, staff have been notified")).toBeTruthy();
    expect(mockReportIssue).toHaveBeenCalledTimes(2);
  });
});
