import React from "react";
import { fireEvent, render, screen } from "@testing-library/react-native";
import PlanExercisePicker from "@/components/PlanExercisePicker";
import { fetchPlanCatalog } from "@/services/cachedResources";
import { exerciseAPI, Exercise } from "@/services/exerciseAPI";

jest.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { username: "sam" } }) }));
jest.mock("@expo/vector-icons", () => ({ MaterialCommunityIcons: () => null }));
jest.mock("@/services/exerciseAPI", () => ({ exerciseAPI: { list: jest.fn() } }));
jest.mock("@/hooks/useCachedResource", () => ({ useCachedResource: () => ({
  data: mockCatalog, loading: false, error: null, refresh: jest.fn(),
}) }));
jest.mock("@react-native-async-storage/async-storage", () =>
  jest.requireActual("@react-native-async-storage/async-storage/jest/async-storage-mock"));
const mockCatalog = [
  { id: 1, name: "Bench Press", muscleGroup: "Chest", equipmentType: "BARBELL", instructions: "Press with control." },
  { id: 2, name: "Chest Fly", muscleGroup: "Chest", equipmentType: "CABLE" },
  { id: 3, name: "Cable Row", muscleGroup: "Back", equipmentType: "CABLE" },
] as Exercise[];

it("combines search and both filters, retaining selections when results change", () => {
  const onAdd = jest.fn();
  render(<PlanExercisePicker existingIds={[1]} dayName="Monday" onAdd={onAdd} onClose={jest.fn()} />);
  fireEvent.press(screen.getByText("Equipment ▾"));
  fireEvent.press(screen.getByText("Cable"));
  fireEvent.press(screen.getByText("Muscle focus ▾"));
  fireEvent.press(screen.getByText("Chest"));
  expect(screen.queryByText("Cable Row")).toBeNull();
  expect(screen.queryByText("Bench Press")).toBeNull();
  fireEvent.press(screen.getByLabelText("Chest Fly"));
  fireEvent.changeText(screen.getByLabelText("Search exercises"), "missing");
  expect(screen.getByText(/No exercises match/)).toBeTruthy();
  fireEvent.press(screen.getByText("Add to day"));
  expect(onAdd).toHaveBeenCalledWith([mockCatalog[1]]);
});

it("keeps existing exercises selected and cancels without applying new choices", () => {
  const onClose = jest.fn();
  const onAdd = jest.fn();
  render(<PlanExercisePicker existingIds={[1]} dayName="Monday" onAdd={onAdd} onClose={onClose} />);
  expect(screen.getByLabelText("Bench Press").props.accessibilityState).toEqual({ checked: true, disabled: true });
  fireEvent.press(screen.getByLabelText("Chest Fly"));
  fireEvent.press(screen.getByLabelText("Close exercise library"));
  expect(onClose).toHaveBeenCalled();
  expect(onAdd).not.toHaveBeenCalled();
});

it("opens a separate filter panel, preserves the choice on dismissal, and allows clearing it", () => {
  const onClose = jest.fn();
  render(<PlanExercisePicker existingIds={[]} dayName="Monday" onAdd={jest.fn()} onClose={onClose} />);
  fireEvent.press(screen.getByText("Equipment ▾"));
  expect(screen.getByText("Choose equipment")).toBeTruthy();
  fireEvent.press(screen.getByText("Cable"));
  expect(screen.queryByText("Choose equipment")).toBeNull();
  expect(screen.queryByLabelText("Bench Press")).toBeNull();

  fireEvent.press(screen.getByText("Cable ▾"));
  expect(screen.getByRole("radio", { name: "Cable" }).props.accessibilityState.selected).toBe(true);
  fireEvent.press(screen.getByLabelText("Close filter options"));
  expect(screen.getByText("Cable ▾")).toBeTruthy();
  expect(onClose).not.toHaveBeenCalled();

  fireEvent.press(screen.getByText("Cable ▾"));
  fireEvent.press(screen.getByText("All equipment"));
  expect(screen.getByLabelText("Bench Press")).toBeTruthy();
  fireEvent.press(screen.getByText("Muscle focus ▾"));
  expect(screen.getByText("Choose muscle focus")).toBeTruthy();
  // The backdrop remains tappable but is outside the screen-reader modal.
  fireEvent.press(screen.getByLabelText("Dismiss filter options", { includeHiddenElements: true }));
  expect(screen.queryByText("Choose muscle focus")).toBeNull();
  expect(onClose).not.toHaveBeenCalled();
});

it("loads beyond the first catalog page", async () => {
  jest.mocked(exerciseAPI.list).mockResolvedValueOnce({ content: [mockCatalog[0]], totalPages: 2, totalElements: 2 })
    .mockResolvedValueOnce({ content: [mockCatalog[2]], totalPages: 2, totalElements: 2 });
  expect(await fetchPlanCatalog()).toEqual([mockCatalog[0], mockCatalog[2]]);
  expect(exerciseAPI.list).toHaveBeenLastCalledWith({ page: 1, size: 200 });
});
