import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import PlanEditor from "@/app/settings/plan";

const mockBack = jest.fn();
const mockCreate = jest.fn();
const mockUpdate = jest.fn();
const mockRefresh = jest.fn().mockResolvedValue(undefined);
let mockActivePlan: unknown = null;
jest.mock("expo-router", () => ({ useRouter: () => ({ back: mockBack }) }));
jest.mock("@expo/vector-icons", () => ({ MaterialCommunityIcons: () => null }));
jest.mock("expo-linear-gradient", () => ({ LinearGradient: ({ children }: { children: React.ReactNode }) => children }));
jest.mock("@/contexts/PlanContext", () => ({ usePlan: () => ({
  activePlan: mockActivePlan, loading: false, refreshActivePlan: mockRefresh, refreshTodayPlan: mockRefresh,
}) }));
jest.mock("@/services/planAPI", () => ({ planAPI: {
  createPlan: (...args: unknown[]) => mockCreate(...args),
  updatePlan: (...args: unknown[]) => mockUpdate(...args),
} }));
jest.mock("@/components/PlanExercisePicker", () => {
  const { Pressable, Text } = require("react-native");
  return { __esModule: true, default: ({ onAdd }: { onAdd: (items: unknown[]) => void }) =>
    <Pressable onPress={() => onAdd([
      { id: 12, name: "Bench Press", muscleGroup: "Chest", equipmentType: "BARBELL" },
      { id: 13, name: "Chest Fly", muscleGroup: "Chest", equipmentType: "CABLE" },
    ])}><Text>Select exercises</Text></Pressable> };
});

beforeEach(() => { jest.clearAllMocks(); mockActivePlan = null; mockCreate.mockResolvedValue({}); });

it("saves specific exercises from the picker with their day and order", async () => {
  render(<PlanEditor />);
  fireEvent.press(screen.getByText("Monday"));
  fireEvent.press(screen.getByText("+ Add Exercises"));
  fireEvent.press(screen.getByText("Select exercises"));
  fireEvent.press(screen.getByLabelText("Move Chest Fly up"));
  fireEvent.press(screen.getByText("Save Plan"));
  await waitFor(() => expect(mockCreate).toHaveBeenCalledWith({
    name: "My Plan", days: [{ dayOfWeek: 1, label: undefined, items: [
      { exerciseId: 13, muscleGroup: "Chest", targetCount: 1, sortOrder: 0 },
      { exerciseId: 12, muscleGroup: "Chest", targetCount: 1, sortOrder: 1 },
    ] }],
  }));
  await waitFor(() => expect(mockBack).toHaveBeenCalled());
});

it("reloads a mixed existing plan and preserves its legacy goal", async () => {
  mockActivePlan = { id: 7, name: "Existing plan", visibility: "PRIVATE", days: [
    { dayOfWeek: 1, label: "Push", items: [
      { exerciseId: 12, exerciseName: "Bench Press", muscleGroup: "Chest", targetCount: 1 },
      { muscleGroup: "Back", targetCount: 2 },
    ] },
  ] };
  render(<PlanEditor />);
  fireEvent.press(screen.getByText("Monday"));
  expect(screen.getByText("Bench Press")).toBeTruthy();
  expect(screen.getByText("Muscle goal · 2 exercises")).toBeTruthy();
  fireEvent.press(screen.getByText("Update Plan"));
  await waitFor(() => expect(mockUpdate).toHaveBeenCalledWith(7, expect.objectContaining({ name: "Existing plan" })));
});

it("keeps the draft visible when saving fails", async () => {
  mockCreate.mockRejectedValueOnce(new Error("offline"));
  render(<PlanEditor />);
  fireEvent.press(screen.getByText("Monday"));
  fireEvent.press(screen.getByText("+ Add Exercises"));
  fireEvent.press(screen.getByText("Select exercises"));
  fireEvent.press(screen.getByText("Save Plan"));
  await screen.findByText(/Your changes are still here/);
  expect(screen.getByText("Bench Press")).toBeTruthy();
  expect(mockBack).not.toHaveBeenCalled();
});
