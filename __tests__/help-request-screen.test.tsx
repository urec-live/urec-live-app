import { fireEvent, render, screen, within } from "@testing-library/react-native";
import { AxiosError, AxiosHeaders } from "axios";
import React from "react";

import HelpRequestScreen from "@/app/help-request";
import type { HelpRequest } from "@/services/helpRequestAPI";

const mockRouter = { back: jest.fn(), replace: jest.fn(), push: jest.fn(), canGoBack: jest.fn(() => true) };
jest.mock("expo-router", () => ({ useRouter: () => mockRouter }));

const mockContext = {
  activeRequest: null as HelpRequest | null,
  lastClosed: null as HelpRequest | null,
  confirmReceived: jest.fn(),
  cancel: jest.fn(),
  dismissClosed: jest.fn(),
};
jest.mock("@/contexts/HelpRequestContext", () => ({ useHelpRequest: () => mockContext }));

const mockConfirm = jest.fn();
jest.mock("@/utils/confirm", () => ({ confirmAsync: (...args: unknown[]) => mockConfirm(...args) }));

jest.mock("@expo/vector-icons", () => ({ MaterialCommunityIcons: () => null }));
// The screen uses isOpenHelpRequest from the API module; keep its axios/AsyncStorage setup out
jest.mock("@/services/authAPI", () => ({ __esModule: true, default: {} }));

const VIDEO = "https://mdn.github.io/shared-assets/videos/flower.mp4";
const GIF = "https://media.giphy.com/media/KzeZ3OXHoSDVZH9cmy/giphy.gif";
const REAL_GIF = "https://media.example.com/calf-raise.gif";
const PLACEHOLDER_NOTE = "These are placeholder clips for now. Real demos are coming soon.";

function helpRequest(overrides: Partial<HelpRequest> = {}): HelpRequest {
  return {
    id: 7,
    status: "REQUEST_RECEIVED",
    equipmentId: 12,
    equipmentCode: "LP01",
    equipmentName: "Leg Press",
    exerciseName: "Leg Press",
    createdAt: "2026-10-04T12:00:00Z",
    updatedAt: "2026-10-04T12:00:00Z",
    firstResponseAt: null,
    closedAt: null,
    closedBy: null,
    demos: [{ exerciseName: "Leg Press", gifUrl: GIF, gifPlaceholder: true, videoUrl: VIDEO, videoPlaceholder: true }],
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

const status = () => screen.getByTestId("help-status");
const receivedButton = () => screen.getByRole("button", { name: "I received help" });
const cancelButton = () => screen.getByRole("button", { name: "Cancel request" });

describe("Help request screen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockContext.activeRequest = helpRequest();
    mockContext.lastClosed = null;
    mockConfirm.mockResolvedValue(true);
  });

  // ── Statuses ──────────────────────────────────────────────────────────────

  it("shows Request received with the machine right after calling staff", () => {
    render(<HelpRequestScreen />);

    expect(screen.getByText("Help is on its way")).toBeTruthy();
    expect(screen.getByText("Leg Press · LP01")).toBeTruthy();
    expect(within(status()).getByText("Request received")).toBeTruthy();
    expect(within(status()).getByText(/Staff have been notified/)).toBeTruthy();
    expect(within(screen.getByTestId("step-staff")).getByText("Waiting for staff")).toBeTruthy();
  });

  it("shows On the way once staff respond", () => {
    mockContext.activeRequest = helpRequest({ status: "ON_THE_WAY" });
    render(<HelpRequestScreen />);

    expect(within(status()).getByText("On the way")).toBeTruthy();
    expect(within(status()).getByText("A staff member is on the way to you.")).toBeTruthy();
    expect(within(screen.getByTestId("step-staff")).getByText("On the way")).toBeTruthy();
  });

  it("shows Too busy and points to the video meanwhile", () => {
    mockContext.activeRequest = helpRequest({ status: "TOO_BUSY" });
    render(<HelpRequestScreen />);

    expect(within(status()).getByText("Too busy")).toBeTruthy();
    expect(within(status()).getByText(/Staff are busy right now/)).toBeTruthy();
    expect(screen.getByText("While you wait, watch how it's done")).toBeTruthy();
  });

  // ── How-to links ──────────────────────────────────────────────────────────

  it("plays the how-to video in the demo player", () => {
    render(<HelpRequestScreen />);

    fireEvent.press(screen.getByRole("link", { name: "Watch a how-to video for Leg Press" }));

    expect(mockRouter.push).toHaveBeenCalledWith({
      pathname: "/demo-player",
      params: {
        title: "Leg Press",
        show: "video",
        video: VIDEO,
        gif: GIF,
        videoPlaceholder: "1",
        gifPlaceholder: "1",
      },
    });
  });

  it("plays the GIF in the demo player, opening on the GIF", () => {
    render(<HelpRequestScreen />);

    fireEvent.press(screen.getByRole("link", { name: "Open the GIF demo for Leg Press" }));

    expect(mockRouter.push).toHaveBeenCalledWith({
      pathname: "/demo-player",
      params: expect.objectContaining({ title: "Leg Press", show: "gif", gif: GIF }),
    });
  });

  it("lists every exercise's demos and says they are placeholders", () => {
    mockContext.activeRequest = helpRequest({
      demos: [
        { exerciseName: "Leg Press", gifUrl: GIF, gifPlaceholder: true, videoUrl: VIDEO, videoPlaceholder: true },
        { exerciseName: "Calf Raise", gifUrl: REAL_GIF, gifPlaceholder: false, videoUrl: VIDEO, videoPlaceholder: true },
      ],
    });
    render(<HelpRequestScreen />);

    expect(screen.getAllByRole("link")).toHaveLength(4);
    expect(screen.getByText(PLACEHOLDER_NOTE)).toBeTruthy();

    fireEvent.press(screen.getByRole("link", { name: "Open the GIF demo for Calf Raise" }));
    expect(mockRouter.push).toHaveBeenCalledWith({
      pathname: "/demo-player",
      params: { title: "Calf Raise", show: "gif", video: VIDEO, gif: REAL_GIF, videoPlaceholder: "1" },
    });
  });

  it("skips media the server has switched off, and the placeholder note once demos are real", () => {
    mockContext.activeRequest = helpRequest({
      demos: [{ exerciseName: "Leg Press", gifUrl: REAL_GIF, gifPlaceholder: false, videoUrl: null, videoPlaceholder: false }],
    });
    render(<HelpRequestScreen />);

    expect(screen.queryByRole("link", { name: "Watch a how-to video for Leg Press" })).toBeNull();
    expect(screen.getByRole("link", { name: "Open the GIF demo for Leg Press" })).toBeTruthy();
    expect(screen.queryByText(PLACEHOLDER_NOTE)).toBeNull();
  });

  it("has no demo section when there are no demos", () => {
    mockContext.activeRequest = helpRequest({ demos: [] });
    render(<HelpRequestScreen />);

    expect(screen.queryByText("While you wait, watch how it's done")).toBeNull();
    expect(screen.queryByRole("link")).toBeNull();
  });

  // ── Received help ─────────────────────────────────────────────────────────

  it("asks 'Are you sure?' before closing, and does nothing if the member backs out", async () => {
    mockConfirm.mockResolvedValue(false);
    render(<HelpRequestScreen />);

    fireEvent.press(receivedButton());

    await screen.findByRole("button", { name: "I received help" });
    expect(mockConfirm).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Are you sure?", confirmText: "Yes, I got help", cancelText: "Not yet" }),
    );
    expect(mockContext.confirmReceived).not.toHaveBeenCalled();
  });

  it("closes the request once confirmed and thanks the member", async () => {
    mockContext.confirmReceived.mockImplementation(async () => {
      const closed = helpRequest({ status: "RESOLVED", closedBy: "MEMBER" });
      mockContext.activeRequest = null;
      return closed;
    });
    render(<HelpRequestScreen />);

    fireEvent.press(receivedButton());

    expect(await screen.findByText("Glad you got the help you needed!")).toBeTruthy();
    expect(mockContext.confirmReceived).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("button", { name: "I received help" })).toBeNull();
    fireEvent.press(screen.getByRole("button", { name: "Done" }));
    expect(mockRouter.back).toHaveBeenCalled();
  });

  it("explains when staff closed it a moment earlier", async () => {
    mockContext.confirmReceived.mockRejectedValue(httpError(409));
    render(<HelpRequestScreen />);

    fireEvent.press(receivedButton());

    expect(await screen.findByText("This request was already closed.")).toBeTruthy();
  });

  it("shows a connection error inline and lets the member retry", async () => {
    mockContext.confirmReceived.mockRejectedValue(new AxiosError("Network Error", "ERR_NETWORK"));
    render(<HelpRequestScreen />);

    fireEvent.press(receivedButton());

    expect(await screen.findByText("Can't reach the server. Check your connection and try again.")).toBeTruthy();
    expect(receivedButton()).not.toBeDisabled();
  });

  // ── Cancel ────────────────────────────────────────────────────────────────

  it("cancels after its own confirmation", async () => {
    mockContext.cancel.mockImplementation(async () => {
      mockContext.activeRequest = null; // as the real context does once the server confirms
      return helpRequest({ status: "CANCELLED", closedBy: "MEMBER" });
    });
    render(<HelpRequestScreen />);

    fireEvent.press(cancelButton());

    expect(await screen.findByText("You cancelled this request.")).toBeTruthy();
    expect(mockConfirm).toHaveBeenCalledWith(
      expect.objectContaining({ confirmText: "Cancel request", cancelText: "Keep waiting", destructive: true }),
    );
    expect(mockContext.cancel).toHaveBeenCalledTimes(1);
    expect(mockContext.confirmReceived).not.toHaveBeenCalled();
  });

  it("doesn't cancel if the member keeps waiting", async () => {
    mockConfirm.mockResolvedValue(false);
    render(<HelpRequestScreen />);

    fireEvent.press(cancelButton());

    await screen.findByRole("button", { name: "Cancel request" });
    expect(mockContext.cancel).not.toHaveBeenCalled();
  });

  // ── Closed by staff / nothing open ────────────────────────────────────────

  it("tells the member staff marked it done, and clears the notice on leaving", () => {
    mockContext.activeRequest = null;
    mockContext.lastClosed = helpRequest({ status: "RESOLVED", closedBy: "STAFF" });
    render(<HelpRequestScreen />);

    expect(screen.getByText("Staff marked this as done. Glad we could help!")).toBeTruthy();
    expect(within(screen.getByTestId("step-helped")).getByText("Helped")).toBeTruthy();

    fireEvent.press(screen.getByRole("button", { name: "Done" }));
    expect(mockContext.dismissClosed).toHaveBeenCalled();
    expect(mockRouter.back).toHaveBeenCalled();
  });

  it("explains when there is no open request", () => {
    mockContext.activeRequest = null;
    mockRouter.canGoBack.mockReturnValueOnce(false);
    render(<HelpRequestScreen />);

    expect(screen.getByText("No open help request")).toBeTruthy();
    fireEvent.press(screen.getByRole("button", { name: "Go back" }));
    expect(mockRouter.replace).toHaveBeenCalledWith("/(tabs)");
  });
});
