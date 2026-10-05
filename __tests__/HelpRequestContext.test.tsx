import { act, renderHook } from "@testing-library/react-native";
import { AxiosError, AxiosHeaders } from "axios";
import React, { ReactNode } from "react";
import { AppState, AppStateStatus, Vibration } from "react-native";

import { HELP_POLL_MS } from "@/constants/helpRequests";
import { HelpRequestProvider, useHelpRequest } from "@/contexts/HelpRequestContext";
import type { HelpRequest } from "@/services/helpRequestAPI";

let mockUser: { username: string } | null = { username: "jdoe" };
jest.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: mockUser }) }));

jest.mock("@/services/authAPI", () => ({ __esModule: true, default: {} }));

const mockGetActive = jest.fn();
const mockGet = jest.fn();
const mockCallStaff = jest.fn();
const mockConfirmReceived = jest.fn();
const mockCancel = jest.fn();
jest.mock("@/services/helpRequestAPI", () => ({
  ...jest.requireActual("@/services/helpRequestAPI"),
  helpRequestAPI: {
    getActive: (...args: unknown[]) => mockGetActive(...args),
    get: (...args: unknown[]) => mockGet(...args),
    callStaff: (...args: unknown[]) => mockCallStaff(...args),
    confirmReceived: (...args: unknown[]) => mockConfirmReceived(...args),
    cancel: (...args: unknown[]) => mockCancel(...args),
  },
}));

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

const wrapper = ({ children }: { children: ReactNode }) => <HelpRequestProvider>{children}</HelpRequestProvider>;

async function renderContext() {
  const hook = renderHook(() => useHelpRequest(), { wrapper });
  await act(async () => {}); // let the sign-in load settle
  return hook;
}

/** Advances the fake clock and lets any resulting API promises settle. */
async function advance(ms: number) {
  await act(async () => {
    jest.advanceTimersByTime(ms);
  });
}

describe("HelpRequestContext", () => {
  let vibrate: jest.SpyInstance;
  let appStateListener: ((state: AppStateStatus) => void) | undefined;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    mockUser = { username: "jdoe" };
    mockGetActive.mockResolvedValue(null);
    vibrate = jest.spyOn(Vibration, "vibrate").mockImplementation(() => {});
    appStateListener = undefined;
    jest.spyOn(AppState, "addEventListener").mockImplementation((_type, listener) => {
      appStateListener = listener as (state: AppStateStatus) => void;
      return { remove: jest.fn() } as unknown as ReturnType<typeof AppState.addEventListener>;
    });
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  // ── Loading ───────────────────────────────────────────────────────────────

  it("loads the member's open request on sign-in, so it survives an app restart", async () => {
    mockGetActive.mockResolvedValue(helpRequest({ status: "ON_THE_WAY" }));

    const { result } = await renderContext();

    expect(mockGetActive).toHaveBeenCalledTimes(1);
    expect(result.current.activeRequest?.status).toBe("ON_THE_WAY");
  });

  it("does nothing while signed out", async () => {
    mockUser = null;

    const { result } = await renderContext();
    await advance(HELP_POLL_MS * 3);

    expect(mockGetActive).not.toHaveBeenCalled();
    expect(result.current.activeRequest).toBeNull();
  });

  it("doesn't poll when there is no open request", async () => {
    await renderContext();
    await advance(HELP_POLL_MS * 4);

    expect(mockGet).not.toHaveBeenCalled();
  });

  // ── Polling ───────────────────────────────────────────────────────────────

  it("checks the open request every 5 seconds and picks up staff responses", async () => {
    mockGetActive.mockResolvedValue(helpRequest());
    mockGet.mockResolvedValue(helpRequest({ status: "ON_THE_WAY" }));
    const { result } = await renderContext();

    await advance(HELP_POLL_MS - 1);
    expect(mockGet).not.toHaveBeenCalled();

    await advance(1);
    expect(mockGet).toHaveBeenCalledWith(7);
    expect(result.current.activeRequest?.status).toBe("ON_THE_WAY");
    expect(vibrate).toHaveBeenCalledTimes(1);
  });

  it("doesn't vibrate when a check finds nothing new", async () => {
    mockGetActive.mockResolvedValue(helpRequest({ status: "TOO_BUSY" }));
    mockGet.mockResolvedValue(helpRequest({ status: "TOO_BUSY" }));
    await renderContext();

    await advance(HELP_POLL_MS * 2);

    expect(mockGet).toHaveBeenCalledTimes(2);
    expect(vibrate).not.toHaveBeenCalled();
  });

  it("tells the member once staff click Done helping, then stops checking", async () => {
    mockGetActive.mockResolvedValue(helpRequest({ status: "ON_THE_WAY" }));
    mockGet.mockResolvedValue(helpRequest({ status: "RESOLVED", closedBy: "STAFF" }));
    const { result } = await renderContext();

    await advance(HELP_POLL_MS);
    expect(result.current.activeRequest).toBeNull();
    expect(result.current.lastClosed?.closedBy).toBe("STAFF");
    expect(vibrate).toHaveBeenCalledTimes(1);

    await advance(HELP_POLL_MS * 3);
    expect(mockGet).toHaveBeenCalledTimes(1);

    act(() => result.current.dismissClosed());
    expect(result.current.lastClosed).toBeNull();
  });

  it("tells the member when an idle request expires", async () => {
    mockGetActive.mockResolvedValue(helpRequest());
    mockGet.mockResolvedValue(helpRequest({ status: "EXPIRED", closedBy: "SYSTEM" }));
    const { result } = await renderContext();

    await advance(HELP_POLL_MS);

    expect(result.current.lastClosed?.status).toBe("EXPIRED");
  });

  it("keeps checking after a dropped connection", async () => {
    mockGetActive.mockResolvedValue(helpRequest());
    mockGet
      .mockRejectedValueOnce(new AxiosError("Network Error", "ERR_NETWORK"))
      .mockResolvedValue(helpRequest({ status: "ON_THE_WAY" }));
    const { result } = await renderContext();

    await advance(HELP_POLL_MS);
    expect(result.current.activeRequest?.status).toBe("REQUEST_RECEIVED");

    await advance(HELP_POLL_MS);
    expect(mockGet).toHaveBeenCalledTimes(2);
    expect(result.current.activeRequest?.status).toBe("ON_THE_WAY");
  });

  it("pauses checks in the background and refreshes on return", async () => {
    mockGetActive.mockResolvedValue(helpRequest());
    mockGet.mockResolvedValue(helpRequest({ status: "ON_THE_WAY" }));
    const { result } = await renderContext();

    await act(async () => appStateListener?.("background"));
    await advance(HELP_POLL_MS * 3);
    expect(mockGet).not.toHaveBeenCalled();

    await act(async () => appStateListener?.("active"));
    expect(mockGet).toHaveBeenCalledTimes(1);
    expect(result.current.activeRequest?.status).toBe("ON_THE_WAY");
  });

  // ── Calling staff ─────────────────────────────────────────────────────────

  it("stores a new request and starts checking it", async () => {
    mockCallStaff.mockResolvedValue(helpRequest());
    mockGet.mockResolvedValue(helpRequest());
    const { result } = await renderContext();

    let created: HelpRequest | undefined;
    await act(async () => {
      created = await result.current.callStaff({ equipmentId: 12, exerciseName: "Leg Press" });
    });

    expect(mockCallStaff).toHaveBeenCalledWith({ equipmentId: 12, exerciseName: "Leg Press" });
    expect(created?.id).toBe(7);
    expect(result.current.activeRequest?.id).toBe(7);
    await advance(HELP_POLL_MS);
    expect(mockGet).toHaveBeenCalledWith(7);
  });

  it("on a 409 loads the request that's already open, then reports the error", async () => {
    const { result } = await renderContext();
    mockCallStaff.mockRejectedValue(httpError(409));
    mockGetActive.mockResolvedValue(helpRequest({ id: 3, equipmentName: "Rower" }));

    await act(async () => {
      await expect(result.current.callStaff({ equipmentId: 12 })).rejects.toBeInstanceOf(AxiosError);
    });

    expect(result.current.activeRequest?.id).toBe(3);
  });

  it("clears an old 'staff finished' notice when the member calls staff again", async () => {
    mockGetActive.mockResolvedValue(helpRequest());
    mockGet.mockResolvedValue(helpRequest({ status: "RESOLVED", closedBy: "STAFF" }));
    const { result } = await renderContext();
    await advance(HELP_POLL_MS);
    expect(result.current.lastClosed).not.toBeNull();

    mockCallStaff.mockResolvedValue(helpRequest({ id: 8 }));
    await act(async () => {
      await result.current.callStaff({ equipmentId: 12 });
    });

    expect(result.current.lastClosed).toBeNull();
    expect(result.current.activeRequest?.id).toBe(8);
  });

  // ── Member closes it ──────────────────────────────────────────────────────

  it("'Received help' closes the request without the 'staff finished' notice", async () => {
    mockGetActive.mockResolvedValue(helpRequest({ status: "ON_THE_WAY" }));
    mockConfirmReceived.mockResolvedValue(helpRequest({ status: "RESOLVED", closedBy: "MEMBER" }));
    const { result } = await renderContext();

    let closed: HelpRequest | null = null;
    await act(async () => {
      closed = await result.current.confirmReceived();
    });

    expect(mockConfirmReceived).toHaveBeenCalledWith(7);
    expect(closed!.status).toBe("RESOLVED");
    expect(result.current.activeRequest).toBeNull();
    expect(result.current.lastClosed).toBeNull();
    expect(vibrate).not.toHaveBeenCalled();
    await advance(HELP_POLL_MS * 2);
    expect(mockGet).not.toHaveBeenCalled();
  });

  it("cancels the request", async () => {
    mockGetActive.mockResolvedValue(helpRequest());
    mockCancel.mockResolvedValue(helpRequest({ status: "CANCELLED", closedBy: "MEMBER" }));
    const { result } = await renderContext();

    await act(async () => {
      await result.current.cancel();
    });

    expect(mockCancel).toHaveBeenCalledWith(7);
    expect(result.current.activeRequest).toBeNull();
  });

  it("closing with nothing open does nothing", async () => {
    const { result } = await renderContext();

    await act(async () => {
      await expect(result.current.confirmReceived()).resolves.toBeNull();
    });

    expect(mockConfirmReceived).not.toHaveBeenCalled();
  });

  it("on a 409 while closing, picks up that staff already finished it", async () => {
    mockGetActive.mockResolvedValue(helpRequest({ status: "ON_THE_WAY" }));
    mockConfirmReceived.mockRejectedValue(httpError(409));
    mockGet.mockResolvedValue(helpRequest({ status: "RESOLVED", closedBy: "STAFF" }));
    const { result } = await renderContext();

    await act(async () => {
      await expect(result.current.confirmReceived()).rejects.toBeInstanceOf(AxiosError);
    });

    expect(result.current.activeRequest).toBeNull();
    expect(result.current.lastClosed?.closedBy).toBe("STAFF");
  });

  // ── Signing out ───────────────────────────────────────────────────────────

  it("forgets the request on sign-out and stops checking", async () => {
    mockGetActive.mockResolvedValue(helpRequest());
    const { result, rerender } = await renderContext();
    expect(result.current.activeRequest).not.toBeNull();

    mockUser = null;
    rerender({});
    await act(async () => {});
    await advance(HELP_POLL_MS * 3);

    expect(result.current.activeRequest).toBeNull();
    expect(mockGet).not.toHaveBeenCalled();
  });

  it("without a provider, nothing is ever open", async () => {
    const { result } = renderHook(() => useHelpRequest());

    expect(result.current.activeRequest).toBeNull();
    await expect(result.current.callStaff({ equipmentId: 1 })).rejects.toThrow("HelpRequestProvider is missing");
  });
});
