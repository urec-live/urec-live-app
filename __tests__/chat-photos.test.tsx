import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import React from "react";

import DMInboxScreen from "@/app/chat/dm/index";
import CommunityChatScreen from "@/app/chat/community";
import MessageBubble from "@/components/chat/MessageBubble";
import PhotoPreviewModal from "@/components/chat/PhotoPreviewModal";
import PhotoSourceSheet from "@/components/chat/PhotoSourceSheet";
import PhotoViewer from "@/components/chat/PhotoViewer";
import type { ChatMessageResponse } from "@/services/messagingAPI";
import { BACKEND_ORIGIN } from "@/services/networkConfig";

// expo-image as a plain view that keeps its props, so tests can see what it would load
jest.mock("expo-image", () => {
  const { createElement } = jest.requireActual("react");
  const { View } = jest.requireActual("react-native");
  return {
    Image: (props: Record<string, unknown>) =>
      createElement(View, { testID: props.testID ?? "image", accessibilityLabel: props.accessibilityLabel, ...props }),
  };
});
jest.mock("@expo/vector-icons", () => ({
  MaterialCommunityIcons: (props: { testID?: string; name: string }) => {
    const { createElement } = jest.requireActual("react");
    const { View } = jest.requireActual("react-native");
    return props.testID ? createElement(View, { testID: props.testID, accessibilityHint: props.name }) : null;
  },
}));
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

const mockPush = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn() }),
  useLocalSearchParams: () => ({}),
  useFocusEffect: jest.fn(),
}));
jest.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { username: "sam" } }) }));

const mockConversations: { current: unknown[] } = { current: [] };
jest.mock("@/hooks/useCachedResource", () => ({
  useCachedResource: () => ({ data: mockConversations.current, loading: false, revalidate: jest.fn() }),
}));
jest.mock("@/services/cachedResources", () => ({ cacheKeys: { user: (u: string, k: string) => `${u}:${k}` } }));

const mockLive: ((m: ChatMessageResponse) => void)[] = [];
const mockSendCommunity = jest.fn((_m: unknown) => true);
jest.mock("@/services/websocketService", () => ({
  __esModule: true,
  default: {
    connect: jest.fn(),
    sendCommunityMessage: (m: unknown) => mockSendCommunity(m),
    sendDM: jest.fn(() => true),
    subscribeToCommunity: (cb: (m: ChatMessageResponse) => void) => {
      mockLive.push(cb);
      return () => mockLive.splice(mockLive.indexOf(cb), 1);
    },
    subscribeToUserQueue: () => () => {},
    subscribeToChatErrors: () => () => {},
    onConnect: () => () => {},
  },
}));

const mockApi = {
  getCommunityHistory: jest.fn(),
  uploadPhoto: jest.fn(),
};
jest.mock("@/services/messagingAPI", () => ({
  messagingAPI: {
    getCommunityHistory: (...a: unknown[]) => mockApi.getCommunityHistory(...a),
    getDMHistory: jest.fn(async () => []),
    getConversations: jest.fn(async () => []),
    uploadPhoto: (...a: unknown[]) => mockApi.uploadPhoto(...a),
  },
}));
jest.mock("@/services/klipyAPI", () => ({ klipyAPI: { trending: jest.fn(async () => ({ items: [] })), search: jest.fn() } }));

const mockPickChatPhoto = jest.fn();
jest.mock("@/utils/chatPhotos", () => {
  class PhotoPermissionError extends Error {}
  return {
    PhotoPermissionError,
    pickChatPhoto: (...a: unknown[]) => mockPickChatPhoto(...a),
  };
});

function photoMessage(overrides: Partial<ChatMessageResponse> = {}): ChatMessageResponse {
  return {
    id: 7,
    senderUsername: "alex",
    content: "squat form?",
    sentAt: "2026-11-05T12:00:00Z",
    type: "COMMUNITY",
    kind: "IMAGE",
    media: { url: "/api/messaging/media/31/raw?exp=9&sig=abc", width: 1600, height: 1200, mediaId: 31 },
    reactions: {},
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockLive.length = 0;
  mockSendCommunity.mockReturnValue(true);
  mockApi.getCommunityHistory.mockResolvedValue([]);
  mockConversations.current = [];
});

describe("MessageBubble photos", () => {
  it("shows the photo by its stable cache key, sized to its shape, with the caption", () => {
    const onOpenPhoto = jest.fn();
    const onOpenActions = jest.fn();
    render(
      <MessageBubble
        message={photoMessage()}
        me="sam"
        status="sent"
        showSender
        onOpenPhoto={onOpenPhoto}
        onOpenActions={onOpenActions}
      />,
    );

    const image = screen.getByTestId("chat-photo");
    expect(image.props.source).toEqual({
      uri: `${BACKEND_ORIGIN}/api/messaging/media/31/raw?exp=9&sig=abc`,
      cacheKey: "chat-media-31",
    });
    expect(image.props.style).toEqual(expect.arrayContaining([{ width: 240, height: 180 }]));
    expect(image.props.accessibilityLabel).toBe("Photo from alex");
    expect(screen.getByText("squat form?")).toBeTruthy();
    expect(screen.getByText("alex")).toBeTruthy();

    fireEvent.press(screen.getByText("squat form?"));
    expect(onOpenPhoto).toHaveBeenCalledTimes(1);
    fireEvent(screen.getByText("squat form?"), "longPress");
    expect(onOpenActions).toHaveBeenCalledTimes(1);
  });

  it("an R2 URL is used as is", () => {
    const url = "https://acct.r2.cloudflarestorage.com/urec-chat/chat-media/x.jpg?X-Amz-Signature=f";
    render(<MessageBubble message={photoMessage({ media: { url, mediaId: 2 } })} me="sam" status="sent" showSender={false} />);
    expect(screen.getByTestId("chat-photo").props.source).toEqual({ uri: url, cacheKey: "chat-media-2" });
  });

  it("my photo uploading shows its local file and progress, and can't be opened yet", () => {
    const onOpenPhoto = jest.fn();
    render(
      <MessageBubble
        message={photoMessage({
          id: -1,
          senderUsername: "sam",
          content: "",
          media: { url: "file:///cache/shot.jpg", width: 1200, height: 1600 },
        })}
        me="sam"
        status="sending"
        progress={0.42}
        localUri="file:///cache/shot.jpg"
        showSender
        onOpenPhoto={onOpenPhoto}
      />,
    );
    const image = screen.getByTestId("chat-photo");
    expect(image.props.source).toEqual({ uri: "file:///cache/shot.jpg", cacheKey: undefined });
    // No placeholder of itself
    expect(image.props.placeholder).toBeUndefined();
    expect(image.props.style).toEqual(expect.arrayContaining([{ width: 225, height: 300 }]));
    expect(screen.getByLabelText("Uploading photo, 42%")).toBeTruthy();
    expect(screen.getByText("42%")).toBeTruthy();
    fireEvent.press(image);
    expect(onOpenPhoto).not.toHaveBeenCalled();
  });

  it("my sent photo shows the local file while the server's copy loads", () => {
    render(
      <MessageBubble
        message={photoMessage({ senderUsername: "sam" })}
        me="sam"
        status="sent"
        localUri="file:///cache/shot.jpg"
        showSender
      />,
    );
    expect(screen.getByTestId("chat-photo").props.placeholder).toEqual({ uri: "file:///cache/shot.jpg" });
    expect(screen.queryByTestId("photo-progress")).toBeNull();
  });

  it("a failed photo send taps to retry, not to open", () => {
    const onPressFailed = jest.fn();
    const onOpenPhoto = jest.fn();
    render(
      <MessageBubble
        message={photoMessage({ id: -1, senderUsername: "sam", media: { url: "file:///x.jpg" } })}
        me="sam"
        status="failed"
        error="Photo too large"
        showSender
        onPressFailed={onPressFailed}
        onOpenPhoto={onOpenPhoto}
      />,
    );
    fireEvent.press(screen.getByLabelText("Photo too large. Tap to retry"));
    fireEvent.press(screen.getByTestId("chat-photo"));
    expect(onPressFailed).toHaveBeenCalledTimes(2);
    expect(onOpenPhoto).not.toHaveBeenCalled();
  });

  it("says the photo is unavailable when there's no URL or it fails to load", () => {
    const onOpenPhoto = jest.fn();
    const { rerender } = render(
      <MessageBubble message={photoMessage({ media: null })} me="sam" status="sent" showSender onOpenPhoto={onOpenPhoto} />,
    );
    expect(screen.getByText("Photo unavailable")).toBeTruthy();
    fireEvent.press(screen.getByText("Photo unavailable"));
    expect(onOpenPhoto).not.toHaveBeenCalled();

    rerender(<MessageBubble message={photoMessage()} me="sam" status="sent" showSender onOpenPhoto={onOpenPhoto} />);
    expect(screen.queryByText("Photo unavailable")).toBeNull();
    act(() => screen.getByTestId("chat-photo").props.onError());
    expect(screen.getByText("Photo unavailable")).toBeTruthy();

    // A fresh URL (say, from reloading history) tries again
    rerender(
      <MessageBubble
        message={photoMessage({ media: { url: "/api/messaging/media/31/raw?exp=99&sig=new", mediaId: 31 } })}
        me="sam"
        status="sent"
        showSender
      />,
    );
    expect(screen.getByTestId("chat-photo")).toBeTruthy();
  });

  it("deleted and removed photos are placeholders", () => {
    const { rerender } = render(
      <MessageBubble message={photoMessage({ deleted: true, media: null, content: "" })} me="sam" status="sent" showSender />,
    );
    expect(screen.getByText("This message was deleted")).toBeTruthy();
    expect(screen.queryByTestId("chat-photo")).toBeNull();
    rerender(
      <MessageBubble message={photoMessage({ removedByStaff: true, media: null, content: "" })} me="sam" status="sent" showSender />,
    );
    expect(screen.getByText("Removed by staff")).toBeTruthy();
  });
});

describe("photo sheets", () => {
  it("the source sheet offers the camera and the library", () => {
    const onPick = jest.fn();
    const onClose = jest.fn();
    render(<PhotoSourceSheet visible onPick={onPick} onClose={onClose} />);
    fireEvent.press(screen.getByText("Take photo"));
    fireEvent.press(screen.getByText("Choose from library"));
    fireEvent.press(screen.getByText("Cancel"));
    expect(onPick.mock.calls).toEqual([["camera"], ["library"]]);
    expect(onClose).toHaveBeenCalled();
  });

  it("the preview sends the trimmed caption and starts empty for each photo", () => {
    const onSend = jest.fn();
    const onClose = jest.fn();
    const photo = { uri: "file:///a.jpg", width: 10, height: 10 };
    const { rerender } = render(<PhotoPreviewModal photo={photo} onSend={onSend} onClose={onClose} />);
    expect(screen.getByTestId("photo-preview-image").props.source).toEqual({ uri: "file:///a.jpg" });

    fireEvent.changeText(screen.getByLabelText("Caption"), "  deadlift day  ");
    fireEvent.press(screen.getByLabelText("Send photo"));
    expect(onSend).toHaveBeenCalledWith("deadlift day");
    expect(screen.getByLabelText("Caption").props.maxLength).toBe(500);

    rerender(<PhotoPreviewModal photo={{ ...photo, uri: "file:///b.jpg" }} onSend={onSend} onClose={onClose} />);
    expect(screen.getByLabelText("Caption").props.value).toBe("");
    fireEvent.press(screen.getByLabelText("Cancel photo"));
    expect(onClose).toHaveBeenCalled();
  });

  it("the viewer shows the photo full screen with the same cache key, and closes", () => {
    const onClose = jest.fn();
    render(<PhotoViewer message={photoMessage()} onClose={onClose} />);
    expect(screen.getByTestId("photo-viewer-image").props.source).toEqual({
      uri: `${BACKEND_ORIGIN}/api/messaging/media/31/raw?exp=9&sig=abc`,
      cacheKey: "chat-media-31",
    });
    expect(screen.getByText("squat form?")).toBeTruthy();
    fireEvent.press(screen.getByLabelText("Close photo"));
    expect(onClose).toHaveBeenCalled();
  });
});

describe("sending a photo from the chat screen", () => {
  it("📷 → library → preview with caption → uploads and sends it as an IMAGE message", async () => {
    mockPickChatPhoto.mockResolvedValue({ uri: "file:///cache/shot.jpg", width: 1600, height: 1200 });
    mockApi.uploadPhoto.mockResolvedValue({ mediaId: 55, width: 1600, height: 1200 });
    render(<CommunityChatScreen />);
    await waitFor(() => expect(mockApi.getCommunityHistory).toHaveBeenCalled());

    fireEvent.press(await screen.findByLabelText("Send a photo"));
    fireEvent.press(screen.getByText("Choose from library"));
    await waitFor(() => expect(mockPickChatPhoto).toHaveBeenCalledWith("library"));

    expect(await screen.findByTestId("photo-preview-image")).toBeTruthy();
    fireEvent.changeText(screen.getByLabelText("Caption"), "pr!");
    fireEvent.press(screen.getByLabelText("Send photo"));

    await waitFor(() =>
      expect(mockSendCommunity).toHaveBeenCalledWith(
        expect.objectContaining({ kind: "IMAGE", content: "pr!", media: { mediaId: 55 } }),
      ),
    );
    expect(mockApi.uploadPhoto).toHaveBeenCalledWith("file:///cache/shot.jpg", expect.any(Function), expect.any(Object));
    expect(screen.queryByTestId("photo-preview-image")).toBeNull();
    expect(screen.getByText("pr!")).toBeTruthy();
  });

  it("opens a sent photo full screen from the chat", async () => {
    mockApi.getCommunityHistory.mockResolvedValue([photoMessage()]);
    render(<CommunityChatScreen />);
    fireEvent.press(await screen.findByText("squat form?"));
    expect(screen.getByTestId("photo-viewer-image")).toBeTruthy();
  });

  it("explains when camera access is off", async () => {
    const { PhotoPermissionError } = jest.requireMock("@/utils/chatPhotos");
    mockPickChatPhoto.mockRejectedValue(new PhotoPermissionError());
    render(<CommunityChatScreen />);
    fireEvent.press(await screen.findByLabelText("Send a photo"));
    fireEvent.press(screen.getByText("Take photo"));
    expect(await screen.findByText("Allow camera access in Settings to take photos.")).toBeTruthy();
    expect(mockApi.uploadPhoto).not.toHaveBeenCalled();
  });

  it("does nothing when the member backs out of the picker", async () => {
    mockPickChatPhoto.mockResolvedValue(null);
    render(<CommunityChatScreen />);
    fireEvent.press(await screen.findByLabelText("Send a photo"));
    fireEvent.press(screen.getByText("Choose from library"));
    await waitFor(() => expect(mockPickChatPhoto).toHaveBeenCalled());
    expect(screen.queryByTestId("photo-preview-image")).toBeNull();
    expect(mockApi.uploadPhoto).not.toHaveBeenCalled();
  });
});

describe("DM inbox", () => {
  it("previews a photo with a camera icon and the server's label", async () => {
    mockConversations.current = [
      { partnerUsername: "alex", lastMessage: "Photo", lastKind: "IMAGE", lastSentAt: "2026-11-05T12:00:00Z", unread: true },
      { partnerUsername: "jo", lastMessage: "GIF", lastKind: "GIF", lastSentAt: "2026-11-05T11:00:00Z", unread: false },
    ];
    render(<DMInboxScreen />);
    expect(await screen.findByText("Photo")).toBeTruthy();
    expect(screen.getByTestId("preview-icon-IMAGE").props.accessibilityHint).toBe("camera");
    expect(screen.getByTestId("preview-icon-GIF").props.accessibilityHint).toBe("file-gif-box");
  });
});
