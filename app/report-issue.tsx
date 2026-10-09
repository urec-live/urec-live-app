import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import {
  MAX_DESCRIPTION_LENGTH,
  MIN_DESCRIPTION_LENGTH,
  SEVERITY_DISPLAY,
  SEVERITY_ORDER,
} from "@/constants/issues";
import { issueAPI, IssueSeverity } from "@/services/issueAPI";
import { machineAPI } from "@/services/machineAPI";
import { ReportSubmitError, toReportSubmitError } from "@/utils/issueErrors";

interface ReportTarget {
  id: number;
  name: string;
}

// Errors and success are shown inline rather than with Alert, whose buttons don't work on web
export default function ReportIssueScreen() {
  // Opened with the machine's numeric id (machine page) or its QR code (scanner, workout tracker)
  const { id, code } = useLocalSearchParams<{ id?: string; code?: string }>();
  const router = useRouter();

  const [machine, setMachine] = useState<ReportTarget | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [severity, setSeverity] = useState<IssueSeverity | null>(null);
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<ReportSubmitError | null>(null);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const found = id
          ? await machineAPI.getMachineById(Number(id))
          : code
            ? await machineAPI.getMachineByCode(code)
            : null;
        if (cancelled) return;
        if (found) setMachine({ id: found.id, name: found.name });
        else setLoadError("No machine was selected.");
      } catch {
        if (!cancelled) setLoadError("We couldn't find this machine.");
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [id, code]);

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/(tabs)");
  };

  const trimmedLength = description.trim().length;
  const canSubmit =
    machine !== null && severity !== null && trimmedLength >= MIN_DESCRIPTION_LENGTH && !submitting;

  const handleSubmit = async () => {
    if (!machine || !severity || !canSubmit) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await issueAPI.reportIssue({
        equipmentId: machine.id,
        severity,
        description: description.trim(),
      });
      setSubmitted(true);
    } catch (error) {
      setSubmitError(toReportSubmitError(error));
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <View style={styles.centered}>
        <View style={styles.successIcon}>
          <MaterialCommunityIcons name="check" size={44} color="#fff" />
        </View>
        <Text style={styles.successTitle}>Thanks, staff have been notified</Text>
        <Text style={styles.successText}>
          {"We'll update the status in My Reports as the repair moves along. Reported it by mistake? You can withdraw it there."}
        </Text>
        <Pressable style={styles.primaryButton} onPress={() => router.replace("/my-reports")}>
          <Text style={styles.primaryButtonText}>View my reports</Text>
        </Pressable>
        <Pressable style={styles.secondaryButton} onPress={goBack}>
          <Text style={styles.secondaryButtonText}>Done</Text>
        </Pressable>
      </View>
    );
  }

  if (!machine) {
    return (
      <View style={styles.centered}>
        {loadError ? (
          <>
            <Text style={styles.loadErrorText}>{loadError}</Text>
            <Pressable style={styles.primaryButton} onPress={goBack}>
              <Text style={styles.primaryButtonText}>Go back</Text>
            </Pressable>
          </>
        ) : (
          <ActivityIndicator size="large" color="#4CAF50" accessibilityLabel="Loading machine" />
        )}
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Pressable onPress={goBack} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>

        <Text style={styles.title}>Report a problem</Text>
        <View style={styles.machineRow}>
          <MaterialCommunityIcons name="dumbbell" size={18} color="#666" />
          <Text style={styles.machineName}>{machine.name}</Text>
        </View>

        <Text style={styles.sectionLabel}>{"What's wrong?"}</Text>
        {SEVERITY_ORDER.map((option) => {
          const display = SEVERITY_DISPLAY[option];
          const selected = severity === option;
          return (
            <Pressable
              key={option}
              onPress={() => setSeverity(option)}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={display.label}
              style={[
                styles.severityCard,
                selected && { borderColor: display.color, backgroundColor: display.tint },
              ]}
            >
              <View style={[styles.severityIcon, { backgroundColor: display.tint }]}>
                <MaterialCommunityIcons name={display.icon} size={24} color={display.color} />
              </View>
              <View style={styles.severityText}>
                <Text style={styles.severityLabel}>{display.label}</Text>
                <Text style={styles.severityHint}>{display.hint}</Text>
              </View>
              <MaterialCommunityIcons
                name={selected ? "radiobox-marked" : "radiobox-blank"}
                size={22}
                color={selected ? display.color : "#bbb"}
              />
            </Pressable>
          );
        })}

        <Text style={styles.sectionLabel}>Describe the problem</Text>
        <TextInput
          style={styles.input}
          value={description}
          onChangeText={setDescription}
          accessibilityLabel="Problem description"
          placeholder="e.g. The cable is loose and the weight stack doesn't move when I push"
          placeholderTextColor="#aaa"
          multiline
          maxLength={MAX_DESCRIPTION_LENGTH}
          textAlignVertical="top"
        />
        <View style={styles.inputFooter}>
          <Text style={styles.inputHint}>
            {trimmedLength < MIN_DESCRIPTION_LENGTH ? `At least ${MIN_DESCRIPTION_LENGTH} characters` : ""}
          </Text>
          <Text style={styles.inputHint}>
            {description.length} / {MAX_DESCRIPTION_LENGTH}
          </Text>
        </View>

        {submitError && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{submitError.message}</Text>
            {submitError.alreadyReported && (
              <Pressable onPress={() => router.replace("/my-reports")}>
                <Text style={styles.errorLink}>View my reports</Text>
              </Pressable>
            )}
          </View>
        )}

        <Pressable
          style={[styles.primaryButton, styles.submitButton, !canSubmit && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={!canSubmit}
          accessibilityRole="button"
          accessibilityState={{ disabled: !canSubmit }}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryButtonText}>Send report</Text>
          )}
        </Pressable>
        <Text style={styles.footnote}>
          Staff will review your report. You can follow its status in My Reports.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  content: {
    padding: 25,
    paddingBottom: 40,
  },
  centered: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    justifyContent: "center",
    alignItems: "center",
    padding: 25,
  },
  backButton: {
    marginBottom: 20,
  },
  backText: {
    color: "#4CAF50",
    fontWeight: "700",
    fontSize: 16,
  },
  title: {
    color: "#1a1a1a",
    fontSize: 28,
    fontWeight: "900",
    marginBottom: 6,
  },
  machineRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 24,
  },
  machineName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#666",
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#666",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  severityCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#e0e0e0",
    padding: 14,
    marginBottom: 12,
  },
  severityIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  severityText: {
    flex: 1,
  },
  severityLabel: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1a1a1a",
    marginBottom: 2,
  },
  severityHint: {
    fontSize: 13,
    color: "#777",
    lineHeight: 18,
  },
  input: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    padding: 14,
    minHeight: 120,
    fontSize: 15,
    color: "#1a1a1a",
    marginTop: 12,
  },
  inputFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
    marginBottom: 16,
  },
  inputHint: {
    fontSize: 12,
    color: "#999",
  },
  errorBox: {
    backgroundColor: "#FDECEA",
    borderColor: "#F5C2C0",
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: "#B71C1C",
    fontSize: 14,
  },
  errorLink: {
    color: "#B71C1C",
    fontWeight: "800",
    marginTop: 6,
    textDecorationLine: "underline",
  },
  primaryButton: {
    backgroundColor: "#4CAF50",
    borderRadius: 30,
    paddingVertical: 15,
    paddingHorizontal: 30,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    minWidth: 220,
  },
  submitButton: {
    alignSelf: "stretch",
  },
  primaryButtonText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 16,
    letterSpacing: 0.5,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  secondaryButton: {
    paddingVertical: 14,
    paddingHorizontal: 30,
    marginTop: 6,
  },
  secondaryButtonText: {
    color: "#4CAF50",
    fontWeight: "800",
    fontSize: 16,
  },
  footnote: {
    fontSize: 12,
    color: "#999",
    textAlign: "center",
    marginTop: 14,
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#4CAF50",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: "#1a1a1a",
    textAlign: "center",
    marginBottom: 8,
  },
  successText: {
    fontSize: 15,
    color: "#666",
    textAlign: "center",
    lineHeight: 21,
    marginBottom: 24,
  },
  loadErrorText: {
    color: "#FF3B30",
    fontSize: 18,
    marginBottom: 20,
    textAlign: "center",
  },
});
