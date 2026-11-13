import { chartPoints, estimatedOneRm, exerciseSessions, metricsFor, personalRecords, setRecords } from "@/utils/exerciseInsights";
import { SessionResponse } from "@/services/sessionAPI";

const session = (id: number, date: string, weight: number, reps: number): SessionResponse => ({
  id, exerciseId: 9, exerciseName: "Bench Press", machineName: null, machineCode: null,
  muscleGroup: "Chest", startedAt: date, endedAt: date, durationSeconds: 60,
  setDetails: [{ setNumber: 1, weightLbs: weight, reps }],
});
it("separates exercises by ID, matching names only for legacy sessions", () => {
  const exact = session(1, "2026-10-01T12:00:00Z", 100, 10);
  const different = { ...exact, id: 2, exerciseId: 10 };
  const legacy = { ...exact, id: 3, exerciseId: null };
  const unfinished = { ...exact, id: 4, endedAt: null };
  expect(exerciseSessions([exact, different, legacy, unfinished], { id: 9, name: "Bench Press" }).map(s => s.id)).toEqual([1, 3]);
});
it("calculates load, Epley estimate, set volume and total session volume without mixing reps", () => {
  const first = session(1, "2026-10-01T12:00:00Z", 100, 10);
  first.setDetails!.push({ setNumber: 2, weightLbs: 120, reps: 5 });
  const records = Object.fromEntries(personalRecords([first], "WEIGHT_REPS").map(r => [r.metric, r.value]));
  expect(records.weight).toBe(120);
  expect(records.oneRm).toBe(140);
  expect(records.setVolume).toBe(1000);
  expect(records.sessionVolume).toBe(1600);
  expect(setRecords([first])).toEqual([{ reps: 5, weight: 120 }, { reps: 10, weight: 100 }]);
});
it("does not turn missing values into zero records or extrapolate high-rep 1RM", () => {
  expect(estimatedOneRm({ setNumber: 1, weightLbs: 100, reps: 1 })).toBe(100);
  expect(estimatedOneRm({ setNumber: 1, weightLbs: 100, reps: 20 })).toBeNull();
  const empty = session(1, "2026-10-01T12:00:00Z", 0, 0);
  empty.setDetails = [];
  expect(personalRecords([empty], "WEIGHT_REPS").every(record => record.value === null)).toBe(true);
  expect(metricsFor("DISTANCE_DURATION")).toEqual(["distance", "duration"]);
  expect(metricsFor("REPS")).toEqual(["reps"]);
});
it("uses daily best chart points in chronological order and applies the date range", () => {
  const history = [
    session(4, "2026-11-01T14:00:00Z", 120, 5),
    session(3, "2026-11-01T12:00:00Z", 110, 5),
    session(2, "2026-10-01T12:00:00Z", 100, 5),
    session(1, "2026-01-01T12:00:00Z", 90, 5),
  ];
  expect(chartPoints(history, "weight", 3, new Date("2026-11-09T12:00:00Z")).map(p => p.value)).toEqual([100, 120]);
  expect(chartPoints(history, "weight", null).map(p => p.value)).toEqual([90, 100, 120]);
});
