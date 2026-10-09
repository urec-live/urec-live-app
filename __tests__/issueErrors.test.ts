import { AxiosError, AxiosHeaders } from "axios";

import { toReportSubmitError, toWithdrawErrorMessage } from "@/utils/issueErrors";

function httpError(status: number): AxiosError {
  return new AxiosError("Request failed", "ERR_BAD_REQUEST", undefined, undefined, {
    status,
    statusText: "",
    headers: {},
    config: { headers: new AxiosHeaders() },
    data: "",
  });
}

describe("toReportSubmitError", () => {
  it.each([
    [400, "Please describe the problem in 10 to 1000 characters."],
    [401, "Please sign in again to report a problem."],
    [404, "This machine couldn't be found. It may have been removed."],
    [500, "Couldn't send your report. Please try again."],
  ])("maps HTTP %i to a friendly message", (status, message) => {
    expect(toReportSubmitError(httpError(status))).toEqual({ message, alreadyReported: false });
  });

  it("flags a duplicate report (409) so the form can link to My Reports", () => {
    expect(toReportSubmitError(httpError(409))).toEqual({
      message: "You already have an open report for this machine.",
      alreadyReported: true,
    });
  });

  it("explains when the server can't be reached", () => {
    const networkError = new AxiosError("Network Error", "ERR_NETWORK");
    expect(toReportSubmitError(networkError).message).toBe(
      "Can't reach the server. Check your connection and try again."
    );
  });

  it("falls back to a generic message for non-HTTP errors", () => {
    expect(toReportSubmitError(new Error("boom"))).toEqual({
      message: "Couldn't send your report. Please try again.",
      alreadyReported: false,
    });
  });
});

describe("toWithdrawErrorMessage", () => {
  it.each([
    [401, "Please sign in again to withdraw this report."],
    [404, "This report couldn't be found."],
    [409, "This report is already closed."],
    [500, "Couldn't withdraw your report. Please try again."],
  ])("maps HTTP %i to a friendly message", (status, message) => {
    expect(toWithdrawErrorMessage(httpError(status))).toBe(message);
  });

  it("explains when the server can't be reached", () => {
    expect(toWithdrawErrorMessage(new AxiosError("Network Error", "ERR_NETWORK"))).toBe(
      "Can't reach the server. Check your connection and try again."
    );
  });

  it("falls back to a generic message for non-HTTP errors", () => {
    expect(toWithdrawErrorMessage(new Error("boom"))).toBe("Couldn't withdraw your report. Please try again.");
  });
});
