import { fireEvent, render, screen } from "@testing-library/react-native";
import React from "react";

import HelpRequestBanner from "@/components/HelpRequestBanner";
import type { HelpRequest } from "@/services/helpRequestAPI";

const mockRouter = { push: jest.fn() };
let mockPathname = "/equipment";
jest.mock("expo-router", () => ({ useRouter: () => mockRouter, usePathname: () => mockPathname }));

const mockContext = {
  activeRequest: null as HelpRequest | null,
  lastClosed: null as HelpRequest | null,
  dismissClosed: jest.fn(),
};
jest.mock("@/contexts/HelpRequestContext", () => ({ useHelpRequest: () => mockContext }));

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

describe("HelpRequestBanner", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPathname = "/equipment";
    mockContext.activeRequest = null;
    mockContext.lastClosed = null;
  });

  it("renders nothing without a help request", () => {
    render(<HelpRequestBanner />);

    expect(screen.toJSON()).toBeNull();
  });

  it.each([
    ["REQUEST_RECEIVED", "Request received"],
    ["ON_THE_WAY", "On the way"],
    ["TOO_BUSY", "Too busy"],
  ] as const)("shows %s on every screen and opens the request", (status, label) => {
    mockContext.activeRequest = helpRequest({ status });
    render(<HelpRequestBanner />);

    expect(screen.getByText(`Help: ${label} · Leg Press`)).toBeTruthy();
    fireEvent.press(screen.getByRole("button", { name: `Help request: ${label}. View` }));
    expect(mockRouter.push).toHaveBeenCalledWith("/help-request");
  });

  it("hides on the help request screen itself", () => {
    mockPathname = "/help-request";
    mockContext.activeRequest = helpRequest();
    render(<HelpRequestBanner />);

    expect(screen.toJSON()).toBeNull();
  });

  it("says staff finished, until dismissed", () => {
    mockContext.lastClosed = helpRequest({ status: "RESOLVED", closedBy: "STAFF" });
    render(<HelpRequestBanner />);

    expect(screen.getByText("Staff marked this as done. Glad we could help!")).toBeTruthy();
    fireEvent.press(screen.getByRole("button", { name: "Dismiss" }));
    expect(mockContext.dismissClosed).toHaveBeenCalled();
  });

  it("says when a request expired", () => {
    mockContext.lastClosed = helpRequest({ status: "EXPIRED", closedBy: "SYSTEM" });
    render(<HelpRequestBanner />);

    expect(screen.getByText(/This request expired/)).toBeTruthy();
  });
});
