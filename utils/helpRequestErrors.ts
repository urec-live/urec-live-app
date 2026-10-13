import { isAxiosError } from "axios";

export type HelpAction = "call" | "received" | "cancel";

export interface HelpRequestError {
  message: string;
  /** The member already has an open request (409 when calling staff). */
  alreadyOpen: boolean;
  /** The request was closed in the meantime, e.g. staff clicked "Done helping" (409 when closing). */
  alreadyClosed: boolean;
}

const FALLBACK: Record<HelpAction, string> = {
  call: "Couldn't call staff right now. Please try again.",
  received: "Couldn't confirm right now. Please try again.",
  cancel: "Couldn't cancel right now. Please try again.",
};

/**
 * Maps a failed help-request call to a message. Keys off the status code because the server's
 * error body never includes its reason text.
 */
export function toHelpRequestError(error: unknown, action: HelpAction): HelpRequestError {
  const result = (message: string, extra: Partial<HelpRequestError> = {}): HelpRequestError => ({
    message,
    alreadyOpen: false,
    alreadyClosed: false,
    ...extra,
  });

  if (!isAxiosError(error)) return result(FALLBACK[action]);
  if (!error.response) return result("Can't reach the server. Check your connection and try again.");

  switch (error.response.status) {
    case 401:
      return result("Your session has expired. Please sign in again.");
    case 404:
      return result(action === "call" ? "This machine couldn't be found." : "This help request couldn't be found.");
    case 409:
      return action === "call"
        ? result("You already have an open help request.", { alreadyOpen: true })
        : result("This request was already closed.", { alreadyClosed: true });
    default:
      return result(FALLBACK[action]);
  }
}
