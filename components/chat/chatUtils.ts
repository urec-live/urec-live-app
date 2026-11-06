import type { ChatMedia, ChatMessageResponse, MessageKind } from "@/services/messagingAPI";
import { BACKEND_ORIGIN } from "@/services/networkConfig";

/** The emoji I reacted with, if any (one per person). */
export function myReactionOf(message: ChatMessageResponse, me: string | undefined): string | undefined {
  if (!me || !message.reactions) return undefined;
  return Object.keys(message.reactions).find((emoji) => message.reactions![emoji].includes(me));
}

/** Hidden from members: deleted by the sender or removed by staff. */
export function isHidden(message: ChatMessageResponse): boolean {
  return !!message.deleted || !!message.removedByStaff;
}

export const GIF_MAX_WIDTH = 220;
export const GIF_MAX_HEIGHT = 260;
export const STICKER_SIZE = 140;

/** On-screen size for a GIF or sticker, keeping its shape (square when the size is unknown). */
export function mediaSize(media: ChatMedia | null | undefined, kind: MessageKind): { width: number; height: number } {
  if (kind === "STICKER") return { width: STICKER_SIZE, height: STICKER_SIZE };
  const w = media?.width ?? 0;
  const h = media?.height ?? 0;
  if (w <= 0 || h <= 0) return { width: GIF_MAX_WIDTH, height: GIF_MAX_WIDTH };
  let width = GIF_MAX_WIDTH;
  let height = (h / w) * width;
  if (height > GIF_MAX_HEIGHT) {
    height = GIF_MAX_HEIGHT;
    width = (w / h) * height;
  }
  return { width: Math.round(width), height: Math.round(height) };
}

export const PHOTO_MAX_WIDTH = 240;
export const PHOTO_MAX_HEIGHT = 300;

/** On-screen size for a photo, keeping its shape within 240 x 300 (a 4:3 box when the size is unknown). */
export function photoSize(media: { width?: number | null; height?: number | null } | null | undefined): {
  width: number;
  height: number;
} {
  const w = media?.width ?? 0;
  const h = media?.height ?? 0;
  if (w <= 0 || h <= 0) return { width: PHOTO_MAX_WIDTH, height: Math.round((PHOTO_MAX_WIDTH * 3) / 4) };
  const scale = Math.min(PHOTO_MAX_WIDTH / w, PHOTO_MAX_HEIGHT / h);
  return { width: Math.round(w * scale), height: Math.round(h * scale) };
}

/**
 * The server can send backend-relative photo URLs ("/api/...", when it keeps photos on its own disk);
 * those are resolved against the backend. Anything else (R2, KLIPY, local file URIs) is used as is.
 */
export function resolveMediaUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  return url.startsWith("/") ? `${BACKEND_ORIGIN}${url}` : url;
}

/** expo-image's cache key for a photo, so a fresh URL for the same photo isn't downloaded again. */
export function photoCacheKey(mediaId: number | null | undefined): string | undefined {
  return mediaId ? `chat-media-${mediaId}` : undefined;
}
