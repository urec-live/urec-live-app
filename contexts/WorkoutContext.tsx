import React, { createContext, useContext, useState } from "react";

export interface WorkoutSession {
  exerciseName: string;
  machineId: string;
  muscleGroup: string;
  startTime: number;
  endTime?: number;
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
  checkOut: () => void;
  startRest: () => void;
  endRest: () => void;
}

const WorkoutContext = createContext<WorkoutContextType | undefined>(undefined);

export const WorkoutProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}: { children: React.ReactNode }) => {
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
  };

  const checkOut = () => {
    if (currentSession) {
      const completedSession: WorkoutSession = {
        ...currentSession,
        endTime: Date.now(),
      };

      // Add to today's workouts
      setTodayWorkouts((prev) => [...prev, completedSession]);

      // Update history
      updateWorkoutHistory(completedSession);

      // Clear current session and reservation
      setCurrentSession(null);
      setExerciseStartTime(null);
      setRestStartTime(null);
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