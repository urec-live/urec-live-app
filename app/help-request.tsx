import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { closedMessage, HELP_STATUS_DISPLAY } from "@/constants/helpRequests";
import { useHelpRequest } from "@/contexts/HelpRequestContext";
import { HelpRequest, isOpenHelpRequest } from "@/services/helpRequestAPI";
import { confirmAsync } from "@/utils/confirm";
import { demoPlayerHref } from "@/utils/demoPlayer";
import { toHelpRequestError } from "@/utils/helpRequestErrors";

/** Request received → On the way / Too busy → Helped */
function Steps({ request }: { request: HelpRequest }) {
  const staffStep =
    request.status === "ON_THE_WAY" || request.status === "TOO_BUSY"
      ? HELP_STATUS_DISPLAY[request.status]
      : null;
  const helped = request.status === "RESOLVED";
  const steps = [
    { key: "received", label: "Request received", done: true, color: HELP_STATUS_DISPLAY.REQUEST_RECEIVED.color },
    {
      key: "staff",
      label: staffStep ? staffStep.label : "Waiting for staff",
      done: staffStep !== null || helped,
      color: staffStep ? staffStep.color : "#9E9E9E",
    },
    { key: "helped", label: "Helped", done: helped, color: HELP_STATUS_DISPLAY.RESOLVED.color },
  ];
  return (
    <View style={styles.steps}>
      {steps.map((step) => (
        <View key={step.key} style={styles.step} testID={`step-${step.key}`}>
          <View style={[styles.stepDot, { backgroundColor: step.done ? step.color : "#E0E0E0" }]} />
          <Text style={[styles.stepLabel, step.done && { color: step.color, fontWeight: "800" }]}>{step.label}</Text>
        </View>
      ))}
    </View>
  );
}

export default function HelpRequestScreen() {
  const router = useRouter();
  const { activeRequest, lastClosed, confirmReceived, cancel, dismissClosed } = useHelpRequest();
  // A request this member just closed here, so the screen can say thanks before they leave
  const [finished, setFinished] = useState<HelpRequest | null>(null);
  const [busy, setBusy] = useState<"received" | "cancel" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const request = activeRequest ?? finished ?? lastClosed;

  const goBack = () => {
    if (lastClosed) dismissClosed();
    if (router.canGoBack()) router.back();
    else router.replace("/(tabs)");
  };

  const closeRequest = async (kind: "received" | "cancel") => {
    const confirmed = await confirmAsync(
      kind === "received"
        ? {
            title: "Are you sure?",
            message: "This tells staff you no longer need help and closes your request.",
            confirmText: "Yes, I got help",
            cancelText: "Not yet",
          }
        : {
            title: "Cancel your help request?",
            message: "Staff will no longer come over for this request.",
            confirmText: "Cancel request",
            cancelText: "Keep waiting",
            destructive: true,
          },
    );
    if (!confirmed) return;

    setBusy(kind);
    setError(null);
    try {
      const closed = kind === "received" ? await confirmReceived() : await cancel();
      if (closed) setFinished(closed);
    } catch (e) {
      setError(toHelpRequestError(e, kind).message);
    } finally {
      setBusy(null);
    }
  };

  if (!request) {
    return (
      <View style={[styles.container, styles.centered]}>
        <MaterialCommunityIcons name="face-agent" size={48} color="#9E9E9E" />
        <Text style={styles.emptyTitle}>No open help request</Text>
        <Text style={styles.emptyText}>{"Open a machine's page and tap Call staff if you need a hand."}</Text>
        <Pressable accessibilityRole="button" style={styles.primaryButton} onPress={goBack}>
          <Text style={styles.primaryButtonText}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  const open = isOpenHelpRequest(request);
  const display = HELP_STATUS_DISPLAY[request.status];

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      <Pressable accessibilityRole="button" onPress={goBack} style={styles.backButton}>
        <Text style={styles.backText}>← Back</Text>
      </Pressable>

      <Text style={styles.title}>{open ? "Help is on its way" : "Help request"}</Text>
      <Text style={styles.subtitle}>
        {request.equipmentName}
        {request.equipmentCode ? ` · ${request.equipmentCode}` : ""}
      </Text>

      <Steps request={request} />

      <View
        style={[styles.statusCard, { borderColor: display.color }]}
        accessibilityRole="summary"
        testID="help-status"
      >
        <MaterialCommunityIcons name={display.icon} size={28} color={display.color} />
        <View style={styles.statusTextWrap}>
          <Text style={[styles.statusLabel, { color: display.color }]}>{display.label}</Text>
          <Text style={styles.statusMessage}>{open ? display.message : closedMessage(request)}</Text>
        </View>
      </View>

      {request.demos.length > 0 && (
        <View style={styles.demos}>
          <Text style={styles.sectionTitle}>{open ? "While you wait, watch how it's done" : "Watch how it's done"}</Text>
          {request.demos.map((demo) => (
            <View key={demo.exerciseName} style={styles.demoRow}>
              {demo.videoUrl && (
                <Pressable
                  accessibilityRole="link"
                  accessibilityLabel={`Watch a how-to video for ${demo.exerciseName}`}
                  style={styles.demoLink}
                  onPress={() => router.push(demoPlayerHref(demo, "video"))}
                >
                  <MaterialCommunityIcons name="play-circle-outline" size={22} color="#D32F2F" />
                  <Text style={styles.demoText}>{demo.exerciseName}: how-to video</Text>
                </Pressable>
              )}
              {demo.gifUrl && (
                <Pressable
                  accessibilityRole="link"
                  accessibilityLabel={`Open the GIF demo for ${demo.exerciseName}`}
                  style={styles.demoLink}
                  onPress={() => router.push(demoPlayerHref(demo, "gif"))}
                >
                  <MaterialCommunityIcons name="file-gif-box" size={22} color="#1976D2" />
                  <Text style={styles.demoText}>{demo.exerciseName}: GIF demo</Text>
                </Pressable>
              )}
            </View>
          ))}
          {request.demos.some((demo) => demo.videoPlaceholder || demo.gifPlaceholder) && (
            <Text style={styles.demoNote}>These are placeholder clips for now. Real demos are coming soon.</Text>
          )}
        </View>
      )}

      {error && (
        <View style={styles.errorBox} accessibilityRole="alert">
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {open ? (
        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: busy !== null }}
            disabled={busy !== null}
            style={[styles.primaryButton, busy !== null && styles.disabled]}
            onPress={() => closeRequest("received")}
          >
            {busy === "received" ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryButtonText}>I received help</Text>
            )}
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: busy !== null }}
            disabled={busy !== null}
            style={[styles.secondaryButton, busy !== null && styles.disabled]}
            onPress={() => closeRequest("cancel")}
          >
            {busy === "cancel" ? (
              <ActivityIndicator color="#D32F2F" />
            ) : (
              <Text style={styles.secondaryButtonText}>Cancel request</Text>
            )}
          </Pressable>
        </View>
      ) : (
        <View style={styles.actions}>
          <Pressable accessibilityRole="button" style={styles.primaryButton} onPress={goBack}>
            <Text style={styles.primaryButtonText}>Done</Text>
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f5f5f5" },
  container: { flexGrow: 1, backgroundColor: "#f5f5f5", padding: 25, paddingBottom: 40 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  backButton: { marginBottom: 20 },
  backText: { color: "#4CAF50", fontWeight: "700", fontSize: 16 },
  title: { color: "#1a1a1a", fontSize: 26, fontWeight: "900", textAlign: "center" },
  subtitle: { color: "#666", fontSize: 15, textAlign: "center", marginTop: 4, marginBottom: 20 },
  steps: { flexDirection: "row", justifyContent: "space-between", marginBottom: 20 },
  step: { flex: 1, alignItems: "center", gap: 6 },
  stepDot: { width: 14, height: 14, borderRadius: 7 },
  stepLabel: { fontSize: 12, color: "#9E9E9E", textAlign: "center" },
  statusCard: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 2,
    padding: 16,
    marginBottom: 20,
  },
  statusTextWrap: { flex: 1 },
  statusLabel: { fontSize: 18, fontWeight: "900", marginBottom: 4 },
  statusMessage: { fontSize: 14, color: "#333", lineHeight: 20 },
  demos: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  sectionTitle: { fontSize: 12, fontWeight: "700", color: "#666", textTransform: "uppercase", marginBottom: 8 },
  demoRow: { gap: 4 },
  demoLink: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 8 },
  demoText: { fontSize: 15, color: "#1a1a1a", fontWeight: "600", textDecorationLine: "underline" },
  demoNote: { fontSize: 13, color: "#666", marginTop: 4 },
  errorBox: {
    backgroundColor: "#FDECEA",
    borderColor: "#F5C2C0",
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  errorText: { color: "#B71C1C", fontSize: 14 },
  actions: { alignItems: "center", gap: 12 },
  primaryButton: {
    backgroundColor: "#4CAF50",
    borderRadius: 30,
    paddingVertical: 14,
    paddingHorizontal: 30,
    minWidth: "70%",
    alignItems: "center",
  },
  primaryButtonText: { color: "#fff", fontWeight: "800", fontSize: 16 },
  secondaryButton: {
    backgroundColor: "#fff",
    borderRadius: 30,
    paddingVertical: 12,
    paddingHorizontal: 30,
    minWidth: "70%",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#F5C2C0",
  },
  secondaryButtonText: { color: "#D32F2F", fontWeight: "700", fontSize: 15 },
  disabled: { opacity: 0.5 },
  emptyTitle: { fontSize: 20, fontWeight: "800", color: "#1a1a1a", marginTop: 12 },
  emptyText: { fontSize: 14, color: "#666", textAlign: "center", marginVertical: 12 },
});
