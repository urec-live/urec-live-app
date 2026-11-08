import api from './authAPI';

/** What the chat picker browses. */
export type MediaCategory = 'gifs' | 'stickers';

export interface MediaItem {
  /** KLIPY's id for the item, sent back as media.providerId. */
  id: string;
  /** The rendition to send and show in chat. */
  url: string;
  /** A smaller rendition for the picker grid. */
  previewUrl: string;
  width?: number | null;
  height?: number | null;
}

export interface MediaPage {
  items: MediaItem[];
  /** The page to ask for next, or null when there's no more. */
  nextPage: number | null;
}

/**
 * GIF and sticker search through the backend, which holds the KLIPY key and applies the content
 * rating. Answers 503 when the server has no key yet.
 */
export const klipyAPI = {
  trending: async (category: MediaCategory, page = 1): Promise<MediaPage> => {
    const res = await api.get(`/media/${category}/trending`, { params: { page } });
    return res.data;
  },

  search: async (category: MediaCategory, query: string, page = 1): Promise<MediaPage> => {
    const res = await api.get(`/media/${category}/search`, { params: { q: query, page } });
    return res.data;
  },
};
