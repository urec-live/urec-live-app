import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

interface ReactionsRowProps {
  reactions: Record<string, string[]>;
  me: string | undefined;
  alignRight: boolean;
  /** Tapping my emoji removes it; tapping another switches to it. */
  onToggle: (emoji: string) => void;
}

/** Reaction chips under a message: each emoji with how many people used it, mine highlighted. */
export default function ReactionsRow({ reactions, me, alignRight, onToggle }: ReactionsRowProps) {
  const entries = Object.entries(reactions).filter(([, users]) => users.length > 0);
  if (entries.length === 0) return null;

  return (
    <View style={[styles.row, alignRight ? styles.right : styles.left]}>
      {entries.map(([emoji, users]) => {
        const mine = !!me && users.includes(me);
        const label = `${emoji} ${users.length} ${users.length === 1 ? "reaction" : "reactions"}${mine ? ", including yours" : ""}`;
        return (
          <Pressable
            key={emoji}
            accessibilityRole="button"
            accessibilityLabel={label}
            accessibilityState={{ selected: mine }}
            onPress={() => onToggle(emoji)}
            style={[styles.chip, mine && styles.chipMine]}
          >
            <Text style={styles.emoji}>{emoji}</Text>
            <Text style={[styles.count, mine && styles.countMine]}>{users.length}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 3 },
  left: { alignSelf: "flex-start" },
  right: { alignSelf: "flex-end" },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 12,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e8e8e8",
  },
  chipMine: { backgroundColor: "#E8F5E9", borderColor: "#4CAF50" },
  emoji: { fontSize: 13 },
  count: { fontSize: 12, fontWeight: "700", color: "#666" },
  countMine: { color: "#2E7D32" },
});
