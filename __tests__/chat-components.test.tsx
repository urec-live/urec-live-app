import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import React from "react";
import { DeviceEventEmitter, Platform, StyleSheet } from "react-native";

import ChatComposer from "@/components/chat/ChatComposer";
import { mediaSize, myReactionOf } from "@/components/chat/chatUtils";
import GifStickerPicker, { SEARCH_DEBOUNCE_MS } from "@/components/chat/GifStickerPicker";
import MessageActionsSheet from "@/components/chat/MessageActionsSheet";
import MessageBubble from "@/components/chat/MessageBubble";
import ReportMessageModal from "@/components/chat/ReportMessageModal";
import type { ChatMessageResponse } from "@/services/messagingAPI";

// expo-image as a plain view that keeps its props, so tests can see what it would load
jest.mock("expo-image", () => {
  const { createElement } = jest.requireActual("react");
  const { View } = jest.requireActual("react-native");
  return {
    Image: (props: Record<string, unknown>) =>
      createElement(View, { testID: props.testID ?? "image", accessibilityLabel: props.accessibilityLabel, ...props }),
  };
});
jest.mock("@expo/vector-icons", () => ({ MaterialCommunityIcons: () => null }));
// A 24 pt navigation bar / home indicator at the bottom
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 24, left: 0 }),
}));

const keyboard = (event: string, height = 0) =>
  act(() => {
    DeviceEventEmitter.emit(event, { endCoordinates: { height, screenX: 0, screenY: 800 - height, width: 400 } });
  });
const paddingBottom = (testID: string) => StyleSheet.flatten(screen.getByTestId(testID).props.style).paddingBottom;

const mockTrending = jest.fn();
const mockSearch = jest.fn();
jest.mock("@/services/klipyAPI", () => ({
  klipyAPI: {
    trending: (...args: unknown[]) => mockTrending(...args),
    search: (...args: unknown[]) => mockSearch(...args),
  },
}));

function msg(overrides: Partial<ChatMessageResponse> = {}): ChatMessageResponse {
  return {
    id: 1,
    senderUsername: "alex",
    content: "hello",
    sentAt: "2026-11-03T12:00:00Z",
    type: "COMMUNITY",
    kind: "TEXT",
    reactions: {},
    ...overrides,
  };
}

const GIF = { url: "https://static.klipy.com/md.webp", previewUrl: "https://static.klipy.com/sm.webp", width: 300, height: 150 };

describe("MessageBubble", () => {
  it("shows text with the sender's name in community chat", () => {
    render(<MessageBubble message={msg()} me="sam" status="sent" showSender />);
    expect(screen.getByText("hello")).toBeTruthy();
    expect(screen.getByText("alex")).toBeTruthy();
  });

  it("doesn't name me, or anyone in a DM", () => {
    const { rerender } = render(<MessageBubble message={msg({ senderUsername: "sam" })} me="sam" status="sent" showSender />);
    expect(screen.queryByText("sam")).toBeNull();
    rerender(<MessageBubble message={msg()} me="sam" status="sent" showSender={false} />);
    expect(screen.queryByText("alex")).toBeNull();
  });

  it("plays a GIF at its shape, with its preview as the placeholder", () => {
    render(<MessageBubble message={msg({ kind: "GIF", content: "", media: GIF })} me="sam" status="sent" showSender />);
    const gif = screen.getByTestId("chat-gif");
    expect(gif.props.source).toEqual({ uri: GIF.url });
    expect(gif.props.placeholder).toEqual({ uri: GIF.previewUrl });
    expect(gif.props.accessibilityLabel).toBe("GIF from alex");
    expect(gif.props.style).toEqual(expect.arrayContaining([{ width: 220, height: 110 }]));
  });

  it("shows stickers large and uncropped", () => {
    render(<MessageBubble message={msg({ kind: "STICKER", content: "", media: GIF })} me="sam" status="sent" showSender />);
    const sticker = screen.getByTestId("chat-sticker");
    expect(sticker.props.contentFit).toBe("contain");
    expect(sticker.props.style).toEqual(expect.arrayContaining([{ width: 140, height: 140 }]));
  });

  it("leaves a placeholder for deleted and removed messages, with no actions", () => {
    const onLongPress = jest.fn();
    const { rerender } = render(
      <MessageBubble
        message={msg({ deleted: true, content: "", reactions: { "🔥": ["sam"] } })}
        me="sam"
        status="sent"
        showSender
        onOpenActions={onLongPress}
        onToggleReaction={jest.fn()}
      />,
    );
    expect(screen.getByText("This message was deleted")).toBeTruthy();
    expect(screen.queryByText("🔥")).toBeNull();
    fireEvent(screen.getByText("This message was deleted"), "longPress");
    expect(onLongPress).not.toHaveBeenCalled();

    rerender(<MessageBubble message={msg({ removedByStaff: true, content: "" })} me="sam" status="sent" showSender />);
    expect(screen.getByText("Removed by staff")).toBeTruthy();
  });

  it("opens actions on a long press of a sent message", () => {
    const onLongPress = jest.fn();
    render(<MessageBubble message={msg()} me="sam" status="sent" showSender onOpenActions={onLongPress} />);
    fireEvent(screen.getByText("hello"), "longPress");
    expect(onLongPress).toHaveBeenCalled();
  });

  it("shows sending, then failed with a retry", () => {
    const onPressFailed = jest.fn();
    const onLongPress = jest.fn();
    const mine = msg({ senderUsername: "sam", id: -1 });
    const { rerender } = render(
      <MessageBubble message={mine} me="sam" status="sending" showSender onOpenActions={onLongPress} />,
    );
    expect(screen.getByText("Sending…")).toBeTruthy();
    fireEvent(screen.getByText("hello"), "longPress");
    expect(onLongPress).not.toHaveBeenCalled();

    rerender(<MessageBubble message={mine} me="sam" status="failed" error="Not connected" showSender onPressFailed={onPressFailed} />);
    fireEvent.press(screen.getByText("Not connected · Tap to retry"));
    expect(onPressFailed).toHaveBeenCalledTimes(1);
  });

  it("shows reaction counts, highlights mine, and toggles on tap", () => {
    const onToggle = jest.fn();
    render(
      <MessageBubble
        message={msg({ reactions: { "🔥": ["sam", "jo"], "💪": ["jo"] } })}
        me="sam"
        status="sent"
        showSender
        onToggleReaction={onToggle}
      />,
    );
    const fire = screen.getByLabelText("🔥 2 reactions, including yours");
    expect(fire.props.accessibilityState).toEqual({ selected: true });
    expect(screen.getByLabelText("💪 1 reaction")).toBeTruthy();
    fireEvent.press(screen.getByLabelText("💪 1 reaction"));
    expect(onToggle).toHaveBeenCalledWith("💪");
  });
});

describe("chat helpers", () => {
  it("finds my reaction", () => {
    expect(myReactionOf(msg({ reactions: { "👍": ["jo"], "😂": ["sam"] } }), "sam")).toBe("😂");
    expect(myReactionOf(msg({ reactions: { "👍": ["jo"] } }), "sam")).toBeUndefined();
    expect(myReactionOf(msg(), undefined)).toBeUndefined();
  });

  it("sizes media to fit, keeping its shape", () => {
    expect(mediaSize({ url: "u", width: 300, height: 150 }, "GIF")).toEqual({ width: 220, height: 110 });
    // Tall GIFs are capped by height
    expect(mediaSize({ url: "u", width: 100, height: 400 }, "GIF")).toEqual({ width: 65, height: 260 });
    expect(mediaSize({ url: "u" }, "GIF")).toEqual({ width: 220, height: 220 });
    expect(mediaSize({ url: "u", width: 300, height: 150 }, "STICKER")).toEqual({ width: 140, height: 140 });
  });
});

describe("GifStickerPicker", () => {
  const item = (id: string) => ({ id, url: `https://static.klipy.com/${id}.webp`, previewUrl: `https://static.klipy.com/${id}-sm.webp`, width: 200, height: 200 });

  beforeEach(() => {
    mockTrending.mockReset().mockResolvedValue({ items: [item("t1"), item("t2")], nextPage: null });
    mockSearch.mockReset().mockResolvedValue({ items: [item("s1")], nextPage: null });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("opens on trending GIFs and credits KLIPY", async () => {
    render(<GifStickerPicker visible onClose={jest.fn()} onSelect={jest.fn()} />);
    expect(await screen.findAllByLabelText("Send this GIF")).toHaveLength(2);
    expect(mockTrending).toHaveBeenCalledWith("gifs", 1);
    expect(screen.getByText("Powered by KLIPY")).toBeTruthy();
  });

  it("searches once typing pauses", async () => {
    jest.useFakeTimers();
    render(<GifStickerPicker visible onClose={jest.fn()} onSelect={jest.fn()} />);
    await act(async () => {});

    fireEvent.changeText(screen.getByLabelText("Search GIFs"), "dead");
    fireEvent.changeText(screen.getByLabelText("Search GIFs"), "deadlift");
    act(() => jest.advanceTimersByTime(SEARCH_DEBOUNCE_MS - 1));
    expect(mockSearch).not.toHaveBeenCalled();

    await act(async () => {
      jest.advanceTimersByTime(1);
    });
    expect(mockSearch).toHaveBeenCalledTimes(1);
    expect(mockSearch).toHaveBeenCalledWith("gifs", "deadlift", 1);
    expect(screen.getAllByLabelText("Send this GIF")).toHaveLength(1);
  });

  it("switches to stickers", async () => {
    render(<GifStickerPicker visible onClose={jest.fn()} onSelect={jest.fn()} />);
    await screen.findAllByLabelText("Send this GIF");
    fireEvent.press(screen.getByText("Stickers"));
    expect(await screen.findAllByLabelText("Send this sticker")).toHaveLength(2);
    expect(mockTrending).toHaveBeenLastCalledWith("stickers", 1);
    expect(screen.getByLabelText("Search stickers")).toBeTruthy();
  });

  it("sends the picked item and closes", async () => {
    const onSelect = jest.fn();
    const onClose = jest.fn();
    render(<GifStickerPicker visible onClose={onClose} onSelect={onSelect} />);
    const tiles = await screen.findAllByLabelText("Send this GIF");
    fireEvent.press(tiles[1]);
    expect(onSelect).toHaveBeenCalledWith("GIF", item("t2"));
    expect(onClose).toHaveBeenCalled();
  });

  it("loads the next page when scrolled to the end", async () => {
    mockTrending.mockReset()
      .mockResolvedValueOnce({ items: [item("t1")], nextPage: 2 })
      .mockResolvedValueOnce({ items: [item("t1"), item("t3")], nextPage: null });
    render(<GifStickerPicker visible onClose={jest.fn()} onSelect={jest.fn()} />);
    await screen.findAllByLabelText("Send this GIF");

    const list = screen.UNSAFE_getByType(jest.requireActual("react-native").FlatList);
    await act(async () => {
      list.props.onEndReached();
    });
    expect(mockTrending).toHaveBeenLastCalledWith("gifs", 2);
    // t1 came back again and isn't shown twice
    expect(screen.getAllByLabelText("Send this GIF")).toHaveLength(2);
  });

  it("explains when GIFs aren't set up, and can try again", async () => {
    mockTrending.mockReset().mockRejectedValueOnce({ isAxiosError: true, response: { status: 503 } });
    mockTrending.mockResolvedValue({ items: [item("t1")], nextPage: null });
    render(<GifStickerPicker visible onClose={jest.fn()} onSelect={jest.fn()} />);
    expect(await screen.findByText("GIFs aren't set up on the server yet.")).toBeTruthy();
    fireEvent.press(screen.getByText("Try again"));
    expect(await screen.findAllByLabelText("Send this GIF")).toHaveLength(1);
  });

  it("says when a search finds nothing", async () => {
    jest.useFakeTimers();
    mockSearch.mockResolvedValue({ items: [], nextPage: null });
    render(<GifStickerPicker visible onClose={jest.fn()} onSelect={jest.fn()} />);
    await act(async () => {});
    fireEvent.changeText(screen.getByLabelText("Search GIFs"), "zzzz");
    await act(async () => {
      jest.advanceTimersByTime(SEARCH_DEBOUNCE_MS);
    });
    expect(screen.getByText('Nothing found for "zzzz"')).toBeTruthy();
  });

  it("loads nothing while hidden", () => {
    render(<GifStickerPicker visible={false} onClose={jest.fn()} onSelect={jest.fn()} />);
    expect(mockTrending).not.toHaveBeenCalled();
  });

  it("keeps the sheet clear of the home indicator, and above the keyboard on iOS", async () => {
    render(<GifStickerPicker visible onClose={jest.fn()} onSelect={jest.fn()} />);
    await screen.findAllByLabelText("Send this GIF");
    expect(paddingBottom("gif-picker-frame")).toBe(0);
    expect(paddingBottom("gif-picker-sheet")).toBe(8 + 24);

    // iOS's keyboard height already covers the home indicator
    keyboard("keyboardWillShow", 336);
    expect(paddingBottom("gif-picker-frame")).toBe(336);
    expect(paddingBottom("gif-picker-sheet")).toBe(8);

    keyboard("keyboardWillHide");
    expect(paddingBottom("gif-picker-frame")).toBe(0);
    expect(paddingBottom("gif-picker-sheet")).toBe(8 + 24);
  });

  it("keeps the sheet above the keyboard and the navigation bar on Android", async () => {
    const realOS = Platform.OS;
    (Platform as { OS: string }).OS = "android";
    try {
      render(<GifStickerPicker visible onClose={jest.fn()} onSelect={jest.fn()} />);
      await screen.findAllByLabelText("Send this GIF");
      // Android's keyboard height leaves out the navigation bar, so the sheet still keeps clear of it
      keyboard("keyboardDidShow", 311);
      expect(paddingBottom("gif-picker-frame")).toBe(311);
      expect(paddingBottom("gif-picker-sheet")).toBe(8 + 24);
      keyboard("keyboardDidHide");
      expect(paddingBottom("gif-picker-frame")).toBe(0);
    } finally {
      (Platform as { OS: string }).OS = realOS;
    }
  });
});

describe("ChatComposer", () => {
  it("opens the picker from its GIF button", () => {
    const onOpenPicker = jest.fn();
    render(<ChatComposer placeholder="Message" onSendText={jest.fn()} onOpenPicker={onOpenPicker} />);
    expect(screen.getByText("GIF")).toBeTruthy();
    fireEvent.press(screen.getByLabelText("GIFs and stickers"));
    expect(onOpenPicker).toHaveBeenCalledTimes(1);
  });
});

describe("MessageActionsSheet", () => {
  const props = { visible: true, onReact: jest.fn(), onDelete: jest.fn(), onReport: jest.fn(), onClose: jest.fn() };

  it("offers the six quick reactions with mine marked", () => {
    render(<MessageActionsSheet {...props} isMine={false} myReaction="🔥" />);
    ["👍", "❤️", "😂", "💪", "😮"].forEach((emoji) => expect(screen.getByLabelText(`React with ${emoji}`)).toBeTruthy());
    fireEvent.press(screen.getByLabelText("Remove your 🔥 reaction"));
    expect(props.onReact).toHaveBeenCalledWith("🔥");
  });

  it("offers Delete on my messages and Report on others'", () => {
    const { rerender } = render(<MessageActionsSheet {...props} isMine />);
    expect(screen.queryByText("Report message")).toBeNull();
    fireEvent.press(screen.getByText("Delete message"));
    expect(props.onDelete).toHaveBeenCalled();

    rerender(<MessageActionsSheet {...props} isMine={false} />);
    expect(screen.queryByText("Delete message")).toBeNull();
    fireEvent.press(screen.getByText("Report message"));
    expect(props.onReport).toHaveBeenCalled();
  });
});

describe("ReportMessageModal", () => {
  it("needs a reason, sends it with the note, and confirms", async () => {
    const onSubmit = jest.fn(() => Promise.resolve());
    const onClose = jest.fn();
    render(<ReportMessageModal visible senderUsername="alex" onSubmit={onSubmit} onClose={onClose} />);
    expect(screen.getByText("Why are you reporting alex's message?")).toBeTruthy();

    fireEvent.press(screen.getByText("Report"));
    expect(onSubmit).not.toHaveBeenCalled();

    fireEvent.press(screen.getByText("Harassment or bullying"));
    fireEvent.changeText(screen.getByLabelText("Details"), "keeps doing it");
    fireEvent.press(screen.getByText("Report"));

    expect(await screen.findByText("Report sent")).toBeTruthy();
    expect(onSubmit).toHaveBeenCalledWith("HARASSMENT", "keeps doing it");
    fireEvent.press(screen.getByText("Done"));
    expect(onClose).toHaveBeenCalled();
  });

  it("shows why a report failed", async () => {
    const onSubmit = jest.fn(() => Promise.reject(new Error("You've already reported this message, or it was removed.")));
    render(<ReportMessageModal visible senderUsername="alex" onSubmit={onSubmit} onClose={jest.fn()} />);
    fireEvent.press(screen.getByText("Spam"));
    fireEvent.press(screen.getByText("Report"));
    await waitFor(() =>
      expect(screen.getByText("You've already reported this message, or it was removed.")).toBeTruthy(),
    );
    expect(screen.queryByText("Report sent")).toBeNull();
  });
});
