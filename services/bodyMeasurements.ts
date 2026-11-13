import AsyncStorage from "@react-native-async-storage/async-storage";
import { dateKey } from "@/utils/historyCalendar";
import { writeCached } from "@/services/resourceCache";

export interface BodyMeasurements {
  weightKg: number | null;
  heightCm: number | null;
}

export interface WeightEntry { date: string; weightKg: number; }
export interface MeasurementRecord extends BodyMeasurements { weightHistory: WeightEntry[]; }

export const measurementsCacheKey = (username: string) => `user:${username}:body-measurements:v2`;
const storageKey = (username: string) => `body-measurements:${encodeURIComponent(username)}`;

export function validateMeasurements(value: BodyMeasurements): string | null {
  if (value.weightKg != null && (!Number.isFinite(value.weightKg) || value.weightKg < 20 || value.weightKg > 500)) return "Enter a weight between 20 and 500 kg (44–1,102 lb), or leave it blank.";
  if (value.heightCm != null && (!Number.isFinite(value.heightCm) || value.heightCm < 50 || value.heightCm > 275)) return "Enter a height between 50 and 275 cm (20–108 in), or leave it blank.";
  return null;
}

// Measurements stay on this device, scoped to the signed-in account. The backing
// store is separate from the disposable API cache so signing out doesn't erase them.
export async function readMeasurements(username: string): Promise<MeasurementRecord> {
  const raw = await AsyncStorage.getItem(storageKey(username));
  if (!raw) return { weightKg: null, heightCm: null, weightHistory: [] };
  const parsed = JSON.parse(raw);
  const value = { weightKg: parsed.weightKg ?? null, heightCm: parsed.heightCm ?? null };
  if (validateMeasurements(value)) throw new Error("Saved measurements could not be read.");
  const history: unknown = parsed.weightHistory ?? [];
  if (!Array.isArray(history) || history.some(entry => !entry || typeof entry.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(entry.date) || validateMeasurements({ weightKg: entry.weightKg, heightCm: null }) || entry.weightKg == null)) {
    throw new Error("Saved weight history could not be read.");
  }
  return { ...value, weightHistory: [...history].sort((a, b) => a.date.localeCompare(b.date)) };
}

// Serialize saves per account so two screens can't overwrite each other's history.
const saves = new Map<string, Promise<void>>();
export async function saveMeasurements(username: string, value: BodyMeasurements, now = new Date()): Promise<void> {
  const error = validateMeasurements(value);
  if (error) throw new Error(error);
  const task = (saves.get(username) ?? Promise.resolve()).catch(() => {}).then(async () => {
    const previous = await readMeasurements(username);
    const date = dateKey(now);
    const weightHistory = value.weightKg == null ? previous.weightHistory : [
      ...previous.weightHistory.filter(entry => entry.date !== date),
      { date, weightKg: value.weightKg },
    ].sort((a, b) => a.date.localeCompare(b.date));
    const record = { ...value, weightHistory };
    await AsyncStorage.setItem(storageKey(username), JSON.stringify(record));
    writeCached(measurementsCacheKey(username), record);
  });
  saves.set(username, task);
  try { await task; } finally { if (saves.get(username) === task) saves.delete(username); }
}
