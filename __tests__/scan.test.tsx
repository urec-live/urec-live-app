import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { AxiosError, AxiosHeaders } from "axios";
import React from "react";

import ScanScreen from "@/app/scan";

type ScanHandler = (result: { data: string; type: string }) => void;
let mockOnScan: ScanHandler | undefined;

jest.mock("expo-camera", () => ({
  CameraView: (props: { onBarcodeScanned?: ScanHandler }) => {
    mockOnScan = props.onBarcodeScanned;
    return null;
  },
  useCameraPermissions: () => [{ granted: true }, jest.fn()],
}));

jest.mock("expo-linear-gradient", () => ({
  LinearGradient: ({ children }: { children?: unknown }) => children,
}));

const mockRouter = { push: jest.fn(), replace: jest.fn(), dismissTo: jest.fn() };
jest.mock("expo-router", () => ({ useRouter: () => mockRouter }));

jest.mock("@/contexts/WorkoutContext", () => ({ useWorkout: () => ({ checkIn: jest.fn() }) }));

const mockCheckIn = jest.fn();
const mockGetByCode = jest.fn();
jest.mock("@/services/machineAPI", () => ({
  machineAPI: {
    checkIn: (...args: unknown[]) => mockCheckIn(...args),
    getMachineByCode: (...args: unknown[]) => mockGetByCode(...args),
  },
}));

function scan(data: string) {
  act(() => mockOnScan?.({ data, type: "qr" }));
}

// Spring's default error body: an object, not a message string
function httpError(status: number): AxiosError {
  return new AxiosError("Request failed", "ERR_BAD_RESPONSE", undefined, undefined, {
    status,
    statusText: "",
    headers: {},
    config: { headers: new AxiosHeaders() },
    data: { status, error: "Error", path: "/api/machines/code/LP01/status" },
  });
}

describe("Scan screen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockOnScan = undefined;
  });

  it("lets a member report a scanned machine without checking in", () => {
    render(<ScanScreen />);
    scan(JSON.stringify({ machineId: "LP01", exercise: "Leg Press" }));

    fireEvent.press(screen.getByText("Report a Problem"));

    expect(mockRouter.push).toHaveBeenCalledWith({ pathname: "/report-issue", params: { code: "LP01" } });
  });

  it("resolves the QR code to a stable equipment id and opens its map without checking in", async () => {
    mockGetByCode.mockResolvedValue({ id: 42, code: "LP01" });
    render(<ScanScreen />);
    scan(JSON.stringify({ machineId: "LP01" }));
    fireEvent.press(screen.getByText("Show on gym map"));
    await act(async () => {});
    expect(mockGetByCode).toHaveBeenCalledWith("LP01");
    expect(mockRouter.dismissTo).toHaveBeenCalledWith({
      pathname: "/equipment", params: { equipmentId: "42", scanKey: expect.any(String) },
    });
    expect(mockCheckIn).not.toHaveBeenCalled();
  });

  it("preserves the scan after a failed lookup and lets the member retry", async () => {
    mockGetByCode.mockRejectedValueOnce(httpError(404)).mockResolvedValueOnce({ id: 42 });
    render(<ScanScreen />);
    scan(JSON.stringify({ machineId: "LP01" }));
    fireEvent.press(screen.getByText("Show on gym map"));
    expect(await screen.findByText("Machine not found in your gym. Try another QR code.")).toBeTruthy();
    expect(mockRouter.dismissTo).not.toHaveBeenCalled();
    fireEvent.press(screen.getByText("Show on gym map"));
    await act(async () => {});
    expect(mockGetByCode).toHaveBeenCalledTimes(2);
    expect(mockRouter.dismissTo).toHaveBeenCalled();
  });

  it("ignores an old lookup after the member starts another scan", async () => {
    let finishLookup!: (value: { id: number }) => void;
    mockGetByCode.mockReturnValue(new Promise((resolve) => { finishLookup = resolve; }));
    render(<ScanScreen />);
    scan(JSON.stringify({ machineId: "LP01" }));
    fireEvent.press(screen.getByText("Show on gym map"));
    fireEvent.press(screen.getByText("Scan Again"));
    await act(async () => { finishLookup({ id: 42 }); });
    expect(mockRouter.dismissTo).not.toHaveBeenCalled();
  });

  it("doesn't offer reporting when the QR code isn't a machine", () => {
    render(<ScanScreen />);
    scan("definitely not a machine code");

    expect(screen.queryByText("Report a Problem")).toBeNull();
  });

  it("explains that a machine staff marked out of order can't be checked in to", async () => {
    mockCheckIn.mockRejectedValue(httpError(409));
    render(<ScanScreen />);
    scan(JSON.stringify({ machineId: "LP01" }));

    fireEvent.press(screen.getByText("Confirm Check-In"));

    expect(
      await screen.findByText(
        "This machine is out of order. Pick another machine, or report a problem if something else is wrong."
      )
    ).toBeTruthy();
    expect(mockCheckIn).toHaveBeenCalledWith("LP01");
  });

  it("never shows the raw error object", async () => {
    mockCheckIn.mockRejectedValue(httpError(500));
    render(<ScanScreen />);
    scan(JSON.stringify({ machineId: "LP01" }));

    fireEvent.press(screen.getByText("Confirm Check-In"));

    expect(await screen.findByText("Request failed")).toBeTruthy();
    expect(screen.queryByText("[object Object]")).toBeNull();
  });
});
