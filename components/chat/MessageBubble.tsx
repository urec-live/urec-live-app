import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import type { SendStatus } from "@/hooks/useChatMessages";
import type { ChatMessageResponse } from "@/services/messagingAPI";

import { isHidden, mediaSize, photoCacheKey, photoSize, resolveMediaUrl } from "./chatUtils";
import ReactionsRow from "./ReactionsRow";

interface MessageBubbleProps {
  message: ChatMessageResponse;
  me: string | undefined;
  status: SendStatus;
  error?: string;
  /** My photo still uploading: the fraction sent, 0 to 1. */
  progress?: number;
  /** My photo's file on this device, shown while the server's copy loads. */
  localUri?: string;
  /** Community chat names each sender; DMs don't need to. */
  showSender: boolean;
  /** Long press: reactions, delete or report. */
  onOpenActions?: () => void;
  onPressFailed?: () => void;
  onPressSender?: (username: string) => void;
  onToggleReaction?: (emoji: string) => void;
  /** Tap on a sent photo: show it full screen. */
  onOpenPhoto?: () => void;
}

/** One chat message: text, a GIF, a sticker, a photo, or the placeholder left by a deleted or removed one. */
export default function MessageBubble({
  message,
  me,
  status,
  error,
  progress,
  localUri,
  showSender,
  onOpenActions,
  onPressFailed,
  onPressSender,
  onToggleReaction,
  onOpenPhoto,
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
  } else if (kind === "IMAGE") {
    body = (
      <PhotoContent message={message} isMe={isMe} sender={sender} localUri={localUri} progress={progress} />
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
  const viewable = kind === "IMAGE" && !hidden && status === "sent" && !!message.media?.url;
  return (
    <View style={[styles.container, isMe ? styles.alignRight : styles.alignLeft]}>
      <Pressable
        onLongPress={hidden || status !== "sent" ? undefined : onOpenActions}
        onPress={failed ? onPressFailed : viewable ? onOpenPhoto : undefined}
        delayLongPress={300}
        accessibilityHint={
          !hidden && status === "sent"
            ? viewable
              ? "Tap to view the photo, long press to react, delete or report"
              : "Long press to react, delete or report"
            : undefined
        }
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

/** A photo, with its caption (if any) under it in a bubble, upload progress, or "Photo unavailable". */
function PhotoContent({
  message,
  isMe,
  sender,
  localUri,
  progress,
}: {
  message: ChatMessageResponse;
  isMe: boolean;
  sender: React.ReactNode;
  localUri?: string;
  progress?: number;
}) {
  const media = message.media;
  const url = resolveMediaUrl(media?.url);
  // An expired or missing photo: say so instead of leaving a blank box
  const [broken, setBroken] = useState(false);
  useEffect(() => setBroken(false), [url]);
  const size = photoSize(media);
  const caption = message.content?.trim();
  const who = isMe ? "you" : message.senderUsername;
  const percent = progress === undefined ? undefined : Math.round(progress * 100);

  return (
    <View style={[caption ? [styles.photoBubble, isMe ? styles.bubbleMe : styles.bubbleThem] : null]}>
      {sender}
      <View style={[size, styles.photo]}>
        {!url || broken ? (
          <View style={[size, styles.photo, styles.photoUnavailable]} testID="chat-photo-unavailable">
            <MaterialCommunityIcons name="image-off-outline" size={26} color="#aaa" />
            <Text style={styles.photoUnavailableText}>Photo unavailable</Text>
          </View>
        ) : (
          <Image
            source={{ uri: url, cacheKey: photoCacheKey(media?.mediaId) }}
            placeholder={localUri && localUri !== url ? { uri: localUri } : undefined}
            contentFit="cover"
            style={[size, styles.photo]}
            onError={() => setBroken(true)}
            accessibilityLabel={`Photo from ${who}`}
            testID="chat-photo"
          />
        )}
        {percent !== undefined && (
          <View style={styles.progressOverlay} accessibilityLabel={`Uploading photo, ${percent}%`} testID="photo-progress">
            <ActivityIndicator color="#fff" />
            <Text style={styles.progressText}>{`${percent}%`}</Text>
          </View>
        )}
      </View>
      {caption ? (
        <Text style={[styles.messageText, styles.caption, isMe ? styles.messageTextMe : styles.messageTextThem]}>
          {caption}
        </Text>
      ) : null}
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
  photoBubble: { borderRadius: 16, padding: 4, paddingBottom: 8 },
  photo: { borderRadius: 13, overflow: "hidden", backgroundColor: "#eee" },
  photoUnavailable: { alignItems: "center", justifyContent: "center", gap: 6 },
  photoUnavailableText: { fontSize: 12, color: "#999" },
  progressOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  progressText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  caption: { paddingHorizontal: 8, paddingTop: 6 },
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
