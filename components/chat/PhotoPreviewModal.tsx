import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import React, { useEffect, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { MESSAGE_MAX_LENGTH } from "@/constants/chat";
import { useKeyboardHeight } from "@/hooks/useKeyboardHeight";
import type { PreparedPhoto } from "@/utils/chatPhotos";

interface PhotoPreviewModalProps {
  /** The picked photo; null keeps the modal closed. */
  photo: PreparedPhoto | null;
  onSend: (caption: string) => void;
  onClose: () => void;
}

/** Shows the picked photo before it's sent, with an optional caption. */
export default function PhotoPreviewModal({ photo, onSend, onClose }: PhotoPreviewModalProps) {
  const [caption, setCaption] = useState("");
  // Android doesn't shrink the window for the keyboard (edge-to-edge), so keep the caption above it
  const keyboardHeight = useKeyboardHeight();

  useEffect(() => {
    if (photo) setCaption("");
  }, [photo]);

  return (
    <Modal visible={!!photo} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={[styles.frame, { paddingBottom: keyboardHeight }]} testID="photo-preview">
        <View style={styles.header}>
          <Pressable onPress={onClose} style={styles.headerBtn} accessibilityRole="button" accessibilityLabel="Cancel photo">
            <MaterialCommunityIcons name="close" size={26} color="#fff" />
          </Pressable>
          <Text style={styles.title}>Send photo</Text>
          <View style={styles.headerBtn} />
        </View>

        {photo && (
          <Image
            source={{ uri: photo.uri }}
            contentFit="contain"
            style={styles.image}
            accessibilityLabel="Photo to send"
            testID="photo-preview-image"
          />
        )}

        <View style={styles.bar}>
          <TextInput
            style={styles.input}
            value={caption}
            onChangeText={setCaption}
            placeholder="Add a caption…"
            placeholderTextColor="#999"
            multiline
            maxLength={MESSAGE_MAX_LENGTH}
            accessibilityLabel="Caption"
          />
          <Pressable
            style={styles.send}
            onPress={() => onSend(caption.trim())}
            accessibilityRole="button"
            accessibilityLabel="Send photo"
          >
            <MaterialCommunityIcons name="send" size={20} color="#fff" />
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  frame: { flex: 1, backgroundColor: "#000" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 40,
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  headerBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  title: { color: "#fff", fontSize: 17, fontWeight: "700" },
  image: { flex: 1 },
  bar: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 24,
  },
  input: {
    flex: 1,
    backgroundColor: "#222",
    color: "#fff",
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 120,
  },
  send: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#4CAF50",
    alignItems: "center",
    justifyContent: "center",
  },
});
