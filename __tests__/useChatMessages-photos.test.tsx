import { act, renderHook, waitFor } from "@testing-library/react-native";
import { AxiosError, AxiosHeaders } from "axios";

import { SEND_TIMEOUT_MS, useChatMessages } from "@/hooks/useChatMessages";
import type { ChatMessageResponse } from "@/services/messagingAPI";

// A stand-in socket, as in useChatMessages.test.tsx
const mockLive: ((m: ChatMessageResponse) => void)[] = [];
const mockErrors: ((e: { clientId: string | null; code: string; message: string }) => void)[] = [];
const mockWs = {
  sendCommunityMessage: jest.fn((_message: unknown) => true),
  sendDM: jest.fn((_recipient: string, _message: unknown) => true),
};
jest.mock("@/services/websocketService", () => ({
  __esModule: true,
  default: {
    connect: jest.fn(),
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
    onConnect: () => () => {},
  },
}));

/** Each upload as the hook started it, so a test can report progress and finish it when it likes. */
interface Upload {
  uri: string;
  onProgress?: (fraction: number) => void;
  signal?: AbortSignal;
  resolve: (value: { mediaId: number; width: number; height: number }) => void;
  reject: (error: unknown) => void;
}
const uploads: Upload[] = [];
const mockUploadPhoto = jest.fn(
  (uri: string, onProgress?: (fraction: number) => void, signal?: AbortSignal) =>
    new Promise((resolve, reject) => uploads.push({ uri, onProgress, signal, resolve, reject })),
);
jest.mock("@/services/messagingAPI", () => ({
  HISTORY_PAGE_SIZE: 50,
  messagingAPI: {
    getCommunityHistory: jest.fn(async () => []),
    getDMHistory: jest.fn(async () => []),
    uploadPhoto: (...args: [string, ((f: number) => void)?, AbortSignal?]) => mockUploadPhoto(...args),
  },
}));

const PHOTO = { uri: "file:///cache/shot.jpg", width: 1600, height: 1200 };

function tooLarge(): AxiosError {
  const error = new AxiosError("too large");
  error.response = { status: 413, data: {}, statusText: "", headers: {}, config: { headers: new AxiosHeaders() } };
  return error;
}

async function renderRoom(channel: "community" | "dm" = "community") {
  const hook = renderHook(() =>
    useChatMessages(channel === "dm" ? { channel, partner: "alex", me: "sam" } : { channel, me: "sam" }),
  );
  await waitFor(() => expect(hook.result.current.loading).toBe(false));
  return hook;
}

const sent = () => mockWs.sendCommunityMessage.mock.calls.map((c) => c[0] as any);

beforeEach(() => {
  mockLive.length = 0;
  mockErrors.length = 0;
  uploads.length = 0;
  jest.clearAllMocks();
  mockWs.sendCommunityMessage.mockReturnValue(true);
  mockWs.sendDM.mockReturnValue(true);
});

afterEach(() => {
  jest.useRealTimers();
});

it("uploads a photo with progress, sends it with its mediaId, and settles on the echo", async () => {
  const { result } = await renderRoom();

  act(() => result.current.send({ kind: "IMAGE", photo: PHOTO, caption: "  new PR  " }));

  // Shown at once from the local file, uploading
  let row = result.current.rows[0];
  expect(row.status).toBe("sending");
  expect(row.progress).toBe(0);
  expect(row.localUri).toBe(PHOTO.uri);
  expect(row.message).toMatchObject({ kind: "IMAGE", content: "new PR", media: { url: PHOTO.uri, width: 1600, height: 1200 } });
  expect(mockUploadPhoto).toHaveBeenCalledWith(PHOTO.uri, expect.any(Function), expect.any(Object));
  expect(sent()).toHaveLength(0);

  act(() => uploads[0].onProgress!(0.4));
  expect(result.current.rows[0].progress).toBe(0.4);

  await act(async () => uploads[0].resolve({ mediaId: 77, width: 1600, height: 1200 }));
  expect(result.current.rows[0].progress).toBeUndefined();
  const payload = sent()[0];
  expect(payload).toEqual({ clientId: expect.any(String), kind: "IMAGE", content: "new PR", media: { mediaId: 77 } });

  act(() =>
    mockLive.forEach((cb) =>
      cb({
        id: 500,
        senderUsername: "sam",
        content: "new PR",
        sentAt: "2026-11-05T12:00:00Z",
        type: "COMMUNITY",
        kind: "IMAGE",
        media: { url: "/api/messaging/media/77/raw?exp=1&sig=x", width: 1600, height: 1200, mediaId: 77 },
        clientId: payload.clientId,
        reactions: {},
      }),
    ),
  );
  row = result.current.rows[0];
  expect(result.current.rows).toHaveLength(1);
  expect(row.status).toBe("sent");
  expect(row.message.id).toBe(500);
  // The saved message keeps pointing at the local file while the server's copy loads
  expect(row.localUri).toBe(PHOTO.uri);
});

it("sends a photo without a caption as empty content", async () => {
  const { result } = await renderRoom();
  act(() => result.current.send({ kind: "IMAGE", photo: PHOTO, caption: "   " }));
  await act(async () => uploads[0].resolve({ mediaId: 5, width: 1, height: 1 }));
  expect(sent()[0]).toMatchObject({ kind: "IMAGE", content: "", media: { mediaId: 5 } });
});

it("a failed upload is marked failed, and retrying uploads it again", async () => {
  const { result } = await renderRoom();
  act(() => result.current.send({ kind: "IMAGE", photo: PHOTO }));

  await act(async () => uploads[0].reject(tooLarge()));
  expect(result.current.rows[0]).toMatchObject({ status: "failed", error: "Photo too large" });
  expect(result.current.rows[0].progress).toBeUndefined();
  expect(sent()).toHaveLength(0);

  const clientId = result.current.rows[0].message.clientId!;
  act(() => result.current.retry(clientId));
  expect(result.current.rows[0].status).toBe("sending");
  expect(mockUploadPhoto).toHaveBeenCalledTimes(2);

  await act(async () => uploads[1].resolve({ mediaId: 8, width: 1, height: 1 }));
  expect(sent()).toEqual([expect.objectContaining({ clientId, kind: "IMAGE", media: { mediaId: 8 } })]);
});

it("when only the send failed, retrying sends the same clientId and mediaId without uploading again", async () => {
  const { result } = await renderRoom();
  mockWs.sendCommunityMessage.mockReturnValueOnce(false);
  act(() => result.current.send({ kind: "IMAGE", photo: PHOTO }));
  await act(async () => uploads[0].resolve({ mediaId: 9, width: 1, height: 1 }));
  expect(result.current.rows[0]).toMatchObject({ status: "failed", error: "Not connected" });

  const clientId = result.current.rows[0].message.clientId!;
  act(() => result.current.retry(clientId));

  expect(mockUploadPhoto).toHaveBeenCalledTimes(1);
  expect(sent()).toHaveLength(2);
  expect(sent()[1]).toEqual(sent()[0]);
  expect(sent()[1]).toMatchObject({ clientId, media: { mediaId: 9 } });
});

it("a photo the server doesn't recognize is uploaded again on retry; other rejections just resend", async () => {
  const { result } = await renderRoom();
  act(() => result.current.send({ kind: "IMAGE", photo: PHOTO }));
  await act(async () => uploads[0].resolve({ mediaId: 10, width: 1, height: 1 }));
  const clientId = sent()[0].clientId;

  act(() => mockErrors.forEach((cb) => cb({ clientId, code: "MEDIA_IN_USE", message: "That photo was already sent" })));
  expect(result.current.rows[0]).toMatchObject({ status: "failed", error: "That photo was already sent" });
  act(() => result.current.retry(clientId));
  expect(mockUploadPhoto).toHaveBeenCalledTimes(1);
  expect(sent()).toHaveLength(2);

  act(() => mockErrors.forEach((cb) => cb({ clientId, code: "INVALID_MEDIA", message: "That photo can't be sent" })));
  act(() => result.current.retry(clientId));
  expect(mockUploadPhoto).toHaveBeenCalledTimes(2);
  await act(async () => uploads[1].resolve({ mediaId: 11, width: 1, height: 1 }));
  expect(sent()[2]).toMatchObject({ clientId, media: { mediaId: 11 } });
});

it("the echo timeout only starts once the photo is sent, not while it uploads", async () => {
  jest.useFakeTimers();
  const { result } = await renderRoom();
  act(() => result.current.send({ kind: "IMAGE", photo: PHOTO }));

  act(() => jest.advanceTimersByTime(SEND_TIMEOUT_MS * 3));
  expect(result.current.rows[0].status).toBe("sending");

  await act(async () => uploads[0].resolve({ mediaId: 12, width: 1, height: 1 }));
  act(() => jest.advanceTimersByTime(SEND_TIMEOUT_MS + 1));
  expect(result.current.rows[0]).toMatchObject({ status: "failed", error: "Not sent" });
});

it("discarding a photo while it uploads cancels the upload and never sends it", async () => {
  const { result } = await renderRoom();
  act(() => result.current.send({ kind: "IMAGE", photo: PHOTO }));
  const clientId = result.current.rows[0].message.clientId!;

  act(() => result.current.discard(clientId));
  expect(uploads[0].signal?.aborted).toBe(true);
  expect(result.current.rows).toHaveLength(0);

  await act(async () => uploads[0].resolve({ mediaId: 13, width: 1, height: 1 }));
  expect(sent()).toHaveLength(0);
});

it("leaving the room cancels uploads in flight", async () => {
  const { result, unmount } = await renderRoom();
  act(() => result.current.send({ kind: "IMAGE", photo: PHOTO }));
  unmount();
  expect(uploads[0].signal?.aborted).toBe(true);
  await act(async () => uploads[0].resolve({ mediaId: 14, width: 1, height: 1 }));
  expect(sent()).toHaveLength(0);
});

it("sends a DM photo to the partner", async () => {
  const { result } = await renderRoom("dm");
  act(() => result.current.send({ kind: "IMAGE", photo: PHOTO, caption: "form?" }));
  await act(async () => uploads[0].resolve({ mediaId: 15, width: 1, height: 1 }));
  expect(mockWs.sendDM).toHaveBeenCalledWith(
    "alex",
    expect.objectContaining({ kind: "IMAGE", content: "form?", media: { mediaId: 15 } }),
  );
  expect(result.current.rows[0].message).toMatchObject({ type: "DM", recipientUsername: "alex" });
});
