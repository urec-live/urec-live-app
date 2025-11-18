import React, { createContext, useContext, useState } from "react";

export interface WorkoutSession {
  exerciseName: string;
  machineId: string;
  muscleGroup: string;
  startTime: number;
  endTime?: number;
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
  checkIn: (exerciseName: string, machineId: string, muscleGroup: string) => void;
  checkOut: () => void;
  startRest: () => void;
  endRest: () => void;
  reserveMachine: (machineId: string) => void; 
  cancelReservation: () => void; 
  hasActiveEngagement: () => boolean; 
  isUserCheckedIntoMachine: (machineId: string) => boolean;
  isMachineInUseByOther: (machineId: string) => boolean;
}

const WorkoutContext = createContext<WorkoutContextType | undefined>(undefined);

export const WorkoutProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}: { children: React.ReactNode }) => {
  // Mock current user ID (in real app, get from auth)
  const currentUserId = "user123";

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

  const checkIn = (
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
  };

  const checkOut = () => {
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
    }
  };

  const updateWorkoutHistory = (session: WorkoutSession) => {
    const today = new Date().toISOString().split("T")[0];

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