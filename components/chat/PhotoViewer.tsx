import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import React from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

import type { ChatMessageResponse } from "@/services/messagingAPI";

import { photoCacheKey, resolveMediaUrl } from "./chatUtils";

interface PhotoViewerProps {
  /** The photo message to show; null keeps the viewer closed. */
  message: ChatMessageResponse | null;
  onClose: () => void;
}

/** A sent photo, full screen, with its caption and who sent it. */
export default function PhotoViewer({ message, onClose }: PhotoViewerProps) {
  const media = message?.media;
  const caption = message?.content?.trim();
  return (
    <Modal visible={!!message} animationType="fade" transparent={false} onRequestClose={onClose}>
      <View style={styles.frame} testID="photo-viewer">
        {media?.url ? (
          <Image
            // The same cache key as the bubble, so the photo shows at once without downloading again
            source={{ uri: resolveMediaUrl(media.url), cacheKey: photoCacheKey(media.mediaId) }}
            contentFit="contain"
            style={styles.image}
            accessibilityLabel={`Photo from ${message?.senderUsername ?? ""}`}
            testID="photo-viewer-image"
          />
        ) : null}
        <View style={styles.header}>
          <Text style={styles.sender} numberOfLines={1}>{message?.senderUsername}</Text>
          <Pressable onPress={onClose} style={styles.close} accessibilityRole="button" accessibilityLabel="Close photo">
            <MaterialCommunityIcons name="close" size={28} color="#fff" />
          </Pressable>
        </View>
        {caption ? (
          <View style={styles.captionWrap}>
            <Text style={styles.caption}>{caption}</Text>
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  frame: { flex: 1, backgroundColor: "#000" },
  image: { ...StyleSheet.absoluteFillObject },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 40,
    paddingHorizontal: 16,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  sender: { flex: 1, color: "#fff", fontSize: 16, fontWeight: "700" },
  close: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  captionWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 36,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  caption: { color: "#fff", fontSize: 15, lineHeight: 21 },
});
