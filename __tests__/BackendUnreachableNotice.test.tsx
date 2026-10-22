import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { AxiosError, AxiosHeaders } from "axios";
import React from "react";

import BackendUnreachableNotice from "@/components/BackendUnreachableNotice";
import { noteRequestAnswered, noteRequestError, resetBackendStatus } from "@/services/backendStatus";

const mockTest = jest.fn();
jest.mock("@/services/authAPI", () => ({ authAPI: { test: (...args: unknown[]) => mockTest(...args) } }));
jest.mock("@expo/vector-icons", () => ({ MaterialCommunityIcons: () => null }));

const networkError = () => new AxiosError("Network Error", "ERR_NETWORK", { headers: new AxiosHeaders() });
const answeredError = (status: number) =>
  new AxiosError(`Request failed with status code ${status}`, "ERR_BAD_RESPONSE", { headers: new AxiosHeaders() }, null, {
    status,
    statusText: "",
    data: "",
    headers: {},
    config: { headers: new AxiosHeaders() },
  });

const NETWORK_TITLE = "Can't reach UREC Live";
const SERVER_TITLE = "UREC Live isn't responding";
const NETWORK_STEPS =
  "Check your Wi-Fi or mobile data, then try again. If your connection is fine, the server may be down for a moment. If it keeps happening, close and reopen the app.";

const fail = (error: unknown = networkError()) => act(() => noteRequestError(error));
const answer = () => act(() => noteRequestAnswered());
const wait = (ms: number) => act(() => jest.advanceTimersByTime(ms));
const shown = () => screen.queryByTestId("backend-notice") !== null;

/** A check that stays open until the test settles it */
function pendingCheck() {
  let resolveCheck!: () => void;
  let rejectCheck!: (error: unknown) => void;
  mockTest.mockReturnValue(
    new Promise<void>((resolve, reject) => {
      resolveCheck = resolve;
      rejectCheck = reject;
    }),
  );
  return {
    succeed: () => act(async () => resolveCheck()),
    fail: (error: unknown = networkError()) => act(async () => rejectCheck(error)),
  };
}

describe("BackendUnreachableNotice", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    resetBackendStatus();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("shows nothing while requests are answered", () => {
    render(<BackendUnreachableNotice />);
    answer();

    expect(screen.toJSON()).toBeNull();
  });

  it("tells the member the app can't reach the server, and what to try", () => {
    render(<BackendUnreachableNotice />);
    fail();

    expect(screen.getByText(NETWORK_TITLE)).toBeTruthy();
    expect(screen.getByText(NETWORK_STEPS)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Try again" })).toBeTruthy();
    // Screen readers announce it; the bar itself stays non-focusable so its buttons stay reachable
    expect(screen.getByTestId("backend-notice").props.accessibilityRole).toBe("alert");
    expect(screen.getByTestId("backend-notice").props.accessibilityLiveRegion).toBe("polite");
  });

  it("says the server isn't responding when the host answers for it", () => {
    render(<BackendUnreachableNotice />);
    fail(answeredError(503));

    expect(screen.getByText(SERVER_TITLE)).toBeTruthy();
    expect(screen.getByText(/the server isn't answering. Try again in a minute/)).toBeTruthy();
  });

  it("goes away on its own after 10 seconds, even while requests keep failing", () => {
    render(<BackendUnreachableNotice />);
    fail();
    wait(5_000);
    fail(); // a poll failing again doesn't keep it up longer

    wait(4_999);
    expect(screen.getByText(NETWORK_TITLE)).toBeTruthy();
    wait(1);
    expect(screen.toJSON()).toBeNull();
  });

  it("switches wording when the kind of failure changes, without staying up longer", () => {
    render(<BackendUnreachableNotice />);
    fail();
    wait(5_000);

    fail(answeredError(502));
    expect(screen.getByText(SERVER_TITLE)).toBeTruthy();
    fail();
    expect(screen.getByText(NETWORK_TITLE)).toBeTruthy();

    wait(5_000);
    expect(screen.toJSON()).toBeNull();
  });

  it("stays away for 30 seconds after going, then comes back if requests still fail", () => {
    render(<BackendUnreachableNotice />);
    fail();
    wait(10_000);

    wait(29_000);
    fail();
    expect(screen.toJSON()).toBeNull();

    wait(1_000);
    fail();
    expect(screen.getByText(NETWORK_TITLE)).toBeTruthy();
  });

  it("can be closed, and then stays away for 30 seconds even if some requests get answers", () => {
    render(<BackendUnreachableNotice />);
    fail();

    fireEvent.press(screen.getByRole("button", { name: "Dismiss" }));
    expect(screen.toJSON()).toBeNull();

    // A patchy connection: answers and failures take turns
    for (let i = 0; i < 6; i++) {
      wait(2_000);
      if (i % 2) fail();
      else answer();
      expect(shown()).toBe(false);
    }
    wait(18_000);
    fail();
    expect(screen.getByText(NETWORK_TITLE)).toBeTruthy();
  });

  it("comes back for failures after the phone's clock is set back, instead of staying quiet", () => {
    render(<BackendUnreachableNotice />);
    fail();
    fireEvent.press(screen.getByRole("button", { name: "Dismiss" }));

    jest.setSystemTime(Date.now() - 3_600_000); // an hour back
    fail();

    expect(screen.getByText(NETWORK_TITLE)).toBeTruthy();
  });

  it("says Connected again for 3 seconds when requests are answered while it's up", () => {
    render(<BackendUnreachableNotice />);
    fail();
    answer();

    expect(screen.getByText("Connected again")).toBeTruthy();
    expect(screen.queryByText(NETWORK_TITLE)).toBeNull();
    wait(2_999);
    expect(screen.getByText("Connected again")).toBeTruthy();
    wait(1);
    expect(screen.toJSON()).toBeNull();
  });

  it("doesn't say Connected again when it wasn't showing", () => {
    render(<BackendUnreachableNotice />);
    fail();
    wait(10_000);
    answer();

    expect(screen.toJSON()).toBeNull();
  });

  it("drops Connected again if requests fail again, and doesn't flip back to the warning", () => {
    render(<BackendUnreachableNotice />);
    fail();
    answer();
    wait(1_000);

    fail();
    expect(screen.toJSON()).toBeNull();
    answer();
    fail();
    expect(screen.toJSON()).toBeNull();

    // A real outage still shows once 30 s have passed since the warning went
    wait(30_000);
    fail();
    expect(screen.getByText(NETWORK_TITLE)).toBeTruthy();
  });

  it("Try again checks the server, and says Connected again when it answers", async () => {
    const check = pendingCheck();
    render(<BackendUnreachableNotice />);
    fail();

    fireEvent.press(screen.getByRole("button", { name: "Try again" }));
    expect(screen.getByRole("button", { name: "Checking…" })).toBeDisabled();
    fireEvent.press(screen.getByRole("button", { name: "Checking…" })); // a second tap sends nothing

    await check.succeed();

    expect(mockTest).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Connected again")).toBeTruthy();
  });

  it("stays up while Try again is checking, however long the check takes", async () => {
    const check = pendingCheck();
    render(<BackendUnreachableNotice />);
    fail();
    wait(8_000);

    fireEvent.press(screen.getByRole("button", { name: "Try again" }));
    wait(12_000); // longer than its own 10 s on screen
    expect(screen.getByRole("button", { name: "Checking…" })).toBeTruthy();

    await check.succeed();
    expect(screen.getByText("Connected again")).toBeTruthy();
  });

  it("a poll answered during a hanging check shows Connected again for 3 seconds, and the check can't undo it", async () => {
    const check = pendingCheck();
    render(<BackendUnreachableNotice />);
    fail();
    fireEvent.press(screen.getByRole("button", { name: "Try again" }));

    answer(); // e.g. the help-request poll gets through
    expect(screen.getByText("Connected again")).toBeTruthy();
    wait(3_000);
    expect(screen.toJSON()).toBeNull();

    fail(); // a newer poll fails: still within the quiet time
    await check.fail(); // and the old check finally times out
    expect(screen.toJSON()).toBeNull();
  });

  it("Try again that still fails says so and keeps the notice up for another 10 seconds", async () => {
    mockTest.mockRejectedValue(networkError());
    render(<BackendUnreachableNotice />);
    fail();
    wait(8_000);

    await act(async () => {
      fireEvent.press(screen.getByRole("button", { name: "Try again" }));
    });

    expect(screen.getByText("Still can't reach UREC Live")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Try again" })).not.toBeDisabled();
    wait(9_999);
    expect(screen.getByText("Still can't reach UREC Live")).toBeTruthy();
    wait(1);
    expect(screen.toJSON()).toBeNull();
  });

  it("stays closed if the member closes it while Try again is checking", async () => {
    const check = pendingCheck();
    render(<BackendUnreachableNotice />);
    fail();
    fireEvent.press(screen.getByRole("button", { name: "Try again" }));

    fireEvent.press(screen.getByRole("button", { name: "Dismiss" }));
    await check.fail();

    expect(screen.toJSON()).toBeNull();
  });

  it("gives React a server snapshot, so the web build can pre-render every page", () => {
    // Without one, expo export's static rendering throws here and the pages ship empty
    const spy = jest.spyOn(React, "useSyncExternalStore");
    render(<BackendUnreachableNotice />);

    const [, getSnapshot, getServerSnapshot] = spy.mock.calls[0];
    expect(getServerSnapshot).toBeInstanceOf(Function);
    expect(getServerSnapshot!()).toEqual({ unreachable: null, failedAt: 0 });
    expect(getServerSnapshot!()).toBe(getSnapshot());
    spy.mockRestore();
  });

  it("Try again that gets an error answer counts as connected", async () => {
    mockTest.mockRejectedValue(answeredError(500));
    render(<BackendUnreachableNotice />);
    fail();

    await act(async () => {
      fireEvent.press(screen.getByRole("button", { name: "Try again" }));
    });

    expect(screen.getByText("Connected again")).toBeTruthy();
  });
});
