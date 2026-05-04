import api from './authAPI';

export interface DayPlanItemDto {
  muscleGroup: string;
  targetCount: number;
  sortOrder?: number;
}

export interface DayPlanDto {
  dayOfWeek: number; // 1=Monday, 7=Sunday
  label?: string;
  items: DayPlanItemDto[];
}

export interface WorkoutPlanRequest {
  name: string;
  days: DayPlanDto[];
}

export interface DayPlanItemResponse {
  id: number;
  muscleGroup: string;
  targetCount: number;
  sortOrder: number;
}

export interface DayPlanResponse {
  id: number;
  dayOfWeek: number;
  label: string | null;
  items: DayPlanItemResponse[];
}

export interface WorkoutPlanResponse {
  id: number;
  name: string;
  active: boolean;
  visibility: string;
  days: DayPlanResponse[];
  createdAt: string;
  updatedAt: string;
}

export interface TodayGoalItem {
  muscleGroup: string;
  targetCount: number;
  completedCount: number;
  completed: boolean;
}

export interface TodayPlanResponse {
  dayOfWeek: number;
  label: string | null;
  planName: string;
  planActive: boolean;
  items: TodayGoalItem[];
}

export const planAPI = {
  createPlan: async (plan: WorkoutPlanRequest): Promise<WorkoutPlanResponse> => {
    const response = await api.post('/plans', plan);
    return response.data;
  },

  getMyPlan: async (): Promise<WorkoutPlanResponse | null> => {
    const response = await api.get('/plans/me');
    if (response.status === 204) return null;
    return response.data;
  },

  updatePlan: async (id: number, plan: WorkoutPlanRequest): Promise<WorkoutPlanResponse> => {
    const response = await api.put(`/plans/${id}`, plan);
    return response.data;
  },

  deletePlan: async (id: number): Promise<void> => {
    await api.delete(`/plans/${id}`);
  },

  getTodayPlan: async (): Promise<TodayPlanResponse | null> => {
    const response = await api.get('/plans/me/today');
    if (response.status === 204) return null;
    return response.data;
  },

  updateVisibility: async (id: number, visibility: 'PUBLIC' | 'PRIVATE'): Promise<WorkoutPlanResponse> => {
    const response = await api.patch(`/plans/${id}/visibility`, { visibility });
    return response.data;
  },

  getPublicPlans: async (username: string): Promise<WorkoutPlanResponse[]> => {
    const response = await api.get(`/plans/public?username=${encodeURIComponent(username)}`);
    return response.data;
  },

  copyPlan: async (id: number): Promise<WorkoutPlanResponse> => {
    const response = await api.post(`/plans/${id}/copy`);
    return response.data;
  },
};
