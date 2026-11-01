import React from "react";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";
import GymSettings from "@/app/settings/gym";
const mockChange = jest.fn();
let mockSession: object | null = null;
let mockHelp: object | null = null;
let mockGym: object | null = null;
jest.mock("@/contexts/GymContext", () => ({
  useGym: () => ({ gym: mockGym, loading: false, changeGym: mockChange }),
}));
jest.mock("@/contexts/WorkoutContext", () => ({
  useWorkout: () => ({ currentSession: mockSession }),
}));
jest.mock("@/contexts/HelpRequestContext", () => ({
  useHelpRequest: () => ({ activeRequest: mockHelp }),
}));
jest.mock("@/services/gymAPI", () => ({
  gymAPI: { list: () => Promise.resolve([{ id: 1, name: "UREC" }]) },
}));
jest.mock("expo-router", () => ({ Link: ({ children }: any) => children }));
describe("Optional gym Settings", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSession = null;
    mockHelp = null;
    mockGym = null;
    mockChange.mockResolvedValue(undefined);
  });
  it("requires explicit confirmation before connecting", async () => {
    render(<GymSettings />);
    fireEvent.press(await screen.findByText("UREC"));
    expect(mockChange).not.toHaveBeenCalled();
    fireEvent.press(screen.getByText("Confirm change"));
    await waitFor(() => expect(mockChange).toHaveBeenCalledWith(1));
  });
  it.each(["workout", "help"])(
    "blocks changing gyms during active %s",
    async (kind) => {
      if (kind === "workout") mockSession = {};
      else mockHelp = {};
      render(<GymSettings />);
      fireEvent.press(await screen.findByText("UREC"));
      expect(screen.queryByText("Confirm change")).toBeNull();
      expect(mockChange).not.toHaveBeenCalled();
    },
  );
  it("disconnects after confirmation and explains failed saves", async () => {
    mockGym = { id: 1, name: "UREC" };
    mockChange.mockRejectedValue(new Error("offline"));
    render(<GymSettings />);
    await act(async () => {});
    fireEvent.press(screen.getByText("Disconnect from gym"));
    fireEvent.press(screen.getByText("Confirm change"));
    await waitFor(() => expect(mockChange).toHaveBeenCalledWith(null));
    expect(await screen.findByText(/Could not change your gym/)).toBeTruthy();
  });
});
