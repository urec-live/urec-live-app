import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import React from "react";
import { DeviceEventEmitter, Platform, StyleSheet } from "react-native";

import CommunityChatScreen from "@/app/chat/community";
import DMConversationScreen from "@/app/chat/dm/[username]";
import type { ChatMessageResponse } from "@/services/messagingAPI";

const mockPush = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn() }),
  useLocalSearchParams: () => ({ username: "alex" }),
}));
jest.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { username: "sam" } }) }));
jest.mock("@expo/vector-icons", () => ({ MaterialCommunityIcons: () => null }));
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));
jest.mock("expo-image", () => {
  const { createElement } = jest.requireActual("react");
  const { View } = jest.requireActual("react-native");
  return { Image: (props: Record<string, unknown>) => createElement(View, props) };
});

const mockConfirm = jest.fn();
jest.mock("@/utils/confirm", () => ({ confirmAsync: (...args: unknown[]) => mockConfirm(...args) }));

const mockLive: ((m: ChatMessageResponse) => void)[] = [];
const mockSendCommunity = jest.fn((_m: unknown) => true);
const mockSendDM = jest.fn((_r: string, _m: unknown) => true);
jest.mock("@/services/websocketService", () => ({
  __esModule: true,
  default: {
    connect: jest.fn(),
    sendCommunityMessage: (m: unknown) => mockSendCommunity(m),
    sendDM: (r: string, m: unknown) => mockSendDM(r, m),
    subscribeToCommunity: (cb: (m: ChatMessageResponse) => void) => {
      mockLive.push(cb);
      return () => mockLive.splice(mockLive.indexOf(cb), 1);
    },
    subscribeToUserQueue: (cb: (m: ChatMessageResponse) => void) => {
      mockLive.push(cb);
      return () => mockLive.splice(mockLive.indexOf(cb), 1);
    },
    subscribeToChatErrors: () => () => {},
    onConnect: () => () => {},
  },
}));

const mockApi = {
  getCommunityHistory: jest.fn(),
  getDMHistory: jest.fn(),
  markRead: jest.fn(),
  react: jest.fn(),
  unreact: jest.fn(),
  deleteMessage: jest.fn(),
  reportMessage: jest.fn(),
};
jest.mock("@/services/messagingAPI", () => ({
  messagingAPI: {
    getCommunityHistory: (...a: unknown[]) => mockApi.getCommunityHistory(...a),
    getDMHistory: (...a: unknown[]) => mockApi.getDMHistory(...a),
    markRead: (...a: unknown[]) => mockApi.markRead(...a),
    react: (...a: unknown[]) => mockApi.react(...a),
    unreact: (...a: unknown[]) => mockApi.unreact(...a),
    deleteMessage: (...a: unknown[]) => mockApi.deleteMessage(...a),
    reportMessage: (...a: unknown[]) => mockApi.reportMessage(...a),
  },
}));

const mockTrending = jest.fn();
jest.mock("@/services/klipyAPI", () => ({
  klipyAPI: { trending: (...a: unknown[]) => mockTrending(...a), search: jest.fn() },
}));

function msg(id: number, overrides: Partial<ChatMessageResponse> = {}): ChatMessageResponse {
  return {
    id,
    senderUsername: "alex",
    content: `message ${id}`,
    sentAt: "2026-11-03T12:00:00Z",
    type: "COMMUNITY",
    kind: "TEXT",
    reactions: {},
    ...overrides,
  };
}

const live = (m: ChatMessageResponse) => act(() => mockLive.forEach((cb) => cb(m)));

beforeEach(() => {
  jest.clearAllMocks();
  mockLive.length = 0;
  mockSendCommunity.mockReturnValue(true);
  mockApi.getCommunityHistory.mockResolvedValue([msg(1), msg(2, { senderUsername: "sam", content: "mine" })]);
  mockApi.getDMHistory.mockResolvedValue([msg(10, { type: "DM", recipientUsername: "sam", content: "hey sam" })]);
  mockApi.markRead.mockResolvedValue(undefined);
  mockConfirm.mockResolvedValue(true);
  mockTrending.mockResolvedValue({
    items: [{ id: "gym-flex", url: "https://static.klipy.com/flex.webp", previewUrl: "https://static.klipy.com/flex-sm.webp", width: 200, height: 100 }],
    nextPage: null,
  });
});

describe("Community chat", () => {
  it("shows history and sends a message that settles when the server echoes it", async () => {
    render(<CommunityChatScreen />);
    expect(await screen.findByText("message 1")).toBeTruthy();
    expect(screen.getByText("Community Chat")).toBeTruthy();

    fireEvent.changeText(screen.getByLabelText("Message"), "leg day!");
    fireEvent.press(screen.getByLabelText("Send"));

    const payload = mockSendCommunity.mock.calls[0][0] as { clientId: string; kind: string; content: string };
    expect(payload).toMatchObject({ kind: "TEXT", content: "leg day!" });
    expect(screen.getByText("Sending…")).toBeTruthy();

    live(msg(3, { senderUsername: "sam", content: "leg day!", clientId: payload.clientId }));
    expect(screen.queryByText("Sending…")).toBeNull();
    expect(screen.getAllByText("leg day!")).toHaveLength(1);
  });

  it("opens a member's profile from their name", async () => {
    render(<CommunityChatScreen />);
    fireEvent.press(await screen.findByText("alex"));
    expect(mockPush).toHaveBeenCalledWith("/users/alex");
  });

  it("reacts from the long-press sheet and shows the chip", async () => {
    mockApi.react.mockResolvedValue(msg(1, { reactions: { "🔥": ["sam"] } }));
    render(<CommunityChatScreen />);
    fireEvent(await screen.findByText("message 1"), "longPress");

    expect(screen.getByText("Report message")).toBeTruthy();
    fireEvent.press(screen.getByLabelText("React with 🔥"));

    await waitFor(() => expect(mockApi.react).toHaveBeenCalledWith("community", 1, "🔥"));
    expect(await screen.findByLabelText("🔥 1 reaction, including yours")).toBeTruthy();
    expect(screen.queryByText("Report message")).toBeNull();
  });

  it("removes my reaction when I tap its chip", async () => {
    mockApi.getCommunityHistory.mockResolvedValue([msg(1, { reactions: { "💪": ["sam", "jo"] } })]);
    mockApi.unreact.mockResolvedValue(msg(1, { reactions: { "💪": ["jo"] } }));
    render(<CommunityChatScreen />);
    fireEvent.press(await screen.findByLabelText("💪 2 reactions, including yours"));
    expect(await screen.findByLabelText("💪 1 reaction")).toBeTruthy();
    expect(mockApi.unreact).toHaveBeenCalledWith("community", 1);
  });

  it("says why a reaction failed", async () => {
    mockApi.react.mockRejectedValue({ isAxiosError: true, response: { status: 409 } });
    render(<CommunityChatScreen />);
    fireEvent(await screen.findByText("message 1"), "longPress");
    fireEvent.press(screen.getByLabelText("React with 👍"));
    expect(await screen.findByText("This message was deleted.")).toBeTruthy();
  });

  it("deletes my own message after confirming", async () => {
    mockApi.deleteMessage.mockResolvedValue(msg(2, { senderUsername: "sam", content: "", deleted: true }));
    render(<CommunityChatScreen />);
    fireEvent(await screen.findByText("mine"), "longPress");
    expect(screen.queryByText("Report message")).toBeNull();
    fireEvent.press(screen.getByText("Delete message"));

    expect(await screen.findByText("This message was deleted")).toBeTruthy();
    expect(mockConfirm).toHaveBeenCalledWith(expect.objectContaining({ title: "Delete message?", destructive: true }));
    expect(mockApi.deleteMessage).toHaveBeenCalledWith("community", 2);
  });

  it("drops a sheet action when the screen closes before the sheet has finished closing", async () => {
    const { unmount } = render(<CommunityChatScreen />);
    fireEvent(await screen.findByText("mine"), "longPress");
    jest.useFakeTimers();
    try {
      fireEvent.press(screen.getByText("Delete message"));
      // Back out of the chat while the sheet is still animating away
      unmount();
      jest.advanceTimersByTime(1000);
      expect(mockConfirm).not.toHaveBeenCalled();
      expect(mockApi.deleteMessage).not.toHaveBeenCalled();
    } finally {
      jest.useRealTimers();
    }
  });

  it("keeps the message when the delete isn't confirmed", async () => {
    mockConfirm.mockResolvedValue(false);
    render(<CommunityChatScreen />);
    fireEvent(await screen.findByText("mine"), "longPress");
    fireEvent.press(screen.getByText("Delete message"));
    await waitFor(() => expect(mockConfirm).toHaveBeenCalled());
    expect(mockApi.deleteMessage).not.toHaveBeenCalled();
    expect(screen.getByText("mine")).toBeTruthy();
  });

  it("reports someone else's message", async () => {
    mockApi.reportMessage.mockResolvedValue({ id: 7, status: "OPEN" });
    render(<CommunityChatScreen />);
    fireEvent(await screen.findByText("message 1"), "longPress");
    fireEvent.press(screen.getByText("Report message"));

    fireEvent.press(await screen.findByText("Spam"));
    fireEvent.press(screen.getByText("Report"));

    expect(await screen.findByText("Report sent")).toBeTruthy();
    expect(mockApi.reportMessage).toHaveBeenCalledWith("community", 1, "SPAM", "");
  });

  it("explains a report that was already filed", async () => {
    mockApi.reportMessage.mockRejectedValue({ isAxiosError: true, response: { status: 409 } });
    render(<CommunityChatScreen />);
    fireEvent(await screen.findByText("message 1"), "longPress");
    fireEvent.press(screen.getByText("Report message"));
    fireEvent.press(await screen.findByText("Spam"));
    fireEvent.press(screen.getByText("Report"));
    expect(await screen.findByText("You've already reported this message, or it was removed.")).toBeTruthy();
  });

  it("sends a GIF picked from the picker", async () => {
    render(<CommunityChatScreen />);
    await screen.findByText("message 1");
    fireEvent.press(screen.getByLabelText("GIFs and stickers"));
    fireEvent.press((await screen.findAllByLabelText("Send this GIF"))[0]);

    expect(mockSendCommunity).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "GIF",
        media: {
          url: "https://static.klipy.com/flex.webp",
          previewUrl: "https://static.klipy.com/flex-sm.webp",
          width: 200,
          height: 100,
          providerId: "gym-flex",
        },
      }),
    );
  });

  it("keeps the message bar above the keyboard on Android", async () => {
    const realOS = Platform.OS;
    (Platform as { OS: string }).OS = "android";
    try {
      render(<CommunityChatScreen />);
      await screen.findByText("message 1");
      const bodyPadding = () => StyleSheet.flatten(screen.getByTestId("chat-body").props.style).paddingBottom ?? 0;
      expect(bodyPadding()).toBe(0);

      act(() => {
        DeviceEventEmitter.emit("keyboardDidShow", { endCoordinates: { height: 311, screenX: 0, screenY: 650, width: 400 } });
      });
      expect(bodyPadding()).toBe(311);

      act(() => {
        DeviceEventEmitter.emit("keyboardDidHide", { endCoordinates: { height: 0, screenX: 0, screenY: 961, width: 400 } });
      });
      expect(bodyPadding()).toBe(0);
    } finally {
      (Platform as { OS: string }).OS = realOS;
    }
  });

  it("retries a send that failed while offline", async () => {
    mockSendCommunity.mockReturnValueOnce(false).mockReturnValue(true);
    render(<CommunityChatScreen />);
    await screen.findByText("message 1");
    fireEvent.changeText(screen.getByLabelText("Message"), "hello?");
    fireEvent.press(screen.getByLabelText("Send"));

    fireEvent.press(await screen.findByText("Not connected · Tap to retry"));
    expect(mockSendCommunity).toHaveBeenCalledTimes(2);
    expect(screen.getByText("Sending…")).toBeTruthy();
  });

  it("shows an empty state, and a retry when history won't load", async () => {
    mockApi.getCommunityHistory.mockResolvedValueOnce([]);
    const { unmount } = render(<CommunityChatScreen />);
    expect(await screen.findByText("No messages yet. Say hi to the gym!")).toBeTruthy();
    unmount();

    mockApi.getCommunityHistory.mockRejectedValueOnce(new Error("offline"));
    render(<CommunityChatScreen />);
    fireEvent.press(await screen.findByText("Try again"));
    expect(await screen.findByText("message 1")).toBeTruthy();
  });
});

describe("Direct messages", () => {
  it("marks the conversation read on open and when a message arrives", async () => {
    render(<DMConversationScreen />);
    expect(await screen.findByText("hey sam")).toBeTruthy();
    expect(screen.getByText("alex")).toBeTruthy();
    expect(mockApi.getDMHistory).toHaveBeenCalledWith("alex", undefined);
    expect(mockApi.markRead).toHaveBeenCalledTimes(1);

    live(msg(11, { type: "DM", recipientUsername: "sam", content: "you there?" }));
    expect(screen.getByText("you there?")).toBeTruthy();
    expect(mockApi.markRead).toHaveBeenCalledTimes(2);
  });

  it("sends to the person in the conversation and reacts on the dm channel", async () => {
    mockApi.react.mockResolvedValue(msg(10, { type: "DM", recipientUsername: "sam", content: "hey sam", reactions: { "😂": ["sam"] } }));
    render(<DMConversationScreen />);
    await screen.findByText("hey sam");

    fireEvent.changeText(screen.getByLabelText("Message"), "yo");
    fireEvent.press(screen.getByLabelText("Send"));
    expect(mockSendDM).toHaveBeenCalledWith("alex", expect.objectContaining({ kind: "TEXT", content: "yo" }));

    fireEvent(screen.getByText("hey sam"), "longPress");
    fireEvent.press(screen.getByLabelText("React with 😂"));
    await waitFor(() => expect(mockApi.react).toHaveBeenCalledWith("dm", 10, "😂"));
  });
});
