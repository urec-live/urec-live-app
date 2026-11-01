import React from "react";
import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";
import StandaloneExerciseTracker, {
  fieldsForMode,
} from "@/components/StandaloneExerciseTracker";
const mockFinish = jest.fn();
const mockUpdate = jest.fn();
const mockMachineCheckout = jest.fn();
let mockMachineCode: string | undefined;
jest.mock("@/services/machineAPI", () => ({ machineAPI: { checkOut: (...args: unknown[]) => mockMachineCheckout(...args) } }));
jest.mock("@/contexts/HelpRequestContext", () => ({ useHelpRequest: () => ({ activeRequest: null, callStaff: jest.fn() }) }));
jest.mock("expo-router", () => ({ Link: jest.requireActual("react-native").Text, useRouter: () => ({ push: jest.fn() }) }));
let mockMode = "DURATION";
jest.mock("@/contexts/WorkoutContext", () => ({
  useWorkout: () => ({
    currentSession: {
      exerciseName: "Test exercise",
      startTime: Date.now(),
      loggingMode: mockMode,
      machineCode: mockMachineCode,
    },
    checkOut: mockFinish,
    updateSets: mockUpdate,
    startRest: jest.fn(),
    endRest: jest.fn(),
    restStartTime: null,
  }),
}));
describe("Standalone exercise logging", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockMode = "DURATION";
    mockMachineCode = undefined;
    mockMachineCheckout.mockResolvedValue(undefined);
    mockFinish.mockResolvedValue(undefined);
  });
  it("uses only the metrics relevant to each exercise", () => {
    expect(fieldsForMode("REPS").map((f) => f.key)).toEqual(["reps"]);
    expect(fieldsForMode("DURATION").map((f) => f.key)).toEqual([
      "durationSeconds",
    ]);
    expect(fieldsForMode("DISTANCE_DURATION").map((f) => f.key)).toEqual([
      "distanceMeters",
      "durationSeconds",
    ]);
    expect(fieldsForMode("WEIGHT_REPS").map((f) => f.key)).toEqual([
      "reps",
      "weightLbs",
    ]);
  });
  it("saves a timed set without machine controls", async () => {
    render(<StandaloneExerciseTracker />);
    fireEvent.changeText(screen.getByLabelText("Set 1 Seconds"), "45");
    fireEvent.press(screen.getByText("Finish exercise"));
    await waitFor(() =>
      expect(mockFinish).toHaveBeenCalledWith({
        setDetails: [{ durationSeconds: 45 }],
      }),
    );
    expect(screen.queryByText("Call staff")).toBeNull();
    expect(screen.queryByText("Report")).toBeNull();
  });
  it("requires complete distance/time values and rejects negative numbers", async () => {
    mockMode = "DISTANCE_DURATION";
    render(<StandaloneExerciseTracker />);
    fireEvent.changeText(screen.getByLabelText("Set 1 Meters"), "1000");
    fireEvent.press(screen.getByText("Finish exercise"));
    expect(mockFinish).not.toHaveBeenCalled();
    expect(
      screen.getByText("Complete each set, or remove empty sets."),
    ).toBeTruthy();
    fireEvent.changeText(screen.getByLabelText("Set 1 Seconds"), "-3");
    fireEvent.press(screen.getByText("Finish exercise"));
    expect(mockFinish).not.toHaveBeenCalled();
    fireEvent.changeText(screen.getByLabelText("Set 1 Seconds"), "300");
    fireEvent.press(screen.getByText("Finish exercise"));
    await waitFor(() =>
      expect(mockFinish).toHaveBeenCalledWith({
        setDetails: [{ distanceMeters: 1000, durationSeconds: 300 }],
      }),
    );
  });
  it("uses time fields and machine controls when an exercise is associated with equipment", async () => {
    mockMachineCode = 'TREADMILL01';
    render(<StandaloneExerciseTracker />);
    expect(screen.getByText('Call staff')).toBeTruthy();
    expect(screen.getByText('Report machine')).toBeTruthy();
    fireEvent.changeText(screen.getByLabelText('Set 1 Seconds'), '120');
    fireEvent.press(screen.getByText('Finish exercise'));
    await waitFor(() => expect(mockMachineCheckout).toHaveBeenCalledWith('TREADMILL01'));
    await waitFor(() => expect(mockFinish).toHaveBeenCalledWith({ setDetails: [{ durationSeconds: 120 }] }));
  });
  it("keeps the form open when device persistence fails", async () => {
    mockFinish.mockRejectedValue(new Error("storage"));
    render(<StandaloneExerciseTracker />);
    fireEvent.changeText(screen.getByLabelText("Set 1 Seconds"), "45");
    fireEvent.press(screen.getByText("Finish exercise"));
    expect(
      await screen.findByText(
        "Could not save on this device. Keep this workout open and retry.",
      ),
    ).toBeTruthy();
  });
});
