import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import PinnedExerciseNote from "@/components/exercise/PinnedExerciseNote";
import { clearCache } from "@/services/resourceCache";
import { exerciseAPI } from "@/services/exerciseAPI";

jest.mock("@expo/vector-icons", () => ({ MaterialCommunityIcons: () => null }));
jest.mock("expo-router", () => ({ useFocusEffect: jest.fn() }));
jest.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { username: "note-user" } }) }));
jest.mock("@/services/exerciseAPI", () => ({ exerciseAPI: { getNote: jest.fn(), saveNote: jest.fn() } }));
jest.mock("@react-native-async-storage/async-storage", () =>
  jest.requireActual("@react-native-async-storage/async-storage/jest/async-storage-mock"));

beforeEach(async () => {
  jest.clearAllMocks();
  await clearCache();
  jest.mocked(exerciseAPI.getNote).mockResolvedValue({ note: "" });
});
it("saves a private note and updates an active logging view immediately", async () => {
  jest.mocked(exerciseAPI.saveNote).mockResolvedValue({ note: "Seat 4" });
  render(<><PinnedExerciseNote exerciseId={7} /><PinnedExerciseNote exerciseId={7} compact /></>);
  fireEvent.press(await screen.findByText("Add note"));
  fireEvent.changeText(screen.getByLabelText("Pinned exercise note"), "Seat 4");
  fireEvent.press(screen.getByText("Save note"));
  await waitFor(() => expect(screen.getAllByText("Seat 4")).toHaveLength(2));
  expect(exerciseAPI.saveNote).toHaveBeenCalledWith(7, "Seat 4");
});
it("retains a note draft if saving fails", async () => {
  jest.mocked(exerciseAPI.saveNote).mockRejectedValue(new Error("offline"));
  render(<PinnedExerciseNote exerciseId={7} />);
  fireEvent.press(await screen.findByText("Add note"));
  fireEvent.changeText(screen.getByLabelText("Pinned exercise note"), "Elbows tucked");
  fireEvent.press(screen.getByText("Save note"));
  await screen.findByText(/Your draft is kept/);
  expect(screen.getByDisplayValue("Elbows tucked")).toBeTruthy();
});
