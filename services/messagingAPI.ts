import api from './authAPI';

export interface ChatMessageResponse {
  id: number;
  senderUsername: string;
  content: string;
  sentAt: string;
  type: 'COMMUNITY' | 'DM';
  recipientUsername?: string;
}

export interface ConversationSummary {
  partnerUsername: string;
  lastMessage: string;
  lastSentAt: string;
  unread: boolean;
}

export const messagingAPI = {
  getCommunityHistory: async (): Promise<ChatMessageResponse[]> => {
    const res = await api.get('/messaging/community/history');
    return res.data;
  },

  getDMHistory: async (username: string): Promise<ChatMessageResponse[]> => {
    const res = await api.get(`/messaging/dm/${encodeURIComponent(username)}`);
    return res.data;
  },

  getConversations: async (): Promise<ConversationSummary[]> => {
    const res = await api.get('/messaging/dm/conversations');
    return res.data;
  },

  markRead: async (username: string): Promise<void> => {
    await api.patch(`/messaging/dm/${encodeURIComponent(username)}/read`);
  },
};
