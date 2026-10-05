import { isAxiosError } from "axios";
import React, { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AppState, Vibration } from "react-native";

import { HELP_POLL_MS } from "@/constants/helpRequests";
import { useAuth } from "@/contexts/AuthContext";
import {
  CallStaffRequest,
  HelpRequest,
  helpRequestAPI,
  isOpenHelpRequest,
} from "@/services/helpRequestAPI";

interface HelpRequestContextValue {
  /** The member's open request, if any. */
  activeRequest: HelpRequest | null;
  /** A request staff finished (or that expired) while the member was waiting, until dismissed. */
  lastClosed: HelpRequest | null;
  /** Calls staff. Throws on failure; on 409 it first loads the request that is already open. */
  callStaff: (request: CallStaffRequest) => Promise<HelpRequest>;
  /** "Received help". Returns the closed request. */
  confirmReceived: () => Promise<HelpRequest | null>;
  cancel: () => Promise<HelpRequest | null>;
  refresh: () => Promise<void>;
  dismissClosed: () => void;
}

// Without a provider (e.g. a component rendered on its own in a test) nothing is ever open
const HelpRequestContext = createContext<HelpRequestContextValue>({
  activeRequest: null,
  lastClosed: null,
  callStaff: async () => {
    throw new Error("HelpRequestProvider is missing");
  },
  confirmReceived: async () => null,
  cancel: async () => null,
  refresh: async () => {},
  dismissClosed: () => {},
});

const STATUS_CHANGE_VIBRATION_MS = 400;

export function HelpRequestProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [activeRequest, setActiveRequest] = useState<HelpRequest | null>(null);
  const [lastClosed, setLastClosed] = useState<HelpRequest | null>(null);
  const [appActive, setAppActive] = useState(
    AppState.currentState !== "background" && AppState.currentState !== "inactive",
  );
  const activeRef = useRef<HelpRequest | null>(null);

  /** Applies the latest server copy of the member's request. */
  const apply = useCallback((latest: HelpRequest | null) => {
    const previous = activeRef.current;

    if (latest && isOpenHelpRequest(latest)) {
      if (previous?.id === latest.id && previous.status !== latest.status) {
        Vibration.vibrate(STATUS_CHANGE_VIBRATION_MS);
      }
      activeRef.current = latest;
      setActiveRequest(latest);
      return;
    }
    // Closed by staff or by expiry while the member was waiting: tell them once
    if (latest && previous?.id === latest.id && latest.closedBy !== "MEMBER") {
      Vibration.vibrate(STATUS_CHANGE_VIBRATION_MS);
      setLastClosed(latest);
    }
    activeRef.current = null;
    setActiveRequest(null);
  }, []);

  const refresh = useCallback(async () => {
    const current = activeRef.current;
    apply(current ? await helpRequestAPI.get(current.id) : await helpRequestAPI.getActive());
  }, [apply]);

  // Load the open request on sign-in (so it survives an app restart); forget everything on sign-out
  useEffect(() => {
    activeRef.current = null;
    setActiveRequest(null);
    setLastClosed(null);
    if (!user) return;
    let cancelled = false;
    helpRequestAPI
      .getActive()
      .then((request) => {
        if (!cancelled) apply(request);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [user, apply]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      const active = state === "active";
      setAppActive(active);
      if (active && activeRef.current) refresh().catch(() => {});
    });
    return () => subscription.remove();
  }, [refresh]);

  // Poll the open request for staff responses, only while the app is in the foreground
  const activeId = activeRequest?.id;
  useEffect(() => {
    if (!user || activeId === undefined || !appActive) return;
    const timer = setInterval(() => {
      helpRequestAPI
        .get(activeId)
        .then(apply)
        .catch(() => {}); // a dropped connection shouldn't stop the next check
    }, HELP_POLL_MS);
    return () => clearInterval(timer);
  }, [user, activeId, appActive, apply]);

  const callStaff = useCallback(
    async (request: CallStaffRequest) => {
      try {
        const created = await helpRequestAPI.callStaff(request);
        setLastClosed(null);
        apply(created);
        return created;
      } catch (error) {
        if (isAxiosError(error) && error.response?.status === 409) {
          await helpRequestAPI
            .getActive()
            .then(apply)
            .catch(() => {});
        }
        throw error;
      }
    },
    [apply],
  );

  const close = useCallback(
    async (action: (id: number) => Promise<HelpRequest>) => {
      const current = activeRef.current;
      if (!current) return null;
      try {
        const closed = await action(current.id);
        apply(closed);
        return closed;
      } catch (error) {
        // Staff may have closed it a moment ago: pick up the final state before reporting the error
        if (isAxiosError(error) && error.response?.status === 409) {
          await helpRequestAPI
            .get(current.id)
            .then(apply)
            .catch(() => {});
        }
        throw error;
      }
    },
    [apply],
  );

  const confirmReceived = useCallback(() => close(helpRequestAPI.confirmReceived), [close]);
  const cancel = useCallback(() => close(helpRequestAPI.cancel), [close]);
  const dismissClosed = useCallback(() => setLastClosed(null), []);

  const value = useMemo(
    () => ({ activeRequest, lastClosed, callStaff, confirmReceived, cancel, refresh, dismissClosed }),
    [activeRequest, lastClosed, callStaff, confirmReceived, cancel, refresh, dismissClosed],
  );

  return <HelpRequestContext.Provider value={value}>{children}</HelpRequestContext.Provider>;
}

export const useHelpRequest = () => useContext(HelpRequestContext);
