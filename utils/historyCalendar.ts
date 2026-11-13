import type { DailyWorkout } from "@/contexts/WorkoutContext";

// Date-only history keys are local calendar dates, never UTC midnights.
export function calendarDate(key: string): Date {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day, 12);
}

export function dateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function addDays(key: string, days: number): string {
  const date = calendarDate(key);
  date.setDate(date.getDate() + days);
  return dateKey(date);
}

export function weekStart(key: string): string {
  return addDays(key, -calendarDate(key).getDay());
}

export function monthWeeks(month: string): string[][] {
  const first = `${month.slice(0, 7)}-01`;
  const date = calendarDate(first);
  const last = dateKey(new Date(date.getFullYear(), date.getMonth() + 1, 0, 12));
  const weeks: string[][] = [];
  for (let start = weekStart(first); start <= last; start = addDays(start, 7)) {
    weeks.push(Array.from({ length: 7 }, (_, i) => addDays(start, i)));
  }
  return weeks;
}

export function weekHistory(history: DailyWorkout[], start: string): DailyWorkout[] {
  const end = addDays(start, 6);
  return history.filter(day => day.date >= start && day.date <= end)
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function summarizeWeek(days: DailyWorkout[], weightKg = 70) {
  const sessions = days.flatMap(day => day.sessions);
  const muscleGroups = Array.from(new Map(sessions.flatMap(session =>
    (session.muscleGroup ?? "").split(/[,;/]/).map(group => group.trim())
      .filter(group => group && !["general", "unknown", "n/a"].includes(group.toLowerCase()))
      .map(group => [group.toLowerCase(), group] as const)
  )).values()).sort((a, b) => a.localeCompare(b));
  const seconds = sessions.reduce((sum, session) => sum + (session.endTime != null
    ? Math.max(0, Math.floor((session.endTime - session.startTime) / 1000)) : 0), 0);
  return {
    muscleGroups,
    // Reference estimate, not a measurement. 2024 Adult Compendium code 02054:
    // https://pacompendium.com/adult-compendium/ (3.5 MET, varied resistance training).
    // kcal = MET * 3.5 * body weight (kg) / 200 * minutes.
    estimatedKcal: Math.round(3.5 * 3.5 * weightKg / 200 * (seconds / 60)),
    days: days.filter(day => day.sessions.length > 0).length,
    exercises: sessions.length,
    sets: sessions.reduce((sum, session) => sum + (session.setDetails?.length ?? 0), 0),
    seconds,
  };
}

export function briefDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  return minutes < 60 ? `${minutes}m` : `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

export function weekLabel(start: string): string {
  const format = (key: string) => calendarDate(key).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const end = addDays(start, 6);
  return `${format(start)} – ${format(end)}${start.slice(0, 4) !== end.slice(0, 4) ? `, ${start.slice(0, 4)}/${end.slice(0, 4)}` : `, ${end.slice(0, 4)}`}`;
}
