import { isAxiosError, isCancel } from "axios";

/**
 * Whether the app can reach the backend right now, judged from the requests it already makes (no
 * extra pings). The shared client in authAPI.ts reports every answer and failure here, and
 * BackendUnreachableNotice in the root layout shows the result.
 */

/**
 * "network": no answer at all, e.g. no Wi-Fi or data, the server is down, or the 10 s timeout.
 * "server": the host answered that the backend behind it isn't (502/503/504 from Railway's proxy).
 */
export type UnreachableKind = "network" | "server";

export interface BackendStatus {
  /** Why requests are failing, or null while they're being answered */
  unreachable: UnreachableKind | null;
  /** When the latest failing request ended, so a new failure can be told apart from an old one */
  failedAt: number;
}

const GATEWAY_STATUSES = new Set([502, 503, 504]);

/** Whether a failed request means the backend can't be reached, and how. Any other answer means it can. */
export function unreachableKind(error: unknown): UnreachableKind | null {
  if (isCancel(error) || !isAxiosError(error)) return null;
  if (!error.response) return "network";
  return GATEWAY_STATUSES.has(error.response.status) ? "server" : null;
}

const ANSWERED: BackendStatus = { unreachable: null, failedAt: 0 };

let status = ANSWERED;
const listeners = new Set<() => void>();
// Requests are numbered as they start (keyed by their config). A counter rather than the clock,
// so changing the phone's time can't make failures look old.
const startedAs = new WeakMap<object, number>();
let requestsStarted = 0;
// How many requests had started when the latest answer came in
let startedBeforeLastAnswer = 0;

function setStatus(next: BackendStatus): void {
  status = next;
  listeners.forEach((listener) => listener());
}

export function getBackendStatus(): BackendStatus {
  return status;
}

export function subscribeBackendStatus(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * A request is about to be sent. Returns its number, for a request whose config axios copies
 * (the bare token refresh), so its failure can be passed in with noteRequestError(error, number).
 */
export function noteRequestStarted(config?: object): number {
  requestsStarted++;
  if (config) startedAs.set(config, requestsStarted);
  return requestsStarted;
}

/** The backend answered a request, whatever the status code. */
export function noteRequestAnswered(): void {
  startedBeforeLastAnswer = requestsStarted;
  if (status.unreachable !== null) setStatus({ unreachable: null, failedAt: status.failedAt });
}

/** A request failed: records an outage if the backend couldn't be reached, otherwise counts it as answered. */
export function noteRequestError(error: unknown, requestNumber?: number): void {
  const kind = unreachableKind(error);
  if (kind) {
    // A slow request that started before a newer answer (e.g. a timed-out poll) says nothing about now
    const started =
      requestNumber ?? (isAxiosError(error) && error.config ? startedAs.get(error.config) : undefined);
    if (started !== undefined && started <= startedBeforeLastAnswer) return;
    setStatus({ unreachable: kind, failedAt: Date.now() });
  } else if (isAxiosError(error) && error.response) {
    noteRequestAnswered();
  }
}

/** Back to "answered", for tests. */
export function resetBackendStatus(): void {
  startedBeforeLastAnswer = requestsStarted;
  setStatus(ANSWERED);
}
