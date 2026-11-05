import { act, renderHook, waitFor } from "@testing-library/react-native";

import { SEND_TIMEOUT_MS, upsertMessage, useChatMessages } from "@/hooks/useChatMessages";
import type { ChatMessageResponse } from "@/services/messagingAPI";

// A stand-in socket: tests deliver live messages, errors and reconnects by hand
const mockLive: ((m: ChatMessageResponse) => void)[] = [];
const mockErrors: ((e: { clientId: string | null; code: string; message: string }) => void)[] = [];
const mockConnects: (() => void)[] = [];
const mockWs = {
  connect: jest.fn(),
  sendCommunityMessage: jest.fn((_message: unknown) => true),
  sendDM: jest.fn((_recipient: string, _message: unknown) => true),
};
jest.mock("@/services/websocketService", () => ({
  __esModule: true,
  default: {
    connect: () => mockWs.connect(),
    sendCommunityMessage: (m: unknown) => mockWs.sendCommunityMessage(m),
    sendDM: (r: string, m: unknown) => mockWs.sendDM(r, m),
    subscribeToCommunity: (cb: (m: ChatMessageResponse) => void) => {
      mockLive.push(cb);
      return () => mockLive.splice(mockLive.indexOf(cb), 1);
    },
    subscribeToUserQueue: (cb: (m: ChatMessageResponse) => void) => {
      mockLive.push(cb);
      return () => mockLive.splice(mockLive.indexOf(cb), 1);
    },
    subscribeToChatErrors: (cb: (e: any) => void) => {
      mockErrors.push(cb);
      return () => mockErrors.splice(mockErrors.indexOf(cb), 1);
    },
    onConnect: (cb: () => void) => {
      mockConnects.push(cb);
      return () => mockConnects.splice(mockConnects.indexOf(cb), 1);
    },
  },
}));

const mockGetCommunityHistory = jest.fn();
const mockGetDMHistory = jest.fn();
jest.mock("@/services/messagingAPI", () => ({
  HISTORY_PAGE_SIZE: 50,
  messagingAPI: {
    getCommunityHistory: (...args: unknown[]) => mockGetCommunityHistory(...args),
    getDMHistory: (...args: unknown[]) => mockGetDMHistory(...args),
  },
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

function renderCommunity(onIncoming?: (m: ChatMessageResponse) => void) {
  return renderHook(() => useChatMessages({ channel: "community", me: "sam", onIncoming }));
}

beforeEach(() => {
  mockLive.length = 0;
  mockErrors.length = 0;
  mockConnects.length = 0;
  jest.clearAllMocks();
  mockWs.sendCommunityMessage.mockReturnValue(true);
  mockWs.sendDM.mockReturnValue(true);
  mockGetCommunityHistory.mockResolvedValue([msg(1), msg(2)]);
  mockGetDMHistory.mockResolvedValue([]);
});

afterEach(() => {
  jest.useRealTimers();
});

describe("useChatMessages", () => {
  it("loads the newest page and lists rows newest first", async () => {
    const { result } = renderCommunity();
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(mockWs.connect).toHaveBeenCalled();
    expect(mockGetCommunityHistory).toHaveBeenCalledWith(undefined);
    expect(result.current.rows.map((r) => r.message.id)).toEqual([2, 1]);
    expect(result.current.rows.every((r) => r.status === "sent")).toBe(true);
    expect(result.current.hasMore).toBe(false);
  });

  it("knows there may be older messages when the page was full, and loads them", async () => {
    const page = Array.from({ length: 50 }, (_, i) => msg(100 + i));
    mockGetCommunityHistory.mockResolvedValueOnce(page).mockResolvedValueOnce([msg(98), msg(99)]);
    const { result } = renderCommunity();
    await waitFor(() => expect(result.current.hasMore).toBe(true));

    await act(() => result.current.loadOlder());

    expect(mockGetCommunityHistory).toHaveBeenLastCalledWith(100);
    expect(result.current.rows).toHaveLength(52);
    expect(result.current.rows[result.current.rows.length - 1].message.id).toBe(98);
    expect(result.current.hasMore).toBe(false);

    // Nothing more to load
    await act(() => result.current.loadOlder());
    expect(mockGetCommunityHistory).toHaveBeenCalledTimes(2);
  });

  it("adds live messages and replaces updated ones by id", async () => {
    const onIncoming = jest.fn();
    const { result } = renderCommunity(onIncoming);
    await waitFor(() => expect(result.current.loading).toBe(false));

    live(msg(3));
    expect(result.current.rows[0].message.id).toBe(3);
    expect(onIncoming).toHaveBeenCalledTimes(1);

    // A reaction arrives as the whole message again
    live(msg(2, { reactions: { "🔥": ["sam"] } }));
    expect(result.current.rows).toHaveLength(3);
    expect(result.current.rows[1].message.reactions).toEqual({ "🔥": ["sam"] });
    expect(onIncoming).toHaveBeenCalledTimes(1);

    // A deleted message keeps its place
    live(msg(1, { deleted: true, content: "" }));
    expect(result.current.rows[2].message.deleted).toBe(true);
  });

  it("only tells about other people's new messages", async () => {
    const onIncoming = jest.fn();
    const { result } = renderCommunity(onIncoming);
    await waitFor(() => expect(result.current.loading).toBe(false));
    live(msg(5, { senderUsername: "sam" }));
    expect(onIncoming).not.toHaveBeenCalled();
  });

  it("only shows the open conversation's DMs", async () => {
    mockGetDMHistory.mockResolvedValue([msg(1, { type: "DM", recipientUsername: "sam" })]);
    const { result } = renderHook(() => useChatMessages({ channel: "dm", partner: "alex", me: "sam" }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockGetDMHistory).toHaveBeenCalledWith("alex", undefined);

    live(msg(2, { type: "DM", senderUsername: "jo", recipientUsername: "sam" }));
    live(msg(3, { type: "DM", senderUsername: "sam", recipientUsername: "alex" }));
    expect(result.current.rows.map((r) => r.message.id)).toEqual([3, 1]);
  });

  it("shows a send at once and swaps it for the saved message when the server echoes it", async () => {
    const { result } = renderCommunity();
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.send({ kind: "TEXT", content: "  hello  " }));
    const sent = mockWs.sendCommunityMessage.mock.calls[0][0] as { clientId: string };
    expect(sent).toEqual({ clientId: expect.stringMatching(/^[A-Za-z0-9_-]{1,36}$/), kind: "TEXT", content: "hello" });
    expect(result.current.rows[0]).toMatchObject({ status: "sending", message: { content: "hello", senderUsername: "sam" } });

    live(msg(3, { senderUsername: "sam", content: "hello", clientId: sent.clientId }));
    expect(result.current.rows.map((r) => [r.message.id, r.status])).toEqual([
      [3, "sent"],
      [2, "sent"],
      [1, "sent"],
    ]);
  });

  it("sends GIFs and stickers with their media", async () => {
    const { result } = renderCommunity();
    await waitFor(() => expect(result.current.loading).toBe(false));
    const media = { url: "https://static.klipy.com/a.webp", previewUrl: "https://static.klipy.com/s.webp", width: 200, height: 100, providerId: "a" };

    act(() => result.current.send({ kind: "STICKER", media }));
    expect(mockWs.sendCommunityMessage).toHaveBeenCalledWith(expect.objectContaining({ kind: "STICKER", media }));
    expect(result.current.rows[0].message).toMatchObject({ kind: "STICKER", media, content: "" });
  });

  it("ignores blank text", async () => {
    const { result } = renderCommunity();
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.send({ kind: "TEXT", content: "   " }));
    expect(mockWs.sendCommunityMessage).not.toHaveBeenCalled();
  });

  it("marks a send failed when the server rejects it, and retries with the same clientId", async () => {
    const { result } = renderCommunity();
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.send({ kind: "TEXT", content: "too long?" }));
    const { clientId } = mockWs.sendCommunityMessage.mock.calls[0][0] as { clientId: string };

    act(() => mockErrors.forEach((cb) => cb({ clientId, code: "TOO_LONG", message: "Messages can be at most 500 characters" })));
    expect(result.current.rows[0]).toMatchObject({ status: "failed", error: "Messages can be at most 500 characters" });

    // Someone else's error is not ours
    act(() => mockErrors.forEach((cb) => cb({ clientId: "other", code: "EMPTY", message: "x" })));

    act(() => result.current.retry(clientId));
    expect(result.current.rows[0].status).toBe("sending");
    expect((mockWs.sendCommunityMessage.mock.calls[1][0] as { clientId: string }).clientId).toBe(clientId);
  });

  it("marks a send failed straight away while offline", async () => {
    mockWs.sendCommunityMessage.mockReturnValue(false);
    const { result } = renderCommunity();
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.send({ kind: "TEXT", content: "offline" }));
    expect(result.current.rows[0]).toMatchObject({ status: "failed", error: "Not connected" });
  });

  it("marks a send failed when no echo comes in time", async () => {
    jest.useFakeTimers();
    const { result } = renderCommunity();
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.send({ kind: "TEXT", content: "lost" }));

    act(() => jest.advanceTimersByTime(SEND_TIMEOUT_MS - 1));
    expect(result.current.rows[0].status).toBe("sending");
    act(() => jest.advanceTimersByTime(1));
    expect(result.current.rows[0]).toMatchObject({ status: "failed", error: "Not sent" });
  });

  it("can discard a failed send", async () => {
    mockWs.sendCommunityMessage.mockReturnValue(false);
    const { result } = renderCommunity();
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.send({ kind: "TEXT", content: "never mind" }));
    const clientId = result.current.rows[0].message.clientId as string;
    act(() => result.current.discard(clientId));
    expect(result.current.rows.map((r) => r.message.id)).toEqual([2, 1]);
  });

  it("catches up after a reconnect, settling sends the server saved meanwhile", async () => {
    const { result } = renderCommunity();
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.send({ kind: "TEXT", content: "during the blip" }));
    const { clientId } = mockWs.sendCommunityMessage.mock.calls[0][0] as { clientId: string };

    mockGetCommunityHistory.mockResolvedValue([msg(2), msg(3, { senderUsername: "sam", clientId }), msg(4)]);
    await act(async () => {
      mockConnects.forEach((cb) => cb());
    });

    await waitFor(() => expect(result.current.rows.map((r) => r.message.id)).toEqual([4, 3, 2, 1]));
    expect(result.current.rows.every((r) => r.status === "sent")).toBe(true);
  });

  it("shows a load error and recovers on reload", async () => {
    mockGetCommunityHistory.mockRejectedValueOnce(new Error("offline"));
    const { result } = renderCommunity();
    await waitFor(() => expect(result.current.loadError).toBe(true));

    await act(() => result.current.reload());
    expect(result.current.loadError).toBe(false);
    expect(result.current.rows).toHaveLength(2);
  });

  it("stops listening when unmounted", async () => {
    const { result, unmount } = renderCommunity();
    await waitFor(() => expect(result.current.loading).toBe(false));
    unmount();
    expect(mockLive).toHaveLength(0);
    expect(mockErrors).toHaveLength(0);
    expect(mockConnects).toHaveLength(0);
  });
});

describe("upsertMessage", () => {
  it("replaces by id, appends newer ones in order, and skips ones older than the loaded page", () => {
    const list = [msg(5), msg(7)];
    expect(upsertMessage(list, msg(7, { content: "edited" }))[1].content).toBe("edited");
    expect(upsertMessage(list, msg(9)).map((m) => m.id)).toEqual([5, 7, 9]);
    expect(upsertMessage(list, msg(6)).map((m) => m.id)).toEqual([5, 6, 7]);
    expect(upsertMessage(list, msg(2))).toBe(list);
    expect(upsertMessage([], msg(1)).map((m) => m.id)).toEqual([1]);
  });
});
