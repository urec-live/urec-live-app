import AsyncStorage from "@react-native-async-storage/async-storage";
import axios, { AxiosError, AxiosHeaders, CanceledError, InternalAxiosRequestConfig } from "axios";

import api, { setAuthFailureHandler } from "@/services/authAPI";
import {
  getBackendStatus,
  noteRequestAnswered,
  noteRequestError,
  resetBackendStatus,
  subscribeBackendStatus,
  unreachableKind,
} from "@/services/backendStatus";

jest.mock("@react-native-async-storage/async-storage", () =>
  jest.requireActual("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

const config = (): InternalAxiosRequestConfig => ({ headers: new AxiosHeaders() });

const networkError = () => new AxiosError("Network Error", "ERR_NETWORK", config());
const timeout = () => new AxiosError("timeout of 10000ms exceeded", "ECONNABORTED", config());
const answered = (status: number) =>
  new AxiosError(`Request failed with status code ${status}`, "ERR_BAD_RESPONSE", config(), null, {
    status,
    statusText: "",
    data: {},
    headers: {},
    config: config(),
  });

beforeEach(() => {
  resetBackendStatus();
});

describe("unreachableKind", () => {
  it("counts no answer at all, including a timeout, as a network problem", () => {
    expect(unreachableKind(networkError())).toBe("network");
    expect(unreachableKind(timeout())).toBe("network");
  });

  it.each([502, 503, 504])("counts a %i from the host as the server being down", (status) => {
    expect(unreachableKind(answered(status))).toBe("server");
  });

  it.each([400, 401, 403, 404, 409, 500])("counts a %i as an answer", (status) => {
    expect(unreachableKind(answered(status))).toBeNull();
  });

  it("ignores cancelled requests and errors that aren't from a request", () => {
    expect(unreachableKind(new CanceledError())).toBeNull();
    expect(unreachableKind(new Error("boom"))).toBeNull();
    expect(unreachableKind(undefined)).toBeNull();
  });
});

describe("backend status", () => {
  it("records an outage, with its kind and time, and clears it once a request is answered", () => {
    jest.spyOn(Date, "now").mockReturnValue(1_000);
    noteRequestError(networkError());
    expect(getBackendStatus()).toEqual({ unreachable: "network", failedAt: 1_000 });

    noteRequestError(answered(503));
    expect(getBackendStatus().unreachable).toBe("server");

    noteRequestAnswered();
    expect(getBackendStatus().unreachable).toBeNull();
    jest.restoreAllMocks();
  });

  it("counts an error answer from the server as reachable", () => {
    noteRequestError(networkError());
    noteRequestError(answered(404));

    expect(getBackendStatus().unreachable).toBeNull();
  });

  it("leaves the status alone for a cancelled request", () => {
    noteRequestError(networkError());
    noteRequestError(new CanceledError());

    expect(getBackendStatus().unreachable).toBe("network");
  });

  it("tells listeners about changes, but not about answers while all is well", () => {
    const listener = jest.fn();
    const unsubscribe = subscribeBackendStatus(listener);

    noteRequestAnswered();
    expect(listener).not.toHaveBeenCalled();

    noteRequestError(networkError());
    noteRequestAnswered();
    expect(listener).toHaveBeenCalledTimes(2);

    unsubscribe();
    noteRequestError(networkError());
    expect(listener).toHaveBeenCalledTimes(2);
  });
});

/** The shared client every service uses reports to the status, through its response interceptor */
describe("the shared API client", () => {
  const originalAdapter = api.defaults.adapter;
  const originalBareAdapter = axios.defaults.adapter;
  afterEach(async () => {
    api.defaults.adapter = originalAdapter;
    axios.defaults.adapter = originalBareAdapter;
    setAuthFailureHandler(() => {});
    await AsyncStorage.clear();
  });

  const respondWith = (outcome: (config: InternalAxiosRequestConfig) => Promise<never> | object) => {
    api.defaults.adapter = async (requestConfig) => {
      const result = outcome(requestConfig);
      return result instanceof Promise ? result : { status: 200, statusText: "OK", headers: {}, config: requestConfig, data: result };
    };
  };

  it("reports a request that gets no answer", async () => {
    respondWith((requestConfig) => Promise.reject(new AxiosError("Network Error", "ERR_NETWORK", requestConfig)));

    await expect(api.get("/machines")).rejects.toThrow("Network Error");

    expect(getBackendStatus().unreachable).toBe("network");
  });

  it("reports the host saying the backend is down", async () => {
    respondWith((requestConfig) =>
      Promise.reject(
        new AxiosError("Request failed with status code 502", "ERR_BAD_RESPONSE", requestConfig, null, {
          status: 502,
          statusText: "Bad Gateway",
          data: "Application failed to respond",
          headers: {},
          config: requestConfig,
        }),
      ),
    );

    await expect(api.get("/machines")).rejects.toThrow();

    expect(getBackendStatus().unreachable).toBe("server");
  });

  it("clears the outage on the next answer", async () => {
    noteRequestError(networkError());
    respondWith(() => ({ ok: true }));

    await api.get("/auth/test");

    expect(getBackendStatus().unreachable).toBeNull();
  });

  it("ignores a slow request failing after a newer one was answered", async () => {
    let timeOut!: () => void;
    api.defaults.adapter = (requestConfig) =>
      requestConfig.url === "/slow"
        ? new Promise((_resolve, reject) => {
            timeOut = () => reject(new AxiosError("timeout of 10000ms exceeded", "ECONNABORTED", requestConfig));
          })
        : Promise.resolve({ status: 200, statusText: "OK", headers: {}, config: requestConfig, data: {} });
    const now = jest.spyOn(Date, "now");
    now.mockReturnValue(1_000);
    const slow = api.get("/slow");
    await new Promise(setImmediate); // let it reach the adapter
    now.mockReturnValue(2_000);
    await api.get("/fast");

    now.mockReturnValue(11_000);
    timeOut();
    await expect(slow).rejects.toThrow("timeout");

    expect(getBackendStatus().unreachable).toBeNull();
    now.mockRestore();
  });

  it("still reports failures after the phone's clock is set back", async () => {
    respondWith(() => ({ ok: true }));
    const now = jest.spyOn(Date, "now").mockReturnValue(10_000_000);
    await api.get("/fast");

    now.mockReturnValue(10_000_000 - 3_600_000); // an hour back
    respondWith((requestConfig) => Promise.reject(new AxiosError("Network Error", "ERR_NETWORK", requestConfig)));
    await expect(api.get("/machines")).rejects.toThrow("Network Error");

    expect(getBackendStatus().unreachable).toBe("network");
    now.mockRestore();
  });

  /** A 401 refreshes the token with a bare axios call, which these interceptors don't see */
  describe("token refresh", () => {
    const unauthorized = (requestConfig: InternalAxiosRequestConfig) =>
      Promise.reject(
        new AxiosError("Request failed with status code 401", "ERR_BAD_REQUEST", requestConfig, null, {
          status: 401,
          statusText: "",
          data: {},
          headers: {},
          config: requestConfig,
        }),
      );

    beforeEach(async () => {
      await AsyncStorage.multiSet([
        ["accessToken", "old"],
        ["refreshToken", "refresh"],
        ["user", JSON.stringify({ username: "sam" })],
      ]);
    });

    it("keeps the member signed in, and shows the notice, when the refresh can't reach the server", async () => {
      const signedOut = jest.fn();
      setAuthFailureHandler(signedOut);
      respondWith(unauthorized);
      axios.defaults.adapter = (requestConfig) =>
        Promise.reject(new AxiosError("Network Error", "ERR_NETWORK", requestConfig));

      await expect(api.get("/sessions/me")).rejects.toThrow("Network Error");

      expect(getBackendStatus().unreachable).toBe("network");
      expect(signedOut).not.toHaveBeenCalled();
      expect(await AsyncStorage.getItem("refreshToken")).toBe("refresh");
    });

    it("gives the refresh the same 10 s timeout as other requests", async () => {
      respondWith(unauthorized);
      let refreshTimeout: number | undefined;
      axios.defaults.adapter = (requestConfig) => {
        refreshTimeout = requestConfig.timeout;
        return Promise.reject(new AxiosError("Network Error", "ERR_NETWORK", requestConfig));
      };

      await expect(api.get("/sessions/me")).rejects.toThrow();

      expect(refreshTimeout).toBe(10_000);
    });

    it("ignores a refresh failing after a newer request was answered, and keeps the member signed in", async () => {
      const signedOut = jest.fn();
      setAuthFailureHandler(signedOut);
      api.defaults.adapter = (requestConfig) =>
        requestConfig.url === "/sessions/me"
          ? unauthorized(requestConfig)
          : Promise.resolve({ status: 200, statusText: "OK", headers: {}, config: requestConfig, data: {} });
      let failRefresh!: () => void;
      axios.defaults.adapter = (requestConfig) =>
        new Promise((_resolve, reject) => {
          failRefresh = () => reject(new AxiosError("Network Error", "ERR_NETWORK", requestConfig));
        });

      const expired = api.get("/sessions/me");
      while (!failRefresh) await new Promise(setImmediate); // the refresh is under way
      await api.get("/help-requests/me"); // a poll gets through meanwhile
      failRefresh();

      await expect(expired).rejects.toThrow("Network Error");
      expect(getBackendStatus().unreachable).toBeNull();
      expect(signedOut).not.toHaveBeenCalled();
    });

    it("still signs the member out when the server refuses the refresh", async () => {
      const signedOut = jest.fn();
      setAuthFailureHandler(signedOut);
      respondWith(unauthorized);
      axios.defaults.adapter = unauthorized;

      await expect(api.get("/sessions/me")).rejects.toThrow();

      expect(signedOut).toHaveBeenCalledTimes(1);
      expect(await AsyncStorage.getItem("refreshToken")).toBeNull();
      expect(getBackendStatus().unreachable).toBeNull();
    });
  });
});
