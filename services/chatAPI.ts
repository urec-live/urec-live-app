import api from './authAPI';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatResponse {
  reply: string;
}

export const chatAPI = {
  send: async (messages: ChatMessage[]): Promise<string> => {
    const response = await api.post<ChatResponse>('/chat', { messages });
    return response.data.reply;
  },
};
