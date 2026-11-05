import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { REPORT_NOTE_MAX_LENGTH } from "@/constants/chat";
import type { ReportReason } from "@/services/messagingAPI";

const REASONS: { value: ReportReason; label: string }[] = [
  { value: "SPAM", label: "Spam" },
  { value: "HARASSMENT", label: "Harassment or bullying" },
  { value: "INAPPROPRIATE", label: "Inappropriate content" },
  { value: "OTHER", label: "Something else" },
];

interface ReportMessageModalProps {
  visible: boolean;
  senderUsername: string;
  /** Resolves on success; rejects with a message to show. */
  onSubmit: (reason: ReportReason, note: string) => Promise<void>;
  onClose: () => void;
}

/** Asks why a message is being reported, sends it to staff, and confirms. */
export default function ReportMessageModal({ visible, senderUsername, onSubmit, onClose }: ReportMessageModalProps) {
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  // Start fresh each time it opens
  useEffect(() => {
    if (visible) {
      setReason(null);
      setNote("");
      setSubmitting(false);
      setError(null);
      setSent(false);
    }
  }, [visible]);

  const submit = async () => {
    if (!reason || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(reason, note);
      setSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't send your report. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card} accessibilityViewIsModal>
          {sent ? (
            <View style={styles.done}>
              <MaterialCommunityIcons name="check-circle" size={44} color="#4CAF50" />
              <Text style={styles.title}>Report sent</Text>
              <Text style={styles.subtitle}>Thanks. Staff will review it.</Text>
              <Pressable onPress={onClose} accessibilityRole="button" style={styles.primaryBtn}>
                <Text style={styles.primaryText}>Done</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <Text style={styles.title}>Report message</Text>
              <Text style={styles.subtitle}>{`Why are you reporting ${senderUsername}'s message?`}</Text>
              <View style={styles.reasons} accessibilityRole="radiogroup">
                {REASONS.map((r) => {
                  const selected = reason === r.value;
                  return (
                    <Pressable
                      key={r.value}
                      onPress={() => setReason(r.value)}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: selected }}
                      style={[styles.reason, selected && styles.reasonSelected]}
                    >
                      <MaterialCommunityIcons
                        name={selected ? "radiobox-marked" : "radiobox-blank"}
                        size={20}
                        color={selected ? "#4CAF50" : "#bbb"}
                      />
                      <Text style={styles.reasonText}>{r.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
              <TextInput
                value={note}
                onChangeText={setNote}
                placeholder="Add details (optional)"
                placeholderTextColor="#aaa"
                maxLength={REPORT_NOTE_MAX_LENGTH}
                multiline
                style={styles.note}
                accessibilityLabel="Details"
              />
              {error && (
                <Text style={styles.error} accessibilityRole="alert">
                  {error}
                </Text>
              )}
              <View style={styles.buttons}>
                <Pressable onPress={onClose} accessibilityRole="button" style={styles.secondaryBtn}>
                  <Text style={styles.secondaryText}>Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={submit}
                  disabled={!reason || submitting}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: !reason || submitting }}
                  style={[styles.primaryBtn, (!reason || submitting) && styles.disabled]}
                >
                  {submitting ? (
                    <ActivityIndicator color="#fff" accessibilityLabel="Sending report" />
                  ) : (
                    <Text style={styles.primaryText}>Report</Text>
                  )}
                </Pressable>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: { width: "100%", maxWidth: 380, backgroundColor: "#fff", borderRadius: 18, padding: 20, gap: 10 },
  title: { fontSize: 18, fontWeight: "800", color: "#1a1a1a" },
  subtitle: { fontSize: 14, color: "#666" },
  reasons: { gap: 6, marginTop: 4 },
  reason: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#eee",
  },
  reasonSelected: { borderColor: "#4CAF50", backgroundColor: "#F1F8E9" },
  reasonText: { fontSize: 15, color: "#1a1a1a" },
  note: {
    minHeight: 64,
    maxHeight: 120,
    backgroundColor: "#f5f5f5",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#1a1a1a",
    textAlignVertical: "top",
  },
  error: { color: "#E53935", fontSize: 13 },
  buttons: { flexDirection: "row", justifyContent: "flex-end", gap: 10, marginTop: 4 },
  primaryBtn: {
    backgroundColor: "#4CAF50",
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 22,
    minWidth: 96,
    alignItems: "center",
  },
  primaryText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  secondaryBtn: { borderRadius: 20, paddingVertical: 10, paddingHorizontal: 18 },
  secondaryText: { color: "#666", fontWeight: "700", fontSize: 15 },
  disabled: { opacity: 0.5 },
  done: { alignItems: "center", gap: 8 },
});
