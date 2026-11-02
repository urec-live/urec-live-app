import type { UnreachableKind } from "@/services/backendStatus";

/**
 * What to tell members when the app can't reach the backend, and what to try next. "short" is for
 * alerts after a tap (sign-in), which show while the bar is up too.
 */
export const UNREACHABLE_COPY: Record<
  UnreachableKind,
  { title: string; stillTitle: string; steps: string; short: string }
> = {
  // No answer can also mean the server is down (on the web, even Railway's 502 page arrives like this)
  network: {
    title: "Can't reach UREC Live",
    stillTitle: "Still can't reach UREC Live",
    steps:
      "Check your Wi-Fi or mobile data, then try again. If your connection is fine, the server may be down for a moment. If it keeps happening, close and reopen the app.",
    short: "Can't reach UREC Live right now. Check your Wi-Fi or mobile data, then try again.",
  },
  server: {
    title: "UREC Live isn't responding",
    stillTitle: "UREC Live still isn't responding",
    steps:
      "Your connection works, but the server isn't answering. Try again in a minute. If it keeps happening, close and reopen the app.",
    short: "UREC Live isn't responding right now. Try again in a minute.",
  },
};

/** How long the notice stays up on its own */
export const NOTICE_VISIBLE_MS = 10_000;
/** After it goes away (on its own, closed, or turned into Connected again), failures within this long don't bring it back */
export const NOTICE_QUIET_MS = 30_000;
/** How long "Connected again" shows once requests are answered */
export const RECONNECTED_VISIBLE_MS = 3_000;
