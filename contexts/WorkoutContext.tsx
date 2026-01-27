import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { Alert, AppState } from "react-native";
import { useAuth } from "@/contexts/AuthContext";
import { workoutAPI } from "@/services/workoutAPI";
import { machineAPI } from "@/services/machineAPI";
import websocketService from "@/services/websocketService";

export interface WorkoutSession {
  exerciseName: string;
  machineId: string;
  muscleGroup: string;
  startTime: number;
  endTime?: number;
}

interface ActiveSessionMeta {
  sessionId: number;
  equipmentId: number;
  equipmentCode: string;
  startedAt: string;
}

export interface CheckedInMachine {
  exerciseName: string;
  machineId: string;
  muscleGroup: string;
  userId: string;
}

export interface DailyWorkout {
  date: string;
  sessions: WorkoutSession[];
  muscleGroups: string[];
}

interface WorkoutContextType {
  currentUserId: string;
  checkedInMachines: Map<string, CheckedInMachine>;
  currentSession: WorkoutSession | null;
  exerciseStartTime: number | null;
  restStartTime: number | null;
  todayWorkouts: WorkoutSession[];
  workoutHistory: DailyWorkout[];
  reservedMachineId: string | null;
  checkIn: (exerciseName: string, machineId: string, muscleGroup: string) => Promise<void>;
  checkOut: () => Promise<void>;
  startRest: () => void;
  endRest: () => void;
  reserveMachine: (machineId: string) => void;
  cancelReservation: () => void;
  hasActiveEngagement: () => boolean;
  isUserCheckedIntoMachine: (machineId: string) => boolean;
  isMachineInUseByOther: (machineId: string) => boolean;
}

const WorkoutContext = createContext<WorkoutContextType | undefined>(undefined);
const HEARTBEAT_INTERVAL_MS = 60_000;
const DISABLE_HEARTBEAT = process.env.EXPO_PUBLIC_DISABLE_HEARTBEAT === "true";
const ENV_HEARTBEAT_INTERVAL = Number(process.env.EXPO_PUBLIC_HEARTBEAT_INTERVAL_MS);
const HEARTBEAT_INTERVAL_EFFECTIVE_MS =
  Number.isFinite(ENV_HEARTBEAT_INTERVAL) && ENV_HEARTBEAT_INTERVAL > 0
    ? ENV_HEARTBEAT_INTERVAL
    : HEARTBEAT_INTERVAL_MS;

export const WorkoutProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const currentUserId = user?.username ?? "guest";

  // Track which machines are checked in by which users
  const [checkedInMachines, setCheckedInMachines] = useState<
    Map<string, CheckedInMachine>
  >(new Map());

  // Current active reservation machine ID
  const [reservedMachineId, setReservedMachineId] = useState<string | null>(null);

  // Current active session
  const [currentSession, setCurrentSession] = useState<WorkoutSession | null>(
    null
  );
  const [exerciseStartTime, setExerciseStartTime] = useState<number | null>(
    null
  );
  const [restStartTime, setRestStartTime] = useState<number | null>(null);

  // Today's completed workouts
  const [todayWorkouts, setTodayWorkouts] = useState<WorkoutSession[]>([]);

  // Historical workouts
  const [workoutHistory, setWorkoutHistory] = useState<DailyWorkout[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [activeSessionMeta, setActiveSessionMeta] = useState<ActiveSessionMeta | null>(null);
  const activeSessionMetaRef = useRef<ActiveSessionMeta | null>(null);
  const lastWarningSessionRef = useRef<number | null>(null);
  const heartbeatTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const heartbeatPendingRef = useRef(false);

  const getTodayKey = () => new Date().toISOString().split("T")[0];

  const refreshHistory = async () => {
    if (!user) {
      setWorkoutHistory([]);
      setTodayWorkouts([]);
      return;
    }

    try {
      setLoadingHistory(true);
      const history = await workoutAPI.getHistory(28);
      setWorkoutHistory(history);
      const todayKey = getTodayKey();
      const today = history.find((day) => day.date === todayKey);
      setTodayWorkouts(today?.sessions || []);
    } catch (error) {
      console.error("Failed to load workout history:", error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const checkIn = async (
    exerciseName: string,
    machineId: string,
    muscleGroup: string
  ) => {
    const now = Date.now();
    const session: WorkoutSession = {
      exerciseName,
      machineId,
      muscleGroup,
      startTime: now,
    };

    setCurrentSession(session);
    setExerciseStartTime(now);
    setReservedMachineId(null); // Clear reservation on check-in

    // Mark machine as in use by this user
    setCheckedInMachines((prev) => {
      const updated = new Map(prev);
      updated.set(machineId, {
        exerciseName,
        machineId,
        muscleGroup,
        userId: currentUserId,
      });
      return updated;
    });

    if (user) {
      try {
        const active = await machineAPI.getMyActiveSession();
        if (active) {
          setActiveSessionMeta({
            sessionId: active.id,
            equipmentId: active.equipment.id,
            equipmentCode: active.equipment.code,
            startedAt: active.startedAt,
          });
          activeSessionMetaRef.current = {
            sessionId: active.id,
            equipmentId: active.equipment.id,
            equipmentCode: active.equipment.code,
            startedAt: active.startedAt,
          };
        }
      } catch (error) {
        console.error("Failed to load active session after check-in:", error);
      }
    }
  };

  const checkOut = async () => {
    if (currentSession) {
      const completedSession: WorkoutSession = {
        ...currentSession,
        endTime: Date.now(),
      };

      // Add to today's workouts
      setTodayWorkouts((prev) => [...prev, completedSession]);

      // Remove from checked in machines
      setCheckedInMachines((prev) => {
        const updated = new Map(prev);
        updated.delete(currentSession.machineId);
        return updated;
      });

      // Update history
      updateWorkoutHistory(completedSession);

      // Clear current session and reservation
      setCurrentSession(null);
      setExerciseStartTime(null);
      setRestStartTime(null);
      setReservedMachineId(null);
      setActiveSessionMeta(null);
      activeSessionMetaRef.current = null;
      lastWarningSessionRef.current = null;

      if (user) {
        try {
          await workoutAPI.addSession({
            exerciseName: completedSession.exerciseName,
            machineId: completedSession.machineId,
            muscleGroup: completedSession.muscleGroup,
            startTime: completedSession.startTime,
            endTime: completedSession.endTime || Date.now(),
          });
          await refreshHistory();
        } catch (error) {
          console.error("Failed to save workout session:", error);
        }
      }
    }
  };

  const syncActiveSession = async () => {
    if (!user) {
      setCurrentSession(null);
      setExerciseStartTime(null);
      setRestStartTime(null);
      setCheckedInMachines(new Map());
      setActiveSessionMeta(null);
      activeSessionMetaRef.current = null;
      lastWarningSessionRef.current = null;
      return;
    }

    try {
      const active = await machineAPI.getMyActiveSession();
      if (!active) {
        setCurrentSession(null);
        setExerciseStartTime(null);
        setRestStartTime(null);
        setCheckedInMachines(new Map());
        setActiveSessionMeta(null);
        activeSessionMetaRef.current = null;
        lastWarningSessionRef.current = null;
        return;
      }

      const machineCode = active.equipment.code;
      let exerciseName = active.equipment.name;
      let muscleGroup = "General";

      try {
        const exercises = await machineAPI.getExercisesByEquipmentCode(machineCode);
        if (exercises.length > 0) {
          exerciseName = exercises[0].name;
          muscleGroup = exercises[0].muscleGroup;
        }
      } catch (error) {
        console.error("Failed to load exercises for active session:", error);
      }

      const startTime = Date.parse(active.startedAt);
      setCurrentSession({
        exerciseName,
        machineId: machineCode,
        muscleGroup,
        startTime: Number.isNaN(startTime) ? Date.now() : startTime,
      });
      setExerciseStartTime(Number.isNaN(startTime) ? Date.now() : startTime);
      setRestStartTime(null);
      const meta = {
        sessionId: active.id,
        equipmentId: active.equipment.id,
        equipmentCode: active.equipment.code,
        startedAt: active.startedAt,
      };
      setActiveSessionMeta(meta);
      activeSessionMetaRef.current = meta;
      setCheckedInMachines(() => {
        const updated = new Map<string, CheckedInMachine>();
        updated.set(machineCode, {
          exerciseName,
          machineId: machineCode,
          muscleGroup,
          userId: currentUserId,
        });
        return updated;
      });
    } catch (error) {
      console.error("Failed to sync active session:", error);
    }
  };

  const updateWorkoutHistory = (session: WorkoutSession) => {
    const today = getTodayKey();

    setWorkoutHistory((prev) => {
      const existingDayIndex = prev.findIndex((day) => day.date === today);

      if (existingDayIndex >= 0) {
        const updated = [...prev];
        updated[existingDayIndex].sessions.push(session);
        // Update muscle groups
        if (!updated[existingDayIndex].muscleGroups.includes(session.muscleGroup)) {
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

  const startRest = () => {
    setRestStartTime(Date.now());
  };

  const endRest = () => {
    setRestStartTime(null);
  };

  // --- NEW FUNCTIONS ---
  const reserveMachine = (machineId: string) => {
    setReservedMachineId(machineId);
  };

  const cancelReservation = () => {
    setReservedMachineId(null);
  };
  
  const hasActiveEngagement = (): boolean => {
    return currentSession !== null || reservedMachineId !== null;
  };
  // --- END NEW FUNCTIONS ---

  const isUserCheckedIntoMachine = (machineId: string): boolean => {
    const machine = checkedInMachines.get(machineId);
    return machine?.userId === currentUserId;
  };

  const isMachineInUseByOther = (machineId: string): boolean => {
    const machine = checkedInMachines.get(machineId);
    return machine !== undefined && machine.userId !== currentUserId;
  };

  const value: WorkoutContextType = {
    currentUserId,
    checkedInMachines,
    currentSession,
    exerciseStartTime,
    restStartTime,
    todayWorkouts,
    workoutHistory,
    reservedMachineId,
    reserveMachine,
    cancelReservation,
    hasActiveEngagement,
    checkIn,
    checkOut,
    startRest,
    endRest,
    isUserCheckedIntoMachine,
    isMachineInUseByOther,
  };

  useEffect(() => {
    refreshHistory();
    syncActiveSession();
  }, [user]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        syncActiveSession();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [user]);

  useEffect(() => {
    activeSessionMetaRef.current = activeSessionMeta;
  }, [activeSessionMeta]);

  useEffect(() => {
    if (!user) {
      return;
    }
    websocketService.connect();
    const unsubscribe = websocketService.subscribe((update) => {
      if (update.status !== "TIMEOUT_WARNING") {
        return;
      }
      const meta = activeSessionMetaRef.current;
      if (!meta || !currentSession) {
        return;
      }
      if (update.sessionId !== meta.sessionId) {
        return;
      }
      if (lastWarningSessionRef.current === meta.sessionId) {
        return;
      }
      lastWarningSessionRef.current = meta.sessionId;

      Alert.alert(
        "Session about to end",
        "We haven't heard from your device in a while. Tap Keep Alive to continue your session.",
        [
          {
            text: "Keep Alive",
            onPress: async () => {
              try {
                await machineAPI.heartbeat(meta.equipmentId);
              } catch (error) {
                console.error("Failed to send heartbeat from alert:", error);
              }
            },
          },
          { text: "Dismiss", style: "cancel" },
        ]
      );
    });

    return () => {
      unsubscribe();
    };
  }, [user, currentSession]);

  useEffect(() => {
    if (heartbeatTimerRef.current) {
      clearInterval(heartbeatTimerRef.current);
      heartbeatTimerRef.current = null;
    }
    if (DISABLE_HEARTBEAT || !user || !activeSessionMeta) {
      return;
    }

    const sendHeartbeat = async () => {
      if (heartbeatPendingRef.current) {
        return;
      }
      if (AppState.currentState !== "active") {
        return;
      }
      heartbeatPendingRef.current = true;
      try {
        await machineAPI.heartbeat(activeSessionMeta.equipmentId);
      } catch (error) {
        console.error("Failed to send heartbeat:", error);
      } finally {
        heartbeatPendingRef.current = false;
      }
    };

    sendHeartbeat();
    heartbeatTimerRef.current = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_EFFECTIVE_MS);

    return () => {
      if (heartbeatTimerRef.current) {
        clearInterval(heartbeatTimerRef.current);
        heartbeatTimerRef.current = null;
      }
    };
  }, [user, activeSessionMeta]);

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
