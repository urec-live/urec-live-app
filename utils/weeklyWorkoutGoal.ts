export const DEFAULT_WEEKLY_TARGET = 2;
export const MILESTONE_WEEKS = 4;
export const WEEKLY_TARGETS = [1, 2, 3, 4, 5, 6, 7];

export type WeeklyTargets = Record<string, number>;

function dayKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export function weekKey(date: Date): string {
  const monday = new Date(date);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  return dayKey(monday);
}

export function getWeeklyWorkoutGoal(
  completions: (string | number)[],
  targets: WeeklyTargets,
  now: Date,
) {
  const currentWeek = weekKey(now);
  const targetWeeks = Object.keys(targets).sort().reverse();
  const targetFor = (week: string) =>
    targets[targetWeeks.find((start) => start <= week) ?? ""] ?? DEFAULT_WEEKLY_TARGET;
  const daysByWeek = new Map<string, Set<string>>();

  for (const completion of completions) {
    const date = new Date(completion);
    if (!Number.isFinite(date.getTime()) || date > now) continue;
    const week = weekKey(date);
    const days = daysByWeek.get(week) ?? new Set<string>();
    days.add(dayKey(date));
    daysByWeek.set(week, days);
  }

  const target = targetFor(currentWeek);
  const days = daysByWeek.get(currentWeek)?.size ?? 0;
  const milestoneWeeks = [...daysByWeek].filter(
    ([week, workoutDays]) => week < currentWeek && workoutDays.size >= targetFor(week),
  ).length;

  return { target, days, milestoneWeeks };
}
