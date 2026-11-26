import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import WeightProgressCard from "@/components/WeightProgressCard";
import { readMeasurements, saveMeasurements } from "@/services/bodyMeasurements";
import { clearCache, writeCached } from "@/services/resourceCache";

jest.mock("@react-native-async-storage/async-storage", () => jest.requireActual("@react-native-async-storage/async-storage/jest/async-storage-mock"));
const at = (date: string) => new Date(`${date}T12:00:00`);
beforeEach(async () => { await clearCache(); await AsyncStorage.clear(); jest.clearAllMocks(); });

it("migrates an undated weight without inventing history, and corrects a same-day entry", async () => {
  await AsyncStorage.setItem("body-measurements:sam", JSON.stringify({ weightKg: 85, heightCm: 180 }));
  expect((await readMeasurements("sam")).weightHistory).toEqual([]);
  await saveMeasurements("sam", { weightKg: 84, heightCm: 180 }, at("2026-11-01"));
  await saveMeasurements("sam", { weightKg: 83.5, heightCm: 180 }, at("2026-11-01"));
  await saveMeasurements("sam", { weightKg: 82, heightCm: 180 }, at("2026-11-09"));
  expect((await readMeasurements("sam")).weightHistory).toEqual([{ date: "2026-11-01", weightKg: 83.5 }, { date: "2026-11-09", weightKg: 82 }]);
  expect((await readMeasurements("alex")).weightHistory).toEqual([]);
  await saveMeasurements("sam", { weightKg: null, heightCm: 180 });
  expect((await readMeasurements("sam")).weightHistory).toHaveLength(2);
});

it("serializes saves and preserves existing history if a write fails", async () => {
  await Promise.all([
    saveMeasurements("sam", { weightKg: 80, heightCm: null }, at("2026-11-01")),
    saveMeasurements("sam", { weightKg: 81, heightCm: null }, at("2026-11-02")),
  ]);
  (AsyncStorage.setItem as jest.Mock).mockRejectedValueOnce(new Error("disk"));
  await expect(saveMeasurements("sam", { weightKg: 82, heightCm: null }, at("2026-11-03"))).rejects.toThrow("disk");
  expect((await readMeasurements("sam")).weightHistory).toHaveLength(2);
  await saveMeasurements("sam", { weightKg: 82, heightCm: null }, at("2026-11-03"));
  await clearCache();
  expect((await readMeasurements("sam")).weightHistory).toHaveLength(3);
});

it("shows an honest empty state, then the first dated weigh-in without a fabricated trend", async () => {
  render(<WeightProgressCard username="sam" />);
  await screen.findByText("Start your weight timeline");
  await act(async () => saveMeasurements("sam", { weightKg: 80, heightCm: null }));
  expect(screen.getByText("Add another weigh-in")).toBeTruthy();
  expect(screen.getByText("1 weigh-in")).toBeTruthy();
});

it("shows loss and gain, switches units, filters periods and exposes dated values", async () => {
  await saveMeasurements("sam", { weightKg: 85, heightCm: null }, at("2025-01-01"));
  await saveMeasurements("sam", { weightKg: 80, heightCm: null });
  const view = render(<WeightProgressCard username="sam" />);
  await screen.findByText("Lost in this period");
  expect(screen.getByText("5 kg")).toBeTruthy();
  fireEvent.press(screen.getByLabelText("Show weight progress in pounds"));
  expect(screen.getByText("11 lb")).toBeTruthy();
  fireEvent.press(screen.getByText("View weigh-ins"));
  expect(screen.getByRole("button", { name: "2025-01-01, 187.4 lb" })).toBeTruthy();
  fireEvent.press(screen.getByText("Month"));
  expect(screen.getByText("Add another weigh-in")).toBeTruthy();
  view.unmount();
  await saveMeasurements("sam", { weightKg: 90, heightCm: null });
  render(<WeightProgressCard username="sam" />);
  expect(await screen.findByText("Gained in this period")).toBeTruthy();
  expect(screen.getByText("5 kg")).toBeTruthy();
});

it("handles a flat trend and a period with no entries", async () => {
  await saveMeasurements("sam", { weightKg: 80, heightCm: null }, at("2025-01-01"));
  await saveMeasurements("sam", { weightKg: 80, heightCm: null }, at("2025-01-02"));
  render(<WeightProgressCard username="sam" />);
  await screen.findByText("No change");
  fireEvent.press(screen.getByText("Month"));
  expect(screen.getByText("No weigh-ins in this period")).toBeTruthy();
});

it("opens safely with the previous measurement cache format", async () => {
  await AsyncStorage.setItem("body-measurements:sam", JSON.stringify({ weightKg: 85, heightCm: 180 }));
  writeCached("user:sam:body-measurements", { weightKg: 85, heightCm: 180 });
  render(<WeightProgressCard username="sam" />);
  expect(await screen.findByText("Start your weight timeline")).toBeTruthy();
});
