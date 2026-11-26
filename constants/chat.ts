// Mirrors the backend's chat validation (SendChatMessageRequest, MessageReaction, ChatMessageReport)
export const MESSAGE_MAX_LENGTH = 500;
export const REPORT_NOTE_MAX_LENGTH = 300;

/** The long-press reaction bar, in order. The server accepts only these. */
export const QUICK_REACTIONS = ["👍", "❤️", "😂", "🔥", "💪", "😮"] as const;

/** Messages per history page; a shorter page means there's nothing older. */
export const HISTORY_PAGE_SIZE = 50;

/** Photos are resized to this long edge and saved as JPEG at this quality before upload. */
export const PHOTO_MAX_EDGE = 1600;
export const PHOTO_JPEG_QUALITY = 0.75;
/** Uploads get longer than ordinary requests (10 s) on a slow connection. */
export const PHOTO_UPLOAD_TIMEOUT_MS = 60000;
