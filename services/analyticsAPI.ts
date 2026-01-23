import api from "./authAPI";
import { machineAPI } from "./machineAPI";

export interface SessionUsageSummary {
  since: string;
  totalSessions: number;
  completedSessions: number;
  averageDurationSeconds: number;
  peakStartHour?: number | null;
  peakSessionCount: number;
}

export const analyticsAPI = {
  getMyUsage: async (days = 7): Promise<SessionUsageSummary> => {
    const headers = await machineAPI.authHeaders();
    const response = await api.get(`/analytics/usage/me?days=${days}`, { headers });
    return response.data;
  },
  getOverallUsage: async (days = 7): Promise<SessionUsageSummary> => {
    const headers = await machineAPI.authHeaders();
    const response = await api.get(`/analytics/usage/overall?days=${days}`, { headers });
    return response.data;
  },
};
