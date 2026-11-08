import type { ChatMedia, ChatMessageResponse, MessageKind } from "@/services/messagingAPI";

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
