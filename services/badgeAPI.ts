import api from './authAPI';

export interface BadgeEntry {
  badgeType: string;
  awardedAt: string;
}

export interface BadgeResponse {
  earned: BadgeEntry[];
  available: string[];
}

export const badgeAPI = {
  getMyBadges: async (): Promise<BadgeResponse> => {
    const response = await api.get('/badges/me');
    return response.data;
  },
};
