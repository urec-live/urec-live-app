import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect } from "react";
import { Pressable, StyleSheet, Text } from "react-native";

import ChatRoom from "@/components/chat/ChatRoom";
import { messagingAPI } from "@/services/messagingAPI";

export default function DMConversationScreen() {
  const { username } = useLocalSearchParams<{ username: string }>();
  const router = useRouter();

  useEffect(() => {
    if (username) messagingAPI.markRead(username).catch(() => {});
  }, [username]);

  // A message that arrives while the conversation is open has been read
  const markRead = useCallback(() => {
    if (username) messagingAPI.markRead(username).catch(() => {});
  }, [username]);

  return (
    <ChatRoom
      channel="dm"
      partner={username}
      placeholder={`Message ${username}...`}
      emptyText={`Say hi to ${username}.`}
      onIncoming={markRead}
      title={
        <Pressable onPress={() => router.push(`/users/${username}` as any)}>
          <Text style={styles.headerTitle}>{username}</Text>
        </Pressable>
      }
    />
  );
}

const styles = StyleSheet.create({
  headerTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#1a1a1a",
    textDecorationLine: "underline",
    textDecorationColor: "#ccc",
  },
});
