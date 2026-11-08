import api from './authAPI';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatSource {
  id: number;
  title: string;
  url: string;
  fetchedAt: string;
}

export interface ChatResponse {
  reply: string;
  sources: ChatSource[];
  answerability: 'full' | 'partial' | 'none' | 'unknown';
  mode: 'generated' | 'excerpts' | 'no_match' | 'unavailable';
}

export const chatAPI = {
  send: async (messages: ChatMessage[]): Promise<ChatResponse> => {
    const response = await api.post<ChatResponse>('/chat', { messages: messages.slice(-20) }, { timeout: 75000 });
    return response.data;
  },
};
