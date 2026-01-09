import api from "./authAPI";

export interface WorkoutSessionPayload {
  exerciseName: string;
  machineId: string;
  muscleGroup: string;
  startTime: number;
  endTime: number;
}

export interface WorkoutSessionResponse extends WorkoutSessionPayload {}

export interface DailyWorkoutResponse {
  date: string;
  sessions: WorkoutSessionResponse[];
  muscleGroups: string[];
}

export const workoutAPI = {
  getHistory: async (days = 28): Promise<DailyWorkoutResponse[]> => {
    const response = await api.get(`/workouts/history?days=${days}`);
    return response.data;
  },

  addSession: async (payload: WorkoutSessionPayload): Promise<WorkoutSessionResponse> => {
    const response = await api.post("/workouts/session", payload);
    return response.data;
  },
};
