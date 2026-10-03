import { act, fireEvent, render, screen } from "@testing-library/react-native";
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

const mockRouter = { push: jest.fn(), replace: jest.fn() };
jest.mock("expo-router", () => ({ useRouter: () => mockRouter }));

jest.mock("@/contexts/WorkoutContext", () => ({ useWorkout: () => ({ checkIn: jest.fn() }) }));
jest.mock("@/services/machineAPI", () => ({ machineAPI: { checkIn: jest.fn() } }));

function scan(data: string) {
  act(() => mockOnScan?.({ data, type: "qr" }));
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

  it("doesn't offer reporting when the QR code isn't a machine", () => {
    render(<ScanScreen />);
    scan("definitely not a machine code");

    expect(screen.queryByText("Report a Problem")).toBeNull();
  });
});
