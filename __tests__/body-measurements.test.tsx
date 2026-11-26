import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import BodyMeasurementsCard from "@/components/BodyMeasurementsCard";
import { readMeasurements, saveMeasurements } from "@/services/bodyMeasurements";
import { clearCache } from "@/services/resourceCache";
import { summarizeWeek } from "@/utils/historyCalendar";

jest.mock("@react-native-async-storage/async-storage", () => jest.requireActual("@react-native-async-storage/async-storage/jest/async-storage-mock"));

beforeEach(async () => { await clearCache(); await AsyncStorage.clear(); jest.clearAllMocks(); });

it("saves optional measurements, restores them after remount, and keeps accounts separate", async () => {
  const view = render(<BodyMeasurementsCard username="sam" />);
  const weight = await screen.findByLabelText("Weight (kg)");
  fireEvent.changeText(weight, "80");
  fireEvent.changeText(screen.getByLabelText("Height (cm)"), "180");
  fireEvent.press(screen.getByText("Save measurements"));
  await screen.findByText("Measurements saved.");
  expect(await readMeasurements("sam")).toMatchObject({ weightKg: 80, heightCm: 180 });
  expect(await readMeasurements("alex")).toMatchObject({ weightKg: null, heightCm: null });
  view.unmount();
  await clearCache();
  render(<BodyMeasurementsCard username="sam" />);
  expect((await screen.findByLabelText("Weight (kg)")).props.value).toBe("80");
  expect(screen.getByLabelText("Height (cm)").props.value).toBe("180");
});

it("converts imperial inputs and uses the saved weight in calorie calculations", async () => {
  render(<BodyMeasurementsCard username="sam" />);
  await screen.findByLabelText("Weight (kg)");
  fireEvent.press(screen.getByText("Use lb"));
  fireEvent.press(screen.getByText("Use in"));
  fireEvent.changeText(screen.getByLabelText("Weight (lb)"), "176.37");
  fireEvent.changeText(screen.getByLabelText("Height (in)"), "70");
  fireEvent.press(screen.getByText("Save measurements"));
  await screen.findByText("Measurements saved.");
  const data = await readMeasurements("sam");
  expect(data.weightKg).toBeCloseTo(80, 1);
  expect(data.heightCm).toBeCloseTo(177.8);
  const history = [{ date: "2026-11-09", muscleGroups: ["Chest"], sessions: [{ exerciseName: "Bench", muscleGroup: "Chest", startTime: 0, endTime: 600_000 }] }];
  expect(summarizeWeek(history, data.weightKg!).estimatedKcal).toBe(49);
  expect(summarizeWeek(history).estimatedKcal).toBe(43);
});

it("rejects invalid entries, preserves drafts on failed saves, retries and clears values", async () => {
  render(<BodyMeasurementsCard username="sam" />);
  const input = await screen.findByLabelText("Weight (kg)");
  fireEvent.changeText(input, "-2");
  fireEvent.press(screen.getByText("Save measurements"));
  await screen.findByText(/Enter a weight between/);
  fireEvent.changeText(input, "85");
  (AsyncStorage.setItem as jest.Mock).mockRejectedValueOnce(new Error("disk"));
  fireEvent.press(screen.getByText("Save measurements"));
  await screen.findByText(/Couldn’t save your measurements/);
  expect(screen.getByLabelText("Weight (kg)").props.value).toBe("85");
  fireEvent.press(screen.getByText("Save measurements"));
  await screen.findByText("Measurements saved.");
  fireEvent.changeText(input, "");
  fireEvent.press(screen.getByText("Save measurements"));
  await waitFor(async () => expect(await readMeasurements("sam")).toMatchObject({ weightKg: null, heightCm: null }));
});

it("doesn't publish a failed save into the shared calorie data", async () => {
  (AsyncStorage.setItem as jest.Mock).mockRejectedValueOnce(new Error("disk"));
  await expect(saveMeasurements("sam", { weightKg: 80, heightCm: 180 })).rejects.toThrow("disk");
  expect(await readMeasurements("sam")).toMatchObject({ weightKg: null, heightCm: null });
});
