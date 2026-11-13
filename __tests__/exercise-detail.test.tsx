import React from "react";
import { fireEvent, render, screen } from "@testing-library/react-native";
import ExerciseDetail from "@/app/exercise/[id]";

const mockCheckIn = jest.fn();
const mockHistory = [
  { id: 1, exerciseId: 7, exerciseName: "Bench Press", startedAt: "2026-11-09T12:00:00Z", endedAt: "2026-11-09T12:02:00Z", durationSeconds: 120, machineName: null, setDetails: [{ setNumber: 1, weightLbs: 100, reps: 10 }] },
  { id: 2, exerciseId: 8, exerciseName: "Other exercise", startedAt: "2026-11-09T12:00:00Z", endedAt: "2026-11-09T12:02:00Z", durationSeconds: 120, setDetails: [{ setNumber: 1, weightLbs: 500, reps: 10 }] },
];
jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ id: "7" }), useRouter: () => ({ canGoBack: () => true, back: jest.fn() }),
  useFocusEffect: jest.fn(), Link: jest.requireActual("react-native").Text,
}));
jest.mock("@expo/vector-icons", () => ({ MaterialCommunityIcons: () => null }));
jest.mock("@/contexts/WorkoutContext", () => ({ useWorkout: () => ({ currentSession: null, checkIn: mockCheckIn }) }));
jest.mock("@/contexts/GymContext", () => ({ useGym: () => ({ gym: null }) }));
jest.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { username: "sam" } }) }));
jest.mock("@/hooks/useCachedResource", () => ({ useCachedResource: (key: string) => ({
  data: key.includes("exercise-history") ? mockHistory : { id: 7, name: "Bench Press", muscleGroup: "Chest", equipmentType: "BARBELL", trainingType: "STRENGTH", loggingMode: "WEIGHT_REPS", instructions: "Set your feet. Press with control.", secondaryMuscles: ["Triceps"] },
  loading: false, error: null, revalidate: jest.fn(),
}) }));
jest.mock("@/components/exercise/ExerciseProgressChart", () => () => null);
jest.mock("@/components/exercise/PinnedExerciseNote", () => () => {
  const { Text } = require("react-native"); return <Text>Pinned note editor</Text>;
});
jest.mock("@react-native-async-storage/async-storage", () =>
  jest.requireActual("@react-native-async-storage/async-storage/jest/async-storage-mock"));

it("shows records from this exercise and retains exercise start behavior", () => {
  render(<ExerciseDetail />);
  expect(screen.getByText("100 lbs")).toBeTruthy();
  expect(screen.queryByText("500 lbs")).toBeNull();
  fireEvent.press(screen.getByText("Set records"));
  expect(screen.getByText("10 reps")).toBeTruthy();
  fireEvent.press(screen.getByText("Start exercise"));
  expect(mockCheckIn).toHaveBeenCalledWith("Bench Press", undefined, "Chest", 7, "WEIGHT_REPS");
});
it("opens a timeline entry and the movement guide while keeping notes visible", () => {
  render(<ExerciseDetail />);
  expect(screen.queryByRole("tablist")).toBeNull();
  fireEvent.press(screen.getByRole("button", { name: /Workout details/ }));
  expect(screen.getByText("100 lbs × 10")).toBeTruthy();
  expect(screen.queryByText("Other exercise")).toBeNull();
  fireEvent.press(screen.getByRole("button", { name: "Movement guide" }));
  expect(screen.getByText("Set your feet")).toBeTruthy();
  expect(screen.getByText("Press with control.")).toBeTruthy();
  expect(screen.getByText("Pinned note editor")).toBeTruthy();
});
