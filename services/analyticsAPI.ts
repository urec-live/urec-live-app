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

export interface EquipmentUtilizationSnapshot {
  equipmentId: number;
  code: string;
  name: string;
  windowStart: string;
  windowEnd: string;
  utilizationPercent: number;
}

export interface EquipmentWaitTimeEstimate {
  equipmentId: number;
  code: string;
  name: string;
  inUse: boolean;
  estimatedWaitSeconds: number | null;
  averageDurationSeconds: number | null;
  activeSessionElapsedSeconds: number | null;
  activeSessionStartedAt: string | null;
}

export interface WaitTimeSummaryDTO {
  averageWaitMinutes: number | null;
  busyCount: number;
  longestWaitMachineName: string | null;
  longestWaitSeconds: number | null;
}

export interface UserStats {
  currentStreak: number;
  totalWorkoutsThisWeek: number;
  totalHoursThisWeek: number;
  weeklySplit: Record<string, number>;
}

export const analyticsAPI = {
  getMyUsage: async (days = 7): Promise<SessionUsageSummary> => {
    const headers = await machineAPI.authHeaders();
    const response = await api.get<SessionUsageSummary>(`/analytics/usage/me?days=${days}`, { headers });
    return response.data;
  },

  getMyStats: async (): Promise<UserStats> => {
    const headers = await machineAPI.authHeaders();
    const response = await api.get<UserStats>('/analytics/my-stats', { headers });
    return response.data;
  },

  getOverallUsage: async (days = 7): Promise<SessionUsageSummary> => {
    const headers = await machineAPI.authHeaders();
    const response = await api.get(`/analytics/usage/overall?days=${days}`, { headers });
    return response.data;
  },
  getRollingUtilization: async (minutes = 15): Promise<EquipmentUtilizationSnapshot[]> => {
    const headers = await machineAPI.authHeaders();
    const response = await api.get(`/analytics/utilization/rolling?minutes=${minutes}`, { headers });
    return response.data;
  },
  getWaitTimeEstimate: async (code: string, days = 7): Promise<EquipmentWaitTimeEstimate> => {
    const headers = await machineAPI.authHeaders();
    const response = await api.get(`/analytics/wait-time/${code}?days=${days}`, { headers });
    return response.data;
  },
  getWaitTimeSummary: async (days = 7): Promise<WaitTimeSummaryDTO> => {
    const headers = await machineAPI.authHeaders();
    const response = await api.get(`/analytics/wait-time/summary?days=${days}`, { headers });
    return response.data;
  },
};
