import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { sessionAPI, CreateSessionRequest } from "@/services/sessionAPI";
import { useAuth } from "@/contexts/AuthContext";
import { cacheKeys } from "@/services/cachedResources";
import { invalidateCached } from "@/services/resourceCache";
import { sessionWillBeSaved } from "@/utils/workoutSession";

export interface SetDetail {
  reps?: number;
  weightLbs?: number;
  durationSeconds?: number;
  distanceMeters?: number;
}

export interface WorkoutSession {
  exerciseName: string;
  machineCode?: string;
  exerciseId?: number;
  clientSessionId?: string;
  loggingMode?: import("@/services/exerciseAPI").LoggingMode;
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
  checkIn: (
    exerciseName: string,
    machineCode: string | undefined,
    muscleGroup: string,
    exerciseId?: number,
    loggingMode?: import("@/services/exerciseAPI").LoggingMode,
  ) => void;
  /**
   * Ends the current session. Resolves to whether it was saved as a workout: an empty one isn't
   * (see sessionWillBeSaved). Freeing the machine is up to the caller.
   */
  checkOut: (details?: { setDetails?: SetDetail[] }) => Promise<boolean>;
  updateSets: (sets: SetDetail[]) => void;
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
}: {
  children: React.ReactNode;
}) => {
  const { isSignedIn, user } = useAuth();
  const accountRef = useRef(user?.username);
  accountRef.current = user?.username;
  const finishing = useRef(false);
  const queueWork = useRef<Promise<void>>(Promise.resolve());
  const serialize = (task: () => Promise<void>) => {
    const next = queueWork.current.then(task, task);
    queueWork.current = next.catch(() => {});
    return next;
  };

  const [currentSession, setCurrentSession] = useState<WorkoutSession | null>(
    null,
  );
  const [exerciseStartTime, setExerciseStartTime] = useState<number | null>(
    null,
  );
  const [restStartTime, setRestStartTime] = useState<number | null>(null);
  const [todayWorkouts, setTodayWorkouts] = useState<WorkoutSession[]>([]);
  const [workoutHistory, setWorkoutHistory] = useState<DailyWorkout[]>([]);

  // All queue operations are serialized; unknown legacy queues are never assigned to a user.
  const flushPendingSessions = async () => {
    const account = user?.username;
    if (!account) return;
    await serialize(async () => {
      const key = `${PENDING_SESSIONS_KEY}:${account}`;
      const pending: CreateSessionRequest[] = JSON.parse(
        (await AsyncStorage.getItem(key)) || "[]",
      );
      const failed: CreateSessionRequest[] = [];
      for (const request of pending) {
        if (accountRef.current !== account) {
          failed.push(request);
          continue;
        }
        try {
          await sessionAPI.postSession(request);
        } catch {
          failed.push(request);
        }
      }
      await AsyncStorage.setItem(key, JSON.stringify(failed));
    });
  };
  useEffect(() => {
    setCurrentSession(null);
    setExerciseStartTime(null);
    setRestStartTime(null);
    setTodayWorkouts([]);
    setWorkoutHistory([]);
    if (isSignedIn && user) {
      const account = user.username;
      void AsyncStorage.getItem(`active_workout:${account}`)
        .then((raw) => {
          if (raw && accountRef.current === account) {
            const draft: WorkoutSession = JSON.parse(raw);
            setCurrentSession(draft);
            setExerciseStartTime(draft.startTime);
          }
        })
        .catch(() => {});
      void flushPendingSessions().catch(() => {});
    }
    const timer = setInterval(() => {
      if (isSignedIn) void flushPendingSessions().catch(() => {});
    }, 30000);
    return () => clearInterval(timer);
  }, [isSignedIn, user?.username]);

  const persistSession = async (session: WorkoutSession, endTime: number) => {
    const account = user?.username;
    if (!account) throw new Error("Sign in to save");
    const request: CreateSessionRequest = {
      exerciseId: session.exerciseId,
      clientSessionId: session.clientSessionId,
      ownerUsername: account,
      exerciseName: session.exerciseName,
      machineCode: session.machineCode,
      muscleGroup: session.muscleGroup,
      startTime: session.startTime,
      endTime,
      durationSeconds: Math.floor((endTime - session.startTime) / 1000),
      setDetails: session.setDetails,
    };
    await serialize(async () => {
      const key = `${PENDING_SESSIONS_KEY}:${account}`;
      const pending: CreateSessionRequest[] = JSON.parse(
        (await AsyncStorage.getItem(key)) || "[]",
      );
      pending.push(request);
      await AsyncStorage.setItem(key, JSON.stringify(pending));
    });
    // Saved stats, history and the league now include it (or will, once the queue is sent)
    invalidateCached(cacheKeys.userPrefix(account));
    void flushPendingSessions().catch(() => {});
  };

  const checkIn = (
    exerciseName: string,
    machineCode: string | undefined,
    muscleGroup: string,
    exerciseId?: number,
    loggingMode?: import("@/services/exerciseAPI").LoggingMode,
  ) => {
    if (currentSession) return;
    const now = Date.now();
    const session: WorkoutSession = {
      exerciseName,
      machineCode,
      muscleGroup,
      exerciseId,
      loggingMode,
      clientSessionId: `${now}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`,
      startTime: now,
    };
    setCurrentSession(session);
    if (user)
      void AsyncStorage.setItem(
        `active_workout:${user.username}`,
        JSON.stringify(session),
      ).catch(() => {});
    setExerciseStartTime(now);
  };

  const updateSets = (setDetails: SetDetail[]) => {
    if (!currentSession || !user) return;
    const draft = { ...currentSession, setDetails };
    setCurrentSession(draft);
    void AsyncStorage.setItem(
      `active_workout:${user.username}`,
      JSON.stringify(draft),
    ).catch(() => {});
  };
  const checkOut = async (details?: { setDetails?: SetDetail[] }) => {
    if (!currentSession || finishing.current) return false;
    finishing.current = true;
    const account = user?.username;
    try {
      const endTime = Date.now();
      const completedSession: WorkoutSession = {
        ...currentSession,
        endTime,
        ...details,
      };
      // Nothing logged: the session just ends, without counting as a workout anywhere
      const saved = sessionWillBeSaved(completedSession, endTime, completedSession.setDetails);

      if (saved) await persistSession(completedSession, endTime);
      if (user)
        await AsyncStorage.removeItem(`active_workout:${user.username}`);
      if (accountRef.current !== account) return saved;
      if (saved) {
        setTodayWorkouts((prev) => [...prev, completedSession]);
        updateWorkoutHistory(completedSession);
      }
      setCurrentSession(null);
      setExerciseStartTime(null);
      setRestStartTime(null);
      return saved;
    } finally {
      finishing.current = false;
    }
  };

  const updateWorkoutHistory = (session: WorkoutSession) => {
    const today = new Date().toISOString().split("T")[0];

    setWorkoutHistory((prev) => {
      const existingDayIndex = prev.findIndex((day) => day.date === today);

      if (existingDayIndex >= 0) {
        const updated = [...prev];
        updated[existingDayIndex].sessions.push(session);
        if (
          !updated[existingDayIndex].muscleGroups.includes(session.muscleGroup)
        ) {
          updated[existingDayIndex].muscleGroups.push(session.muscleGroup);
        }
        return updated;
      } else {
        return [
          ...prev,
          {
            date: today,
            sessions: [session],
            muscleGroups: [session.muscleGroup],
          },
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
    // Account-scoped completed sessions survive sign-out for their original owner.
  };

  const value: WorkoutContextType = {
    currentSession,
    exerciseStartTime,
    restStartTime,
    todayWorkouts,
    workoutHistory,
    checkIn,
    checkOut,
    updateSets,
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
