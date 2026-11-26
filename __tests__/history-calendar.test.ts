import { addDays, calendarDate, dateKey, monthWeeks, summarizeWeek, weekHistory, weekStart } from "@/utils/historyCalendar";
import type { DailyWorkout } from "@/contexts/WorkoutContext";

it("builds full Sunday-first weeks across month and year boundaries", () => {
  const weeks = monthWeeks("2026-12-01");
  expect(weeks[0]).toEqual(["2026-11-29", "2026-11-30", "2026-12-01", "2026-12-02", "2026-12-03", "2026-12-04", "2026-12-05"]);
  expect(weeks.at(-1)?.at(-1)).toBe("2027-01-02");
  expect(monthWeeks("2026-08-01")).toHaveLength(6);
  expect(weekStart("2027-01-01")).toBe("2026-12-27");
});

it("preserves local date keys over DST and leap days", () => {
  expect(dateKey(calendarDate("2026-11-01"))).toBe("2026-11-01");
  expect(addDays("2026-03-07", 2)).toBe("2026-03-09");
  expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
});

it("includes a whole cross-month week, counts days separately from exercises, and excludes unfinished duration", () => {
  const history: DailyWorkout[] = [
    { date: "2026-11-01", muscleGroups: ["Chest"], sessions: [
      { exerciseName: "Bench Press", muscleGroup: "Chest", startTime: 0, endTime: 60_000, setDetails: [{ reps: 8 }, { reps: 8 }] },
      { exerciseName: "Chest Fly", muscleGroup: "Chest", startTime: 0, endTime: 120_000 },
    ] },
    { date: "2026-11-07", muscleGroups: ["Back"], sessions: [{ exerciseName: "Row", muscleGroup: "Back", startTime: 0 }] },
    { date: "2026-11-08", muscleGroups: [], sessions: [] },
  ];
  const selected = weekHistory(history, "2026-11-01");
  expect(selected.map(day => day.date)).toEqual(["2026-11-07", "2026-11-01"]);
  expect(summarizeWeek(selected)).toEqual({ days: 2, exercises: 3, sets: 2, seconds: 180, muscleGroups: ["Back", "Chest"], estimatedKcal: 13 });
  expect(summarizeWeek([])).toEqual({ days: 0, exercises: 0, sets: 0, seconds: 0, muscleGroups: [], estimatedKcal: 0 });
});

it("counts unique named muscle groups across repeat exercises and excludes unknown groups", () => {
  const sessions = ["Chest", "chest", "Back, Biceps", "General", "Unknown", ""].map(muscleGroup => ({
    exerciseName: "Exercise", muscleGroup, startTime: 0, endTime: 600_000,
  }));
  const summary = summarizeWeek([{ date: "2026-11-09", muscleGroups: [], sessions }]);
  expect(summary.muscleGroups.map(group => group.toLowerCase())).toEqual(["back", "biceps", "chest"]);
  expect(summary.estimatedKcal).toBe(257);
});
