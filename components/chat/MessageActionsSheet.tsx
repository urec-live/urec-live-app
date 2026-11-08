import { MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

import { QUICK_REACTIONS } from "@/constants/chat";

interface MessageActionsSheetProps {
  visible: boolean;
  /** My message: offer Delete. Someone else's: offer Report. */
  isMine: boolean;
  /** The emoji I already reacted with, highlighted; picking it again removes it. */
  myReaction?: string;
  onReact: (emoji: string) => void;
  onDelete: () => void;
  onReport: () => void;
  onClose: () => void;
}

/** What a long press on a message opens: the quick reactions, then Delete or Report. */
export default function MessageActionsSheet({
  visible,
  isMine,
  myReaction,
  onReact,
  onDelete,
  onReport,
  onClose,
}: MessageActionsSheetProps) {
  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close message actions">
        {/* Pressable so taps inside the card don't reach the backdrop */}
        <Pressable style={styles.card} accessibilityViewIsModal>
          <View style={styles.reactions}>
            {QUICK_REACTIONS.map((emoji) => {
              const selected = myReaction === emoji;
              return (
                <Pressable
                  key={emoji}
                  onPress={() => onReact(emoji)}
                  accessibilityRole="button"
                  accessibilityLabel={selected ? `Remove your ${emoji} reaction` : `React with ${emoji}`}
                  accessibilityState={{ selected }}
                  style={[styles.reaction, selected && styles.reactionSelected]}
                >
                  <Text style={styles.reactionEmoji}>{emoji}</Text>
                </Pressable>
              );
            })}
          </View>

          {isMine ? (
            <Pressable onPress={onDelete} accessibilityRole="button" style={styles.action}>
              <MaterialCommunityIcons name="trash-can-outline" size={20} color="#E53935" />
              <Text style={[styles.actionText, styles.destructive]}>Delete message</Text>
            </Pressable>
          ) : (
            <Pressable onPress={onReport} accessibilityRole="button" style={styles.action}>
              <MaterialCommunityIcons name="flag-outline" size={20} color="#E53935" />
              <Text style={[styles.actionText, styles.destructive]}>Report message</Text>
            </Pressable>
          )}
          <Pressable onPress={onClose} accessibilityRole="button" style={styles.action}>
            <MaterialCommunityIcons name="close" size={20} color="#666" />
            <Text style={styles.actionText}>Cancel</Text>
          </Pressable>
        </Pressable>
      </Pressable>
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
  card: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: "#fff",
    borderRadius: 18,
    paddingVertical: 8,
  },
  reactions: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  reaction: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  reactionSelected: { backgroundColor: "#E8F5E9", borderWidth: 1, borderColor: "#4CAF50" },
  reactionEmoji: { fontSize: 26 },
  action: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 20, paddingVertical: 14 },
  actionText: { fontSize: 16, color: "#1a1a1a", fontWeight: "600" },
  destructive: { color: "#E53935" },
});
