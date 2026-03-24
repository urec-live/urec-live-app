import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { planAPI, TodayPlanResponse, WorkoutPlanResponse } from "@/services/planAPI";
import { useAuth } from "@/contexts/AuthContext";

interface PlanContextType {
  activePlan: WorkoutPlanResponse | null;
  todayPlan: TodayPlanResponse | null;
  hasPlanForToday: boolean;
  loading: boolean;
  refreshActivePlan: () => Promise<void>;
  refreshTodayPlan: () => Promise<void>;
}

const PlanContext = createContext<PlanContextType | undefined>(undefined);

export const PlanProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isSignedIn } = useAuth();
  const [activePlan, setActivePlan] = useState<WorkoutPlanResponse | null>(null);
  const [todayPlan, setTodayPlan] = useState<TodayPlanResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const refreshActivePlan = useCallback(async () => {
    try {
      const plan = await planAPI.getMyPlan();
      setActivePlan(plan);
    } catch {
      setActivePlan(null);
    }
  }, []);

  const refreshTodayPlan = useCallback(async () => {
    try {
      const today = await planAPI.getTodayPlan();
      setTodayPlan(today);
    } catch {
      setTodayPlan(null);
    }
  }, []);

  useEffect(() => {
    if (isSignedIn) {
      setLoading(true);
      Promise.all([refreshActivePlan(), refreshTodayPlan()]).finally(() => setLoading(false));
    } else {
      setActivePlan(null);
      setTodayPlan(null);
    }
  }, [isSignedIn, refreshActivePlan, refreshTodayPlan]);

  const value: PlanContextType = {
    activePlan,
    todayPlan,
    hasPlanForToday: todayPlan !== null,
    loading,
    refreshActivePlan,
    refreshTodayPlan,
  };

  return <PlanContext.Provider value={value}>{children}</PlanContext.Provider>;
};

export const usePlan = () => {
  const context = useContext(PlanContext);
  if (!context) {
    throw new Error("usePlan must be used within PlanProvider");
  }
  return context;
};
