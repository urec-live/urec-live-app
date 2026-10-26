import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { sessionAPI, CreateSessionRequest } from "@/services/sessionAPI";
import { useAuth } from "@/contexts/AuthContext";
import { cacheKeys } from "@/services/cachedResources";
import { invalidateCached } from "@/services/resourceCache";
import { sessionWillBeSaved } from "@/utils/workoutSession";

export interface SetDetail {
  reps?: number;
  weightLbs?: number;
}

export interface WorkoutSession {
  exerciseName: string;
  machineId: string;
  muscleGroup: string;
  startTime: number;
  endTime?: number;
  setDetails?: SetDetail[];
}

export interface DailyWorkout {
  date: string;
  sessions: WorkoutSession[];
  muscleGroups: string[];
}

interface WorkoutContextType {
  currentSession: WorkoutSession | null;
  exerciseStartTime: number | null;
  restStartTime: number | null;
  todayWorkouts: WorkoutSession[];
  workoutHistory: DailyWorkout[];
  checkIn: (exerciseName: string, machineId: string, muscleGroup: string) => void;
  /**
   * Ends the current session. Returns whether it was saved as a workout: an empty one isn't
   * (see sessionWillBeSaved). Freeing the machine is up to the caller.
   */
  checkOut: (details?: { setDetails?: SetDetail[] }) => boolean;
  /** Starts the rest timer, from `time` if given (e.g. when the watch started it) */
  startRest: (time?: number) => void;
  endRest: () => void;
  resetWorkout: () => void;
  flushPendingSessions: () => Promise<void>;
}

const PENDING_SESSIONS_KEY = "pending_workout_sessions";

const WorkoutContext = createContext<WorkoutContextType | undefined>(undefined);

export const WorkoutProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}: { children: React.ReactNode }) => {
  const { isSignedIn, user } = useAuth();
  const hasFlushed = useRef(false);

  const [currentSession, setCurrentSession] = useState<WorkoutSession | null>(null);
  const [exerciseStartTime, setExerciseStartTime] = useState<number | null>(null);
  const [restStartTime, setRestStartTime] = useState<number | null>(null);
  const [todayWorkouts, setTodayWorkouts] = useState<WorkoutSession[]>([]);
  const [workoutHistory, setWorkoutHistory] = useState<DailyWorkout[]>([]);

  // Flush pending sessions only after the user is confirmed authenticated
  useEffect(() => {
    if (isSignedIn && !hasFlushed.current) {
      hasFlushed.current = true;
      flushPendingSessions();
    }
    if (!isSignedIn) {
      hasFlushed.current = false;
    }
  }, [isSignedIn]);

  const flushPendingSessions = async () => {
    try {
      const raw = await AsyncStorage.getItem(PENDING_SESSIONS_KEY);
      if (!raw) return;
      const pending: CreateSessionRequest[] = JSON.parse(raw);
      if (!pending.length) return;

      const failed: CreateSessionRequest[] = [];
      for (const session of pending) {
        try {
          await sessionAPI.postSession(session);
        } catch {
          failed.push(session);
        }
      }

      if (failed.length > 0) {
        await AsyncStorage.setItem(PENDING_SESSIONS_KEY, JSON.stringify(failed));
      } else {
        await AsyncStorage.removeItem(PENDING_SESSIONS_KEY);
      }
    } catch {
      // Silently ignore flush errors
    }
  };

  const persistSession = async (session: WorkoutSession, endTime: number, username?: string) => {
    const durationSeconds = Math.floor((endTime - session.startTime) / 1000);
    const request: CreateSessionRequest = {
      exerciseName: session.exerciseName,
      machineCode: session.machineId,
      muscleGroup: session.muscleGroup,
      startTime: session.startTime,
      endTime,
      durationSeconds,
      setDetails: session.setDetails,
    };

    try {
      await sessionAPI.postSession(request);
    } catch {
      // Queue for retry when back online
      try {
        const raw = await AsyncStorage.getItem(PENDING_SESSIONS_KEY);
        const pending: CreateSessionRequest[] = raw ? JSON.parse(raw) : [];
        pending.push(request);
        await AsyncStorage.setItem(PENDING_SESSIONS_KEY, JSON.stringify(pending));
      } catch {
        // Silently ignore storage errors
      }
    }
    // Stats, history and the league now include it (or will, once the queue is sent)
    if (username) invalidateCached(cacheKeys.userPrefix(username));
  };

  const checkIn = (exerciseName: string, machineId: string, muscleGroup: string) => {
    const now = Date.now();
    const session: WorkoutSession = { exerciseName, machineId, muscleGroup, startTime: now };
    setCurrentSession(session);
    setExerciseStartTime(now);
  };

  const checkOut = (details?: { setDetails?: SetDetail[] }) => {
    if (!currentSession) return false;
    const endTime = Date.now();
    const completedSession: WorkoutSession = { ...currentSession, endTime, ...details };

    setCurrentSession(null);
    setExerciseStartTime(null);
    setRestStartTime(null);

    // Nothing logged: the session just ends, without counting as a workout anywhere
    if (!sessionWillBeSaved(completedSession, endTime, completedSession.setDetails)) return false;

    setTodayWorkouts((prev) => [...prev, completedSession]);
    updateWorkoutHistory(completedSession);

    // Persist to backend (fire and forget — queues on failure)
    persistSession(completedSession, endTime, user?.username);
    return true;
  };

  const updateWorkoutHistory = (session: WorkoutSession) => {
    const today = new Date().toISOString().split("T")[0];

    setWorkoutHistory((prev) => {
      const existingDayIndex = prev.findIndex((day) => day.date === today);

      if (existingDayIndex >= 0) {
        const updated = [...prev];
        updated[existingDayIndex].sessions.push(session);
        if (!updated[existingDayIndex].muscleGroups.includes(session.muscleGroup)) {
          updated[existingDayIndex].muscleGroups.push(session.muscleGroup);
        }
        return updated;
      } else {
        return [
          ...prev,
          { date: today, sessions: [session], muscleGroups: [session.muscleGroup] },
        ];
      }
    });
  };

  const startRest = (time?: number) => setRestStartTime(time ?? Date.now());
  const endRest = () => setRestStartTime(null);

  const resetWorkout = () => {
    setCurrentSession(null);
    setExerciseStartTime(null);
    setRestStartTime(null);
    setTodayWorkouts([]);
    setWorkoutHistory([]);
    // Clear the offline queue so stale sessions don't replay after re-login
    AsyncStorage.removeItem(PENDING_SESSIONS_KEY).catch(() => {});
  };

  const value: WorkoutContextType = {
    currentSession,
    exerciseStartTime,
    restStartTime,
    todayWorkouts,
    workoutHistory,
    checkIn,
    checkOut,
    startRest,
    endRest,
    resetWorkout,
    flushPendingSessions,
  };

  return (
    <WorkoutContext.Provider value={value}>{children}</WorkoutContext.Provider>
  );
};

export const useWorkout = () => {
  const context = useContext(WorkoutContext);
  if (!context) {
    throw new Error("useWorkout must be used within WorkoutProvider");
  }
  return context;
};
