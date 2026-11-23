import { getWeeklyWorkoutGoal } from "../utils/weeklyWorkoutGoal";

const november = (day: number, hour = 12) => new Date(2026, 10, day, hour);

it("counts completed workout days once and resets on local Monday", () => {
  const completions = [
    november(22, 23).toISOString(),
    november(23, 8).toISOString(),
    november(23, 10).getTime(),
    november(24).getTime(),
  ];
  expect(getWeeklyWorkoutGoal(completions, {}, november(23))).toEqual({
    target: 2,
    days: 1,
    milestoneWeeks: 0,
  });
});

it("credits nonconsecutive past weeks using the target in effect that week", () => {
  const completions = [2, 3, 9, 10, 16, 17, 18, 23, 24, 25, 30].map(
    (day) => november(day).getTime(),
  );
  expect(
    getWeeklyWorkoutGoal(completions, { "2026-11-09": 3, "2026-11-30": 1 }, november(30)),
  ).toEqual({ target: 1, days: 1, milestoneWeeks: 3 });
});
