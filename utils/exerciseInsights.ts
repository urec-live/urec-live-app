import { Exercise, LoggingMode } from "@/services/exerciseAPI";
import { SessionResponse, SessionSetDetail } from "@/services/sessionAPI";

export type Metric = "weight" | "oneRm" | "setVolume" | "sessionVolume" | "reps" | "duration" | "distance";
export const metricLabels: Record<Metric, string> = {
  weight: "Heaviest weight", oneRm: "Estimated 1RM", setVolume: "Best set volume",
  sessionVolume: "Session volume", reps: "Most reps", duration: "Duration", distance: "Distance",
};
export const metricUnit: Record<Metric, string> = {
  weight: "lbs", oneRm: "lbs", setVolume: "lbs", sessionVolume: "lbs",
  reps: "reps", duration: "sec", distance: "m",
};
const valid = (n: number | null | undefined): n is number => n != null && Number.isFinite(n) && n >= 0;
export const volume = (s: SessionSetDetail) =>
  valid(s.weightLbs) && valid(s.reps) && s.reps > 0 ? s.weightLbs * s.reps : null;
/** Epley estimate, limited to 1–12 reps; singles use the actual load. */
export function estimatedOneRm(s: SessionSetDetail): number | null {
  if (!valid(s.weightLbs) || s.weightLbs <= 0 || !valid(s.reps) || s.reps < 1 || s.reps > 12) return null;
  return s.reps === 1 ? s.weightLbs : s.weightLbs * (1 + s.reps / 30);
}
const max = (values: (number | null | undefined)[]) => {
  const numbers = values.filter(valid);
  return numbers.length ? Math.max(...numbers) : null;
};
export function metricsFor(mode: LoggingMode): Metric[] {
  if (mode === "REPS") return ["reps"];
  if (mode === "DURATION") return ["duration"];
  if (mode === "DISTANCE_DURATION") return ["distance", "duration"];
  return ["weight", "oneRm", "setVolume", "sessionVolume"];
}
export function exerciseSessions(history: SessionResponse[], exercise: Pick<Exercise, "id" | "name">): SessionResponse[] {
  return history.filter(s => s.endedAt && Number.isFinite(Date.parse(s.startedAt)) &&
    (s.exerciseId != null ? s.exerciseId === exercise.id : s.exerciseName?.trim().toLowerCase() === exercise.name.trim().toLowerCase()))
    .sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt));
}
export function sessionMetric(session: SessionResponse, metric: Metric): number | null {
  const sets = session.setDetails || [];
  if (metric === "weight") return max(sets.map(s => s.weightLbs));
  if (metric === "oneRm") return max(sets.map(estimatedOneRm));
  if (metric === "setVolume") return max(sets.map(volume));
  if (metric === "sessionVolume") {
    const volumes = sets.map(volume).filter(valid);
    return volumes.length ? volumes.reduce((a, b) => a + b, 0) : null;
  }
  if (metric === "reps") return max(sets.map(s => s.reps));
  if (metric === "duration") {
    const durations = sets.map(s => s.durationSeconds).filter(valid);
    return durations.length ? durations.reduce((a, b) => a + b, 0) : valid(session.durationSeconds) ? session.durationSeconds : null;
  }
  const distances = sets.map(s => s.distanceMeters).filter(valid);
  return distances.length ? distances.reduce((a, b) => a + b, 0) : null;
}
export function personalRecords(sessions: SessionResponse[], mode: LoggingMode) {
  return metricsFor(mode).map(metric => ({
    metric, value: max(sessions.map(s => sessionMetric(s, metric))),
  }));
}
export function setRecords(sessions: SessionResponse[]) {
  const records = new Map<number, number>();
  for (const s of sessions) for (const set of s.setDetails || []) {
    if (valid(set.reps) && set.reps > 0 && valid(set.weightLbs))
      records.set(set.reps, Math.max(records.get(set.reps) ?? 0, set.weightLbs));
  }
  return [...records].sort(([a], [b]) => a - b).map(([reps, weight]) => ({ reps, weight }));
}
export function chartPoints(sessions: SessionResponse[], metric: Metric, months: number | null, now = new Date()) {
  const cutoff = new Date(now);
  if (months !== null) cutoff.setMonth(cutoff.getMonth() - months);
  const days = new Map<string, { date: string; value: number }>();
  for (const session of [...sessions].reverse()) {
    const date = new Date(session.startedAt);
    if (months !== null && date < cutoff) continue;
    const value = sessionMetric(session, metric);
    if (value === null) continue;
    const day = date.toLocaleDateString("en-CA");
    const existing = days.get(day);
    if (!existing || value >= existing.value) days.set(day, { date: session.startedAt, value });
  }
  return [...days.values()].sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
}
export const formatValue = (n: number) => Number(n.toFixed(2)).toLocaleString("en-US");
export function formatSet(set: SessionSetDetail, mode: LoggingMode): string {
  if (mode === "REPS") return set.reps == null ? "Not recorded" : `${set.reps} reps`;
  if (mode === "DURATION") return set.durationSeconds == null ? "Not recorded" : `${formatValue(set.durationSeconds)} sec`;
  if (mode === "DISTANCE_DURATION") return `${set.distanceMeters == null ? "—" : formatValue(set.distanceMeters)} m · ${set.durationSeconds ?? "—"} sec`;
  return `${set.weightLbs == null ? "—" : formatValue(set.weightLbs)} lbs × ${set.reps ?? "—"}`;
}
