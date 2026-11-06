import { HISTORY_PAGE_SIZE, PHOTO_UPLOAD_TIMEOUT_MS } from '@/constants/chat';
import api from './authAPI';

/** URL segment for a chat room: the global community chat or direct messages. */
export type ChatChannel = 'community' | 'dm';

/** What a message holds. Messages from before media existed come back as TEXT. */
export type MessageKind = 'TEXT' | 'GIF' | 'STICKER' | 'IMAGE';

export interface ChatMedia {
  /** For photos, an expiring URL (it changes on every fetch); may be relative to the backend. */
  url: string;
  previewUrl?: string | null;
  width?: number | null;
  height?: number | null;
  /** Photos only: a stable id to cache the image by, since its URL keeps changing. */
  mediaId?: number | null;
}

/** A photo stored on the server, ready to send as an IMAGE message. */
export interface UploadedPhoto {
  mediaId: number;
  width: number;
  height: number;
}

export interface ChatMessageResponse {
  id: number;
  senderUsername: string;
  content: string;
  sentAt: string;
  /** The room, not the content: see kind. */
  type: 'COMMUNITY' | 'DM';
  recipientUsername?: string;
  kind?: MessageKind;
  media?: ChatMedia | null;
  /** Echo of the id the app sent with the message. */
  clientId?: string | null;
  /** The sender deleted it. */
  deleted?: boolean;
  /** Staff removed it after a report. */
  removedByStaff?: boolean;
  /** Emoji to the usernames who reacted with it. */
  reactions?: Record<string, string[]>;
}

export interface ConversationSummary {
  partnerUsername: string;
  /** The text, or a label such as "GIF", "Sticker", "Photo" or "Message deleted". */
  lastMessage: string;
  lastSentAt: string;
  lastKind?: MessageKind;
  unread: boolean;
}

export type ReportReason = 'SPAM' | 'HARASSMENT' | 'INAPPROPRIATE' | 'OTHER';

export interface ChatReportResponse {
  id: number;
  reason: ReportReason;
  note: string | null;
  status: 'OPEN' | 'DISMISSED' | 'ACTIONED';
}

const messageUrl = (channel: ChatChannel, id: number) => `/messaging/${channel}/messages/${id}`;

export const messagingAPI = {
  /** The newest page of community chat, or the page before message `before`; oldest first. */
  getCommunityHistory: async (before?: number): Promise<ChatMessageResponse[]> => {
    const res = await api.get('/messaging/community/history', {
      params: { limit: HISTORY_PAGE_SIZE, ...(before ? { before } : {}) },
    });
    return res.data;
  },

  /** Same paging as getCommunityHistory, for one conversation. */
  getDMHistory: async (username: string, before?: number): Promise<ChatMessageResponse[]> => {
    const res = await api.get(`/messaging/dm/${encodeURIComponent(username)}`, {
      params: { limit: HISTORY_PAGE_SIZE, ...(before ? { before } : {}) },
    });
    return res.data;
  },

  getConversations: async (): Promise<ConversationSummary[]> => {
    const res = await api.get('/messaging/dm/conversations');
    return res.data;
  },

  markRead: async (username: string): Promise<void> => {
    await api.patch(`/messaging/dm/${encodeURIComponent(username)}/read`);
  },

  /** Sets or switches my reaction; resolves to the updated message. */
  react: async (channel: ChatChannel, id: number, emoji: string): Promise<ChatMessageResponse> => {
    const res = await api.put(`${messageUrl(channel, id)}/reaction`, { emoji });
    return res.data;
  },

  /** Removes my reaction; resolves to the updated message. */
  unreact: async (channel: ChatChannel, id: number): Promise<ChatMessageResponse> => {
    const res = await api.delete(`${messageUrl(channel, id)}/reaction`);
    return res.data;
  },

  /** Deletes one of my own messages; resolves to its placeholder. */
  deleteMessage: async (channel: ChatChannel, id: number): Promise<ChatMessageResponse> => {
    const res = await api.delete(messageUrl(channel, id));
    return res.data;
  },

  /**
   * Uploads a JPEG for chat (POST /messaging/media) and resolves to its mediaId. `onProgress` gets
   * the fraction sent, 0 to 1. Rejects with the axios error (413 too big, 429 too many, ...).
   */
  uploadPhoto: async (
    uri: string,
    onProgress?: (fraction: number) => void,
    signal?: AbortSignal,
  ): Promise<UploadedPhoto> => {
    const form = new FormData();
    // React Native reads the file from the URI itself
    form.append('file', { uri, name: 'photo.jpg', type: 'image/jpeg' } as unknown as Blob);
    const res = await api.post('/messaging/media', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: PHOTO_UPLOAD_TIMEOUT_MS,
      signal,
      onUploadProgress: (event) => {
        if (onProgress && event.total) onProgress(Math.min(1, event.loaded / event.total));
      },
    });
    return res.data;
  },

  reportMessage: async (
    channel: ChatChannel,
    id: number,
    reason: ReportReason,
    note?: string,
  ): Promise<ChatReportResponse> => {
    const res = await api.post(`${messageUrl(channel, id)}/report`, {
      reason,
      ...(note?.trim() ? { note: note.trim() } : {}),
    });
    return res.data;
  },
};
