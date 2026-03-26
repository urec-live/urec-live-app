import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChatMessage, chatAPI } from "../services/chatAPI";
import { useAuth } from "../contexts/AuthContext";

interface DisplayMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  pending?: boolean;
}

const SUGGESTIONS = [
  "What should I work on today?",
  "How's my progress looking?",
  "Give me a chest workout",
  "Am I training enough legs?",
];

export default function ChatScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const flatListRef = useRef<FlatList>(null);

  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || sending) return;
      const userText = text.trim();
      setInput("");

      const userMsg: DisplayMessage = {
        id: Date.now().toString(),
        role: "user",
        content: userText,
      };

      const pendingMsg: DisplayMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "",
        pending: true,
      };

      setMessages((prev) => [...prev, userMsg, pendingMsg]);
      setSending(true);

      // Build message history for API (exclude pending)
      const history: ChatMessage[] = [
        ...messages
          .filter((m) => !m.pending)
          .map((m) => ({ role: m.role, content: m.content })),
        { role: "user" as const, content: userText },
      ];

      try {
        const reply = await chatAPI.send(history);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === pendingMsg.id
              ? { ...m, content: reply, pending: false }
              : m
          )
        );
      } catch {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === pendingMsg.id
              ? {
                  ...m,
                  content: "Sorry, something went wrong. Please try again.",
                  pending: false,
                }
              : m
          )
        );
      } finally {
        setSending(false);
      }
    },
    [messages, sending]
  );

  const renderMessage = ({ item }: { item: DisplayMessage }) => {
    const isUser = item.role === "user";

    if (item.pending) {
      return (
        <View style={[styles.messageBubble, styles.assistantBubble]}>
          <View style={styles.typingRow}>
            <View style={[styles.typingDot, { opacity: 0.4 }]} />
            <View style={[styles.typingDot, { opacity: 0.6 }]} />
            <View style={[styles.typingDot, { opacity: 0.8 }]} />
          </View>
        </View>
      );
    }

    return (
      <View
        style={[
          styles.messageRow,
          isUser ? styles.userRow : styles.assistantRow,
        ]}
      >
        {!isUser && (
          <View style={styles.avatarCircle}>
            <MaterialCommunityIcons
              name="robot-outline"
              size={18}
              color="#fff"
            />
          </View>
        )}
        <View
          style={[
            styles.messageBubble,
            isUser ? styles.userBubble : styles.assistantBubble,
          ]}
        >
          <Text
            style={[
              styles.messageText,
              isUser ? styles.userText : styles.assistantText,
            ]}
          >
            {item.content}
          </Text>
        </View>
      </View>
    );
  };

  const showEmpty = messages.length === 0;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#1a1a1a" />
        </Pressable>
        <View style={styles.headerCenter}>
          <View style={styles.headerAvatar}>
            <MaterialCommunityIcons
              name="robot-outline"
              size={20}
              color="#fff"
            />
          </View>
          <View>
            <Text style={styles.headerTitle}>UREC AI</Text>
            <Text style={styles.headerSubtitle}>Fitness Assistant</Text>
          </View>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
      >
        {showEmpty ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyAvatar}>
              <MaterialCommunityIcons
                name="robot-happy-outline"
                size={48}
                color="#4CAF50"
              />
            </View>
            <Text style={styles.emptyTitle}>
              Hey{user?.username ? ` ${user.username}` : ""}! 👋
            </Text>
            <Text style={styles.emptySubtitle}>
              I'm your AI fitness assistant. I can see your workout history and
              help with training advice, form tips, and programming.
            </Text>

            <View style={styles.suggestionsGrid}>
              {SUGGESTIONS.map((s) => (
                <Pressable
                  key={s}
                  style={styles.suggestionChip}
                  onPress={() => sendMessage(s)}
                >
                  <Text style={styles.suggestionText}>{s}</Text>
                  <MaterialCommunityIcons
                    name="arrow-up-right"
                    size={14}
                    color="#4CAF50"
                  />
                </Pressable>
              ))}
            </View>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={renderMessage}
            contentContainerStyle={styles.messageList}
            onContentSizeChange={() =>
              flatListRef.current?.scrollToEnd({ animated: true })
            }
            onLayout={() =>
              flatListRef.current?.scrollToEnd({ animated: false })
            }
          />
        )}

        {/* Input bar */}
        <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <TextInput
            style={styles.textInput}
            value={input}
            onChangeText={setInput}
            placeholder="Ask anything about your workouts..."
            placeholderTextColor="#aaa"
            multiline
            maxLength={1000}
            editable={!sending}
            onSubmitEditing={() => sendMessage(input)}
            blurOnSubmit={false}
          />
          <Pressable
            style={[
              styles.sendBtn,
              (!input.trim() || sending) && styles.sendBtnDisabled,
            ]}
            onPress={() => sendMessage(input)}
            disabled={!input.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator size={18} color="#fff" />
            ) : (
              <MaterialCommunityIcons name="send" size={20} color="#fff" />
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e8e8e8",
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  headerAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#4CAF50",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1a1a1a",
  },
  headerSubtitle: {
    fontSize: 11,
    color: "#888",
    fontWeight: "500",
  },

  // Empty state
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    paddingBottom: 60,
  },
  emptyAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#e8f5e9",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#1a1a1a",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#888",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 28,
  },
  suggestionsGrid: {
    width: "100%",
    gap: 10,
  },
  suggestionChip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  suggestionText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    flex: 1,
  },

  // Messages
  messageList: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  messageRow: {
    flexDirection: "row",
    marginBottom: 16,
    maxWidth: "85%",
  },
  userRow: {
    alignSelf: "flex-end",
  },
  assistantRow: {
    alignSelf: "flex-start",
    gap: 8,
  },
  avatarCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#4CAF50",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  messageBubble: {
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxWidth: "100%",
  },
  userBubble: {
    backgroundColor: "#4CAF50",
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    backgroundColor: "#fff",
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: "#e8e8e8",
    flexShrink: 1,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 21,
  },
  userText: {
    color: "#fff",
  },
  assistantText: {
    color: "#1a1a1a",
  },

  // Typing indicator
  typingRow: {
    flexDirection: "row",
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#4CAF50",
  },

  // Input
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 12,
    paddingTop: 10,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#e8e8e8",
    gap: 8,
  },
  textInput: {
    flex: 1,
    backgroundColor: "#f0f0f0",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 15,
    maxHeight: 100,
    color: "#1a1a1a",
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#4CAF50",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 1,
  },
  sendBtnDisabled: {
    backgroundColor: "#c8e6c9",
  },
});
