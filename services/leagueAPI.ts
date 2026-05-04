import api from './authAPI';

export interface LeagueInfoResponse {
  tier: string;
  weeklyScore: number;
  rankInTier: number | null;
  totalInTier: number;
  weekStart: string;
  nextTierThreshold: number | null;
}

export interface LeaderboardEntry {
  rank: number;
  username: string;
  weeklyScore: number;
  me: boolean;
}

export interface LeaderboardResponse {
  tier: string;
  weekStart: string;
  entries: LeaderboardEntry[];
  myEntry: LeaderboardEntry;
}

export const leagueAPI = {
  getMyLeagueInfo: async (): Promise<LeagueInfoResponse> => {
    const response = await api.get('/league/me');
    return response.data;
  },

  getLeaderboard: async (): Promise<LeaderboardResponse> => {
    const response = await api.get('/league/leaderboard');
    return response.data;
  },
};
