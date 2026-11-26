import { isAxiosError } from "axios";

const OFFLINE = "Can't reach the server. Check your connection and try again.";

function statusOf(error: unknown): number | undefined {
  return isAxiosError(error) ? error.response?.status : undefined;
}

function isOffline(error: unknown): boolean {
  return isAxiosError(error) && !error.response;
}

/**
 * Maps a failed reaction, delete or report call to a short message for the chat screen.
 * Spring's default error body leaves out the message, so this keys off the status code.
 */
export function toChatActionError(error: unknown, action: "react" | "delete" | "report"): string {
  switch (statusOf(error)) {
    case 400:
      return action === "report" ? "You can't report your own message." : "That didn't work. Please try again.";
    case 401:
      return "Please sign in again.";
    case 403:
      return "You can only delete your own messages.";
    case 404:
      return "This message isn't available any more.";
    case 409:
      if (action === "report") return "You've already reported this message, or it was removed.";
      return "This message was deleted.";
    default:
      if (isOffline(error)) return OFFLINE;
      if (action === "react") return "Couldn't add your reaction. Please try again.";
      if (action === "delete") return "Couldn't delete the message. Please try again.";
      return "Couldn't send your report. Please try again.";
  }
}

/**
 * Maps a failed photo upload to the short label shown under the bubble (before "Tap to retry").
 * The server answers 413 (over 5 MB), 415 (not a JPEG), 400 (unreadable) and 429 (too many unsent uploads).
 */
export function toPhotoUploadError(error: unknown): string {
  switch (statusOf(error)) {
    case 413:
      return "Photo too large";
    case 400:
    case 415:
      return "Couldn't read photo";
    case 429:
      return "Too many photos, wait a bit";
    case 401:
      return "Sign in again";
    case 503:
      return "Photos unavailable";
    default:
      return isOffline(error) ? "No connection" : "Upload failed";
  }
}

/** Maps a failed GIF or sticker load to a message for the picker. */
export function toMediaSearchError(error: unknown): string {
  switch (statusOf(error)) {
    case 503:
      return "GIFs aren't set up on the server yet.";
    case 429:
      return "GIF search is busy. Try again in a minute.";
    case 401:
      return "Please sign in again.";
    default:
      return isOffline(error) ? OFFLINE : "Couldn't load GIFs. Please try again.";
  }
}
