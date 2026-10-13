import api from './authAPI';
import type { PersonalRecord } from './sessionAPI';

export interface PublicProfileResponse {
  username: string;
  bio: string | null;
  currentStreak: number;
  longestStreak: number;
  recentMuscleGroups: string[];
  topPRs: PersonalRecord[];
}

export interface SearchResult {
  username: string;
  currentStreak: number;
}

export const socialAPI = {
  getPublicProfile: async (username: string): Promise<PublicProfileResponse> => {
    const response = await api.get(`/social/users/${encodeURIComponent(username)}`);
    return response.data;
  },

  searchUsers: async (q: string): Promise<SearchResult[]> => {
    const response = await api.get(`/social/users/search?q=${encodeURIComponent(q)}`);
    return response.data.results;
  },

  updateMyProfile: async (data: { profileVisibility?: string; bio?: string }): Promise<void> => {
    await api.patch('/social/me/profile', data);
  },
};
