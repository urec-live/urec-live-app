import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkout } from "@/contexts/WorkoutContext";
import {
  DAY_KEYS,
  DayKey,
  splitAPI,
  SplitMode,
  WeeklySplit,
} from "@/services/splitAPI";

const STRENGTH_GROUPS = [
  "Chest",
  "Shoulders",
  "Triceps",
  "Back",
  "Biceps",
  "Quads",
  "Hamstrings",
  "Calves",
  "Glutes",
  "Forearms",
  "Abs",
  "Core",
];

const SPLIT_OPTIONS = [
  "Chest",
  "Shoulders",
  "Triceps",
  "Back",
  "Biceps",
  "Quads",
  "Hamstrings",
  "Calves",
  "Glutes",
  "Forearms",
  "Abs",
  "Core",
  "Upper Body",
  "Lower Body",
  "Legs",
  "Cardio",
  "Pilates",
];

const dayIndexToKey: Record<number, DayKey> = {
  0: "Sun",
  1: "Mon",
  2: "Tue",
  3: "Wed",
  4: "Thu",
  5: "Fri",
  6: "Sat",
};

const createEmptySplit = (): WeeklySplit => ({
  Mon: [],
  Tue: [],
  Wed: [],
  Thu: [],
  Fri: [],
  Sat: [],
  Sun: [],
});

const GUEST_SPLIT_KEY = "guestSplit";
const GUEST_MODE_KEY = "guestSplitMode";

const expandGroup = (group: string): string[] => {
  switch (group) {
    case "Upper Body":
      return ["Chest", "Shoulders", "Triceps", "Back", "Biceps", "Forearms", "Abs", "Core"];
    case "Lower Body":
      return ["Quads", "Hamstrings", "Calves", "Glutes"];
    case "Legs":
      return ["Quads", "Hamstrings", "Calves", "Glutes"];
    default:
      return [group];
  }
};

const buildAutoSplit = (
  workoutHistory: { date: string; muscleGroups: string[] }[]
): WeeklySplit => {
  const split = createEmptySplit();
  const countsByDay: Record<DayKey, Record<string, number>> = {
    Mon: {},
    Tue: {},
    Wed: {},
    Thu: {},
    Fri: {},
    Sat: {},
    Sun: {},
  };

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 28);

  workoutHistory.forEach((day) => {
    const date = new Date(`${day.date}T00:00:00`);
    if (Number.isNaN(date.getTime()) || date < cutoff) return;
    const dayKey = dayIndexToKey[date.getDay()];
    day.muscleGroups.forEach((group) => {
      countsByDay[dayKey][group] = (countsByDay[dayKey][group] || 0) + 1;
    });
  });

  DAY_KEYS.forEach((dayKey) => {
    const entries = Object.entries(countsByDay[dayKey]);
    const sorted = entries.sort((a, b) => b[1] - a[1]).map(([group]) => group);
    split[dayKey] = sorted.slice(0, 3);
  });

  return split;
};

interface SplitContextType {
  mode: SplitMode;
  manualSplit: WeeklySplit;
  autoSplit: WeeklySplit;
  loading: boolean;
  isRestDay: boolean;
  todayGroups: string[];
  todayExpandedGroups: string[];
  todayStrengthGroups: string[];
  splitOptions: string[];
  refreshSplit: () => Promise<void>;
  setMode: (mode: SplitMode) => Promise<void>;
  updateDaySplit: (day: DayKey, groups: string[]) => Promise<void>;
}

const SplitContext = createContext<SplitContextType | undefined>(undefined);

export const SplitProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isGuest } = useAuth();
  const { workoutHistory } = useWorkout();
  const [mode, setModeState] = useState<SplitMode>("auto");
  const [manualSplit, setManualSplit] = useState<WeeklySplit>(createEmptySplit());
  const [loading, setLoading] = useState(true);

  const autoSplit = useMemo(() => buildAutoSplit(workoutHistory), [workoutHistory]);
  const todayKey = dayIndexToKey[new Date().getDay()];
  const todayGroups = (mode === "manual" ? manualSplit : autoSplit)[todayKey] || [];
  const todayExpandedGroups = Array.from(new Set(todayGroups.flatMap(expandGroup)));
  const todayStrengthGroups = todayExpandedGroups.filter((group) =>
    STRENGTH_GROUPS.includes(group)
  );
  const isRestDay = todayGroups.length === 0;

  const refreshSplit = async () => {
    try {
      setLoading(true);
      if (isGuest) {
        const storedMode = await AsyncStorage.getItem(GUEST_MODE_KEY);
        const storedSplit = await AsyncStorage.getItem(GUEST_SPLIT_KEY);
        const nextMode = storedMode === "auto" ? "auto" : "manual";
        setModeState(nextMode);
        if (storedSplit) {
          try {
            setManualSplit(JSON.parse(storedSplit));
          } catch (parseError) {
            console.error("Failed to parse guest split:", parseError);
            setManualSplit(createEmptySplit());
          }
        } else {
          setManualSplit(createEmptySplit());
        }
        return;
      }
      if (!user) {
        setModeState("auto");
        setManualSplit(createEmptySplit());
        return;
      }

      const response = await splitAPI.getSplit();
      const responseMode = String(response.mode || "auto").toLowerCase() as SplitMode;
      setModeState(responseMode === "manual" ? "manual" : "auto");
      setManualSplit(response.manualSplit || createEmptySplit());
    } catch (error) {
      console.error("Failed to load split:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshSplit();
  }, [user, isGuest]);

  const saveSplit = async (nextMode: SplitMode, nextSplit: WeeklySplit) => {
    if (isGuest) {
      await AsyncStorage.setItem(GUEST_MODE_KEY, nextMode);
      await AsyncStorage.setItem(GUEST_SPLIT_KEY, JSON.stringify(nextSplit));
      return;
    }
    if (!user) return;
    try {
      await splitAPI.saveSplit({
        mode: nextMode,
        manualSplit: nextSplit,
      });
    } catch (error) {
      console.error("Failed to save split:", error);
    }
  };

  const setMode = async (nextMode: SplitMode) => {
    setModeState(nextMode);
    await saveSplit(nextMode, manualSplit);
  };

  const updateDaySplit = async (day: DayKey, groups: string[]) => {
    const nextSplit = { ...manualSplit, [day]: groups };
    setManualSplit(nextSplit);
    await saveSplit(mode, nextSplit);
  };

  return (
    <SplitContext.Provider
      value={{
        mode,
        manualSplit,
        autoSplit,
        loading,
        isRestDay,
        todayGroups,
        todayExpandedGroups,
        todayStrengthGroups,
        splitOptions: SPLIT_OPTIONS,
        refreshSplit,
        setMode,
        updateDaySplit,
      }}
    >
      {children}
    </SplitContext.Provider>
  );
};

export const useSplit = () => {
  const context = useContext(SplitContext);
  if (!context) {
    throw new Error("useSplit must be used within SplitProvider");
  }
  return context;
};

export { DAY_KEYS, DayKey, WeeklySplit };
