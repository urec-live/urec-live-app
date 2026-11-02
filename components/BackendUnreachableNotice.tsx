import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  NOTICE_QUIET_MS,
  NOTICE_VISIBLE_MS,
  RECONNECTED_VISIBLE_MS,
  UNREACHABLE_COPY,
} from "@/constants/backendStatus";
import { authAPI } from "@/services/authAPI";
import {
  getBackendStatus,
  noteRequestAnswered,
  noteRequestError,
  subscribeBackendStatus,
  UnreachableKind,
} from "@/services/backendStatus";

type Phase =
  | { kind: "hidden" }
  /** shownAt changes only for a new showing or a failed Try again, which get the full time on screen */
  | { kind: "down"; reason: UnreachableKind; stillDown: boolean; shownAt: number }
  | { kind: "reconnected"; at: number };

const HIDDEN: Phase = { kind: "hidden" };

const isQuiet = (failedAt: number, quietSince: number | null) =>
  quietSince !== null && failedAt >= quietSince && failedAt - quietSince < NOTICE_QUIET_MS;

/**
 * A bar above every screen (sign-in included) when requests can't reach the backend, with what to
 * try next. It goes away on its own after a few seconds, and if requests start getting answers
 * while it's up, it says "Connected again" before going. Once it has been up, more failures don't
 * bring it back for a while, so a patchy connection doesn't make it flicker.
 */
export default function BackendUnreachableNotice() {
  // The server snapshot is the same: the web build pre-renders with nothing failing yet
  const status = useSyncExternalStore(subscribeBackendStatus, getBackendStatus, getBackendStatus);
  const [phase, setPhase] = useState<Phase>(HIDDEN);
  const [checking, setChecking] = useState(false);
  // When the grey bar last went away, however it went: failures in the next 30 s stay quiet.
  // A failure stamped before it (the phone's clock was set back) ends the quiet time.
  const quietSince = useRef<number | null>(null);
  // Bumped by each Try again and whenever the grey bar goes, so a check still running no longer moves it
  const attempt = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };

  const leaveDown = useCallback((next: Phase) => {
    attempt.current++;
    setChecking(false);
    quietSince.current = Date.now();
    setPhase(next);
  }, []);

  useEffect(() => {
    const reason = status.unreachable;
    if (!reason) {
      if (phase.kind === "down") leaveDown({ kind: "reconnected", at: Date.now() });
      return;
    }
    if (phase.kind === "down") {
      if (phase.reason !== reason) setPhase({ ...phase, reason });
    } else if (phase.kind === "reconnected") {
      // Requests are failing again, so it isn't connected after all; stay quiet for now
      setPhase(HIDDEN);
    } else if (!isQuiet(status.failedAt, quietSince.current)) {
      setPhase({ kind: "down", reason, stillDown: false, shownAt: status.failedAt });
    }
    // Only a new status should move the bar; the phase is read at that moment
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  // Paused while Try again is checking, so the bar can't vanish under "Checking…"
  const timerKey =
    phase.kind === "down" ? `down:${phase.shownAt}` : phase.kind === "reconnected" ? `up:${phase.at}` : "hidden";
  useEffect(() => {
    clearTimer();
    if (phase.kind === "hidden" || checking) return;
    timer.current =
      phase.kind === "down"
        ? setTimeout(() => leaveDown(HIDDEN), NOTICE_VISIBLE_MS)
        : setTimeout(() => setPhase(HIDDEN), RECONNECTED_VISIBLE_MS);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timerKey, checking, leaveDown]);

  useEffect(() => clearTimer, []);

  const dismiss = () => leaveDown(HIDDEN);

  const tryAgain = async () => {
    const thisAttempt = ++attempt.current;
    setChecking(true);
    try {
      await authAPI.test();
      noteRequestAnswered();
    } catch (error) {
      noteRequestError(error);
      const reason = getBackendStatus().unreachable;
      if (reason && thisAttempt === attempt.current) {
        setPhase({ kind: "down", reason, stillDown: true, shownAt: Date.now() });
      }
    } finally {
      if (thisAttempt === attempt.current) setChecking(false);
    }
  };

  if (phase.kind === "hidden") return null;

  if (phase.kind === "reconnected") {
    return (
      <View
        style={[styles.banner, styles.reconnected]}
        accessibilityRole="alert"
        accessibilityLiveRegion="polite"
        testID="backend-notice"
      >
        <MaterialCommunityIcons name="check-circle-outline" size={20} color="#fff" />
        <Text style={styles.title}>Connected again</Text>
      </View>
    );
  }

  const copy = UNREACHABLE_COPY[phase.reason];
  return (
    <View
      style={[styles.banner, styles.down]}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      testID="backend-notice"
    >
      <MaterialCommunityIcons
        name={phase.reason === "network" ? "wifi-off" : "server-off"}
        size={20}
        color="#FFCA28"
        style={styles.icon}
      />
      <View style={styles.body}>
        <Text style={styles.title}>{phase.stillDown ? copy.stillTitle : copy.title}</Text>
        <Text style={styles.steps}>{copy.steps}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: checking }}
          style={[styles.button, checking && styles.buttonDisabled]}
          onPress={tryAgain}
          disabled={checking}
        >
          <Text style={styles.buttonText}>{checking ? "Checking…" : "Try again"}</Text>
        </Pressable>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel="Dismiss" onPress={dismiss} hitSlop={10}>
        <MaterialCommunityIcons name="close" size={18} color="#fff" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  down: { alignItems: "flex-start", backgroundColor: "#37474F" },
  reconnected: { backgroundColor: "#2E7D32" },
  icon: { marginTop: 1 },
  body: { flex: 1, gap: 4 },
  title: { color: "#fff", fontWeight: "800", fontSize: 14 },
  steps: { color: "#ECEFF1", fontSize: 13, lineHeight: 18 },
  button: {
    alignSelf: "flex-start",
    marginTop: 4,
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: "#FFCA28",
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: "#263238", fontWeight: "800", fontSize: 13 },
});
