import { MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import ChatRoom from "@/components/chat/ChatRoom";

export default function CommunityChatScreen() {
  return (
    <ChatRoom
      channel="community"
      placeholder="Message the community..."
      emptyText="No messages yet. Say hi to the gym!"
      title={
        <View style={styles.headerCenter}>
          <MaterialCommunityIcons name="earth" size={18} color="#4CAF50" />
          <Text style={styles.headerTitle}>Community Chat</Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  headerCenter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#1a1a1a",
  },
});
