import api from './authAPI';

export interface CreateSessionRequest {
  exerciseName: string;
  machineCode: string;
  muscleGroup: string;
  startTime: number;       // epoch milliseconds
  endTime: number;         // epoch milliseconds
  durationSeconds: number;
  notes?: string;
}

export interface SessionResponse {
  id: number;
  exerciseName: string | null;
  machineName: string | null;
  machineCode: string | null;
  muscleGroup: string;
  startedAt: string;  // ISO instant string
  endedAt: string | null;
  durationSeconds: number;
  notes?: string | null;
}

export interface SessionPage {
  content: SessionResponse[];
  totalPages: number;
  totalElements: number;
  number: number;
}

export interface ExerciseCount {
  name: string;
  count: number;
}

export interface SessionStatsResponse {
  totalSessions: number;
  totalDurationSeconds: number;
  topExercises: ExerciseCount[];
  sessionsPerWeek: Record<string, number>;
}

export const sessionAPI = {
  postSession: async (session: CreateSessionRequest): Promise<SessionResponse> => {
    const response = await api.post('/sessions', session);
    return response.data;
  },

  getMyHistory: async (page = 0, size = 20): Promise<SessionPage> => {
    const response = await api.get(`/sessions/me?page=${page}&size=${size}`);
    return response.data;
  },

  getMyStats: async (): Promise<SessionStatsResponse> => {
    const response = await api.get('/sessions/me/stats');
    return response.data;
  },
};
