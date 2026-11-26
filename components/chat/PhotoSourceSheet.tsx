import { MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import { Modal, Pressable, StyleSheet, Text } from "react-native";

import type { PhotoSource } from "@/utils/chatPhotos";

interface PhotoSourceSheetProps {
  visible: boolean;
  onPick: (source: PhotoSource) => void;
  onClose: () => void;
}

/** What the 📷 button opens: take a photo or choose one from the library. */
export default function PhotoSourceSheet({ visible, onPick, onClose }: PhotoSourceSheetProps) {
  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close photo options">
        {/* Pressable so taps inside the card don't reach the backdrop */}
        <Pressable style={styles.card} accessibilityViewIsModal>
          <Pressable onPress={() => onPick("camera")} accessibilityRole="button" style={styles.action}>
            <MaterialCommunityIcons name="camera-outline" size={22} color="#4CAF50" />
            <Text style={styles.actionText}>Take photo</Text>
          </Pressable>
          <Pressable onPress={() => onPick("library")} accessibilityRole="button" style={styles.action}>
            <MaterialCommunityIcons name="image-multiple-outline" size={22} color="#4CAF50" />
            <Text style={styles.actionText}>Choose from library</Text>
          </Pressable>
          <Pressable onPress={onClose} accessibilityRole="button" style={styles.action}>
            <MaterialCommunityIcons name="close" size={22} color="#666" />
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
  action: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 20, paddingVertical: 14 },
  actionText: { fontSize: 16, color: "#1a1a1a", fontWeight: "600" },
});
