import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useAuth } from "@/contexts/AuthContext";
import { ChatRow, useChatMessages } from "@/hooks/useChatMessages";
import { useKeyboardHeight } from "@/hooks/useKeyboardHeight";
import { ChatChannel, ChatMessageResponse, messagingAPI, ReportReason } from "@/services/messagingAPI";
import { toChatActionError } from "@/utils/chatErrors";
import { confirmAsync } from "@/utils/confirm";

import ChatComposer from "./ChatComposer";
import { myReactionOf } from "./chatUtils";
import GifStickerPicker from "./GifStickerPicker";
import MessageActionsSheet from "./MessageActionsSheet";
import MessageBubble from "./MessageBubble";
import ReportMessageModal from "./ReportMessageModal";

const NOTICE_MS = 4000;
// iOS can't present a modal or alert while another modal is still animating closed
const AFTER_SHEET_MS = Platform.OS === "ios" ? 350 : 0;

interface ChatRoomProps {
  channel: ChatChannel;
  /** The other person, for DMs. */
  partner?: string;
  /** What sits between the back button and the right edge of the header. */
  title: React.ReactNode;
  placeholder: string;
  emptyText: string;
  /** Called for each live message from someone else. */
  onIncoming?: (message: ChatMessageResponse) => void;
}

/**
 * A chat screen: messages (newest at the bottom, older ones loading as you scroll up), the
 * composer with the GIF/sticker picker, and long-press reactions, delete and report.
 */
export default function ChatRoom({ channel, partner, title, placeholder, emptyText, onIncoming }: ChatRoomProps) {
  const router = useRouter();
  const { user } = useAuth();
  const me = user?.username;
  const chat = useChatMessages({ channel, partner, me, onIncoming });
  const { upsert } = chat;

  const [pickerOpen, setPickerOpen] = useState(false);
  const [selected, setSelected] = useState<ChatMessageResponse | null>(null);
  const [reporting, setReporting] = useState<ChatMessageResponse | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sheetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // iOS: KeyboardAvoidingView compares its position within its parent against the keyboard's
  // position in the window, so it needs to know how far down the window this screen starts (the
  // root SafeAreaView's status bar inset, plus any banner shown above the stack).
  const rootRef = useRef<View>(null);
  const [windowTop, setWindowTop] = useState(0);
  const measureWindowTop = useCallback(() => {
    rootRef.current?.measureInWindow((_x, y) => setWindowTop(y));
  }, []);

  // Android: measureInWindow leaves out the status bar while the keyboard's position includes it,
  // so KeyboardAvoidingView stops short. Pad by the keyboard's height instead, which React Native
  // reports without the navigation bar that the root SafeAreaView already keeps this screen above.
  const keyboardHeight = useKeyboardHeight();

  useEffect(() => () => {
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    if (sheetTimer.current) clearTimeout(sheetTimer.current);
  }, []);

  const showNotice = useCallback((text: string) => {
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    setNotice(text);
    noticeTimer.current = setTimeout(() => setNotice(null), NOTICE_MS);
  }, []);

  const toggleReaction = useCallback(
    async (message: ChatMessageResponse, emoji: string) => {
      try {
        const updated =
          myReactionOf(message, me) === emoji
            ? await messagingAPI.unreact(channel, message.id)
            : await messagingAPI.react(channel, message.id, emoji);
        upsert(updated);
      } catch (e) {
        showNotice(toChatActionError(e, "react"));
      }
    },
    [channel, me, upsert, showNotice],
  );

  const deleteMessage = useCallback(
    async (message: ChatMessageResponse) => {
      const confirmed = await confirmAsync({
        title: "Delete message?",
        message: "It will be removed for everyone in this chat.",
        confirmText: "Delete",
        destructive: true,
      });
      if (!confirmed) return;
      try {
        upsert(await messagingAPI.deleteMessage(channel, message.id));
      } catch (e) {
        showNotice(toChatActionError(e, "delete"));
      }
    },
    [channel, upsert, showNotice],
  );

  const submitReport = async (reason: ReportReason, note: string) => {
    if (!reporting) return;
    try {
      await messagingAPI.reportMessage(channel, reporting.id, reason, note);
    } catch (e) {
      throw new Error(toChatActionError(e, "report"));
    }
  };

  /** Closes the actions sheet, then runs the action once it has gone (unless the screen closed first). */
  const fromSheet = (action: (message: ChatMessageResponse) => void) => () => {
    const message = selected;
    setSelected(null);
    if (!message) return;
    if (sheetTimer.current) clearTimeout(sheetTimer.current);
    sheetTimer.current = setTimeout(() => {
      sheetTimer.current = null;
      action(message);
    }, AFTER_SHEET_MS);
  };

  const renderItem = ({ item }: { item: ChatRow }) => (
    <MessageBubble
      message={item.message}
      me={me}
      status={item.status}
      error={item.error}
      showSender={channel === "community"}
      onOpenActions={() => setSelected(item.message)}
      onPressFailed={() => item.message.clientId && chat.retry(item.message.clientId)}
      onPressSender={(username) => router.push(`/users/${username}` as any)}
      onToggleReaction={(emoji) => toggleReaction(item.message, emoji)}
    />
  );

  return (
    <View ref={rootRef} style={styles.root} onLayout={measureWindowTop}>
      <LinearGradient colors={["#ffffff", "#f5f5f5", "#ffffff"]} style={styles.root}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn} accessibilityRole="button" accessibilityLabel="Back">
            <MaterialCommunityIcons name="arrow-left" size={24} color="#1a1a1a" />
          </Pressable>
          {title}
          <View style={{ width: 40 }} />
        </View>

        <KeyboardAvoidingView
          style={[styles.root, Platform.OS === "android" && { paddingBottom: keyboardHeight }]}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          enabled={Platform.OS === "ios"}
          keyboardVerticalOffset={windowTop}
          testID="chat-body"
        >
          {chat.loading ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color="#4CAF50" accessibilityLabel="Loading messages" />
            </View>
          ) : chat.loadError && chat.rows.length === 0 ? (
            <View style={styles.center} accessibilityRole="alert">
              <Text style={styles.emptyText}>{"Couldn't load messages."}</Text>
              <Pressable onPress={chat.reload} style={styles.retryBtn} accessibilityRole="button">
                <Text style={styles.retryText}>Try again</Text>
              </Pressable>
            </View>
          ) : chat.rows.length === 0 ? (
            <View style={styles.center}>
              <MaterialCommunityIcons name="chat-outline" size={44} color="#ccc" />
              <Text style={styles.emptyText}>{emptyText}</Text>
            </View>
          ) : (
            <FlatList
              inverted
              data={chat.rows}
              keyExtractor={(row) => row.key}
              renderItem={renderItem}
              contentContainerStyle={styles.listContent}
              onEndReached={chat.loadOlder}
              onEndReachedThreshold={0.3}
              ListFooterComponent={
                chat.loadingOlder ? <ActivityIndicator color="#4CAF50" style={styles.older} accessibilityLabel="Loading older messages" /> : null
              }
            />
          )}

          {notice && (
            <View style={styles.notice} accessibilityRole="alert">
              <Text style={styles.noticeText}>{notice}</Text>
            </View>
          )}

          <ChatComposer
            placeholder={placeholder}
            onSendText={(content) => chat.send({ kind: "TEXT", content })}
            onOpenPicker={() => setPickerOpen(true)}
          />
        </KeyboardAvoidingView>

        <GifStickerPicker
          visible={pickerOpen}
          onClose={() => setPickerOpen(false)}
          onSelect={(kind, item) =>
            chat.send({
              kind,
              media: {
                url: item.url,
                previewUrl: item.previewUrl,
                width: item.width,
                height: item.height,
                providerId: item.id,
              },
            })
          }
        />

        <MessageActionsSheet
          visible={!!selected}
          isMine={!!selected && selected.senderUsername === me}
          myReaction={selected ? myReactionOf(selected, me) : undefined}
          onReact={(emoji) => fromSheet((message) => toggleReaction(message, emoji))()}
          onDelete={fromSheet(deleteMessage)}
          onReport={fromSheet(setReporting)}
          onClose={() => setSelected(null)}
        />

        <ReportMessageModal
          visible={!!reporting}
          senderUsername={reporting?.senderUsername ?? ""}
          onSubmit={submitReport}
          onClose={() => setReporting(null)}
        />
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 30,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 40,
  },
  emptyText: { fontSize: 15, color: "#888", textAlign: "center" },
  retryBtn: { backgroundColor: "#4CAF50", borderRadius: 18, paddingVertical: 8, paddingHorizontal: 18 },
  retryText: { color: "#fff", fontWeight: "700" },
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  older: { marginVertical: 12 },
  notice: {
    marginHorizontal: 12,
    marginBottom: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "#FFEBEE",
  },
  noticeText: { color: "#C62828", fontSize: 13, fontWeight: "600" },
});
