// Mirrors the backend's chat validation (SendChatMessageRequest, MessageReaction, ChatMessageReport)
export const MESSAGE_MAX_LENGTH = 500;
export const REPORT_NOTE_MAX_LENGTH = 300;

/** The long-press reaction bar, in order. The server accepts only these. */
export const QUICK_REACTIONS = ["👍", "❤️", "😂", "🔥", "💪", "😮"] as const;

/** Messages per history page; a shorter page means there's nothing older. */
export const HISTORY_PAGE_SIZE = 50;
