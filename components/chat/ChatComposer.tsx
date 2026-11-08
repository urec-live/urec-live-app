import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { MESSAGE_MAX_LENGTH } from "@/constants/chat";

/** Show how many characters are left once a message gets this close to the limit. */
const COUNTER_FROM = MESSAGE_MAX_LENGTH - 50;

interface ChatComposerProps {
  placeholder: string;
  onSendText: (text: string) => void;
  onOpenPicker: () => void;
  /** Extra buttons before the input (the photo button goes here). */
  leading?: React.ReactNode;
}

/** The message bar: optional leading buttons, the text input, the GIF/sticker button and Send. */
export default function ChatComposer({ placeholder, onSendText, onOpenPicker, leading }: ChatComposerProps) {
  const [input, setInput] = useState("");
  const canSend = input.trim().length > 0;

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;
    setInput("");
    onSendText(text);
  };

  return (
    <View style={styles.inputRow}>
      {leading}
      <View style={styles.inputWrap}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder={placeholder}
          placeholderTextColor="#aaa"
          multiline
          maxLength={MESSAGE_MAX_LENGTH}
          onSubmitEditing={handleSend}
          blurOnSubmit={false}
          accessibilityLabel="Message"
        />
        {input.length >= COUNTER_FROM && (
          <Text style={styles.counter}>{`${MESSAGE_MAX_LENGTH - input.length} left`}</Text>
        )}
      </View>
      <Pressable
        style={styles.iconBtn}
        onPress={onOpenPicker}
        accessibilityRole="button"
        accessibilityLabel="GIFs and stickers"
        hitSlop={6}
      >
        <View style={styles.gifBadge}>
          <Text style={styles.gifBadgeText}>GIF</Text>
        </View>
      </Pressable>
      <Pressable
        style={[styles.sendBtn, !canSend && styles.sendBtnDisabled]}
        onPress={handleSend}
        disabled={!canSend}
        accessibilityRole="button"
        accessibilityLabel="Send"
        accessibilityState={{ disabled: !canSend }}
      >
        <MaterialCommunityIcons name="send" size={20} color="#fff" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    backgroundColor: "#fff",
  },
  inputWrap: { flex: 1 },
  input: {
    backgroundColor: "#f5f5f5",
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: "#1a1a1a",
    maxHeight: 120,
  },
  counter: { fontSize: 11, color: "#999", textAlign: "right", marginTop: 2, marginRight: 8 },
  iconBtn: {
    width: 38,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
  },
  gifBadge: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#4CAF50",
  },
  gifBadgeText: { fontSize: 11, fontWeight: "800", color: "#4CAF50", letterSpacing: 0.5 },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#4CAF50",
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnDisabled: {
    backgroundColor: "#ccc",
  },
});
