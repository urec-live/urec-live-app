import { AxiosError, AxiosHeaders } from "axios";

import { toHelpRequestError } from "@/utils/helpRequestErrors";

function httpError(status: number): AxiosError {
  return new AxiosError("Request failed", "ERR_BAD_REQUEST", undefined, undefined, {
    status,
    statusText: "",
    headers: {},
    config: { headers: new AxiosHeaders() },
    data: "",
  });
}

describe("toHelpRequestError", () => {
  it("explains a second request as already open", () => {
    expect(toHelpRequestError(httpError(409), "call")).toEqual({
      message: "You already have an open help request.",
      alreadyOpen: true,
      alreadyClosed: false,
    });
  });

  it.each(["received", "cancel"] as const)("explains a 409 while closing (%s) as already closed", (action) => {
    expect(toHelpRequestError(httpError(409), action)).toEqual({
      message: "This request was already closed.",
      alreadyOpen: false,
      alreadyClosed: true,
    });
  });

  it("names the machine on a 404 when calling staff, and the request otherwise", () => {
    expect(toHelpRequestError(httpError(404), "call").message).toBe("This machine couldn't be found.");
    expect(toHelpRequestError(httpError(404), "received").message).toBe("This help request couldn't be found.");
  });

  it("asks the member to sign in again on a 401", () => {
    expect(toHelpRequestError(httpError(401), "call").message).toBe("Your session has expired. Please sign in again.");
  });

  it("explains a missing connection", () => {
    expect(toHelpRequestError(new AxiosError("Network Error", "ERR_NETWORK"), "cancel").message).toBe(
      "Can't reach the server. Check your connection and try again.",
    );
  });

  it.each([
    ["call", "Couldn't call staff right now. Please try again."],
    ["received", "Couldn't confirm right now. Please try again."],
    ["cancel", "Couldn't cancel right now. Please try again."],
  ] as const)("falls back to a retry message for %s on a server error", (action, message) => {
    expect(toHelpRequestError(httpError(500), action).message).toBe(message);
    expect(toHelpRequestError(new Error("not axios"), action).message).toBe(message);
  });
});
