import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { SendStatus } from "@/hooks/useChatMessages";
import type { ChatMessageResponse } from "@/services/messagingAPI";

import { isHidden, mediaSize } from "./chatUtils";
import ReactionsRow from "./ReactionsRow";

interface MessageBubbleProps {
  message: ChatMessageResponse;
  me: string | undefined;
  status: SendStatus;
  error?: string;
  /** Community chat names each sender; DMs don't need to. */
  showSender: boolean;
  /** Long press: reactions, delete or report. */
  onOpenActions?: () => void;
  onPressFailed?: () => void;
  onPressSender?: (username: string) => void;
  onToggleReaction?: (emoji: string) => void;
}

/** One chat message: text, a GIF, a sticker, or the placeholder left by a deleted or removed one. */
export default function MessageBubble({
  message,
  me,
  status,
  error,
  showSender,
  onOpenActions,
  onPressFailed,
  onPressSender,
  onToggleReaction,
}: MessageBubbleProps) {
  const isMe = message.senderUsername === me;
  const kind = message.kind ?? "TEXT";
  const hidden = isHidden(message);
  const sender = showSender && !isMe && (
    <Pressable onPress={() => onPressSender?.(message.senderUsername)}>
      <Text style={styles.senderName}>{message.senderUsername}</Text>
    </Pressable>
  );

  let body: React.ReactNode;
  if (hidden) {
    body = (
      <View style={[styles.bubble, styles.placeholder, isMe ? styles.alignRight : styles.alignLeft]}>
        {sender}
        <View style={styles.placeholderRow}>
          <MaterialCommunityIcons
            name={message.removedByStaff ? "shield-alert-outline" : "cancel"}
            size={14}
            color="#999"
          />
          <Text style={styles.placeholderText}>
            {message.removedByStaff ? "Removed by staff" : "This message was deleted"}
          </Text>
        </View>
      </View>
    );
  } else if (kind === "GIF" || kind === "STICKER") {
    const size = mediaSize(message.media, kind);
    body = (
      <View style={isMe ? styles.alignRight : styles.alignLeft}>
        {sender}
        <Image
          source={{ uri: message.media?.url }}
          placeholder={message.media?.previewUrl ? { uri: message.media.previewUrl } : undefined}
          contentFit={kind === "STICKER" ? "contain" : "cover"}
          style={[size, kind === "GIF" && styles.gif]}
          accessibilityLabel={`${kind === "GIF" ? "GIF" : "Sticker"} from ${isMe ? "you" : message.senderUsername}`}
          testID={kind === "GIF" ? "chat-gif" : "chat-sticker"}
        />
      </View>
    );
  } else {
    body = (
      <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem]}>
        {sender}
        <Text style={[styles.messageText, isMe ? styles.messageTextMe : styles.messageTextThem]}>
          {message.content}
        </Text>
      </View>
    );
  }

  const failed = status === "failed";
  return (
    <View style={[styles.container, isMe ? styles.alignRight : styles.alignLeft]}>
      <Pressable
        onLongPress={hidden || status !== "sent" ? undefined : onOpenActions}
        onPress={failed ? onPressFailed : undefined}
        delayLongPress={300}
        accessibilityHint={!hidden && status === "sent" ? "Long press to react, delete or report" : undefined}
        style={[status === "sending" && styles.sending, isMe ? styles.alignRight : styles.alignLeft]}
      >
        {body}
      </Pressable>
      {status === "sending" && (
        <View style={[styles.statusRow, styles.alignRight]} accessibilityLabel="Sending">
          <MaterialCommunityIcons name="clock-outline" size={12} color="#999" />
          <Text style={styles.statusText}>Sending…</Text>
        </View>
      )}
      {failed && (
        <Pressable
          onPress={onPressFailed}
          accessibilityRole="button"
          accessibilityLabel={`${error ?? "Not sent"}. Tap to retry`}
          style={[styles.statusRow, styles.alignRight]}
        >
          <MaterialCommunityIcons name="alert-circle" size={13} color="#E53935" />
          <Text style={styles.failedText}>{`${error ?? "Not sent"} · Tap to retry`}</Text>
        </Pressable>
      )}
      {!hidden && status === "sent" && message.reactions && onToggleReaction && (
        <ReactionsRow reactions={message.reactions} me={me} alignRight={isMe} onToggle={onToggleReaction} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { maxWidth: "78%" },
  alignRight: { alignSelf: "flex-end" },
  alignLeft: { alignSelf: "flex-start" },
  bubble: {
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  bubbleMe: {
    alignSelf: "flex-end",
    backgroundColor: "#4CAF50",
    borderBottomRightRadius: 4,
  },
  bubbleThem: {
    alignSelf: "flex-start",
    backgroundColor: "#fff",
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: "#e8e8e8",
  },
  placeholder: {
    backgroundColor: "#f5f5f5",
    borderWidth: 1,
    borderColor: "#eee",
  },
  placeholderRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  placeholderText: { fontSize: 14, fontStyle: "italic", color: "#999" },
  gif: { borderRadius: 14, backgroundColor: "#eee" },
  senderName: {
    fontSize: 11,
    fontWeight: "700",
    color: "#4CAF50",
    marginBottom: 3,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  messageTextMe: {
    color: "#fff",
  },
  messageTextThem: {
    color: "#1a1a1a",
  },
  sending: { opacity: 0.6 },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 3 },
  statusText: { fontSize: 11, color: "#999" },
  failedText: { fontSize: 12, fontWeight: "600", color: "#E53935" },
});
