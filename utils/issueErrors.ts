import { isAxiosError } from "axios";

import { MAX_DESCRIPTION_LENGTH, MIN_DESCRIPTION_LENGTH } from "@/constants/issues";

export interface ReportSubmitError {
  message: string;
  alreadyReported: boolean;
}

/**
 * Maps a failed POST /equipment-issues to a message for the report form.
 * Spring's default error body leaves out the message, so this keys off the status code.
 */
export function toReportSubmitError(error: unknown): ReportSubmitError {
  const status = isAxiosError(error) ? error.response?.status : undefined;
  switch (status) {
    case 400:
      return {
        message: `Please describe the problem in ${MIN_DESCRIPTION_LENGTH} to ${MAX_DESCRIPTION_LENGTH} characters.`,
        alreadyReported: false,
      };
    case 401:
      return { message: "Please sign in again to report a problem.", alreadyReported: false };
    case 404:
      return { message: "This machine couldn't be found. It may have been removed.", alreadyReported: false };
    case 409:
      return { message: "You already have an open report for this machine.", alreadyReported: true };
    default:
      return {
        message:
          isAxiosError(error) && !error.response
            ? "Can't reach the server. Check your connection and try again."
            : "Couldn't send your report. Please try again.",
        alreadyReported: false,
      };
  }
}
