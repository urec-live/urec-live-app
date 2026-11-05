import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { HISTORY_PAGE_SIZE } from "@/constants/chat";
import { ChatChannel, ChatMedia, ChatMessageResponse, messagingAPI } from "@/services/messagingAPI";
import websocketService, { ChatSendError, OutgoingChatMessage } from "@/services/websocketService";

/** How long a send may wait for the server's echo before it's shown as failed. */
export const SEND_TIMEOUT_MS = 10000;

export type ChatDraft =
  | { kind: "TEXT"; content: string }
  | { kind: "GIF" | "STICKER"; media: ChatMedia & { providerId?: string } };

export type SendStatus = "sent" | "sending" | "failed";

/** One row of the chat: a saved message, or one of mine still on its way. */
export interface ChatRow {
  key: string;
  message: ChatMessageResponse;
  status: SendStatus;
  /** Why a failed send failed. */
  error?: string;
}

interface PendingSend {
  clientId: string;
  draft: ChatDraft;
  status: "sending" | "failed";
  error?: string;
  createdAt: string;
}

export interface ChatOptions {
  channel: ChatChannel;
  /** The other person, for DMs. */
  partner?: string;
  /** The signed-in user. */
  me: string | undefined;
  /** Called for each live message from someone else. */
  onIncoming?: (message: ChatMessageResponse) => void;
}

/** A per-message id the server accepts ([A-Za-z0-9_-], at most 36 characters). */
export function newClientId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

/**
 * Adds or replaces one message in an oldest-first list. A message older than everything loaded is
 * left out, since its page hasn't been fetched.
 */
export function upsertMessage(list: ChatMessageResponse[], message: ChatMessageResponse): ChatMessageResponse[] {
  const index = list.findIndex((m) => m.id === message.id);
  if (index >= 0) {
    const next = list.slice();
    next[index] = message;
    return next;
  }
  if (list.length > 0 && message.id < list[0].id) return list;
  const next = [...list, message];
  // Live messages almost always arrive newest, so this rarely moves anything
  next.sort((a, b) => a.id - b.id);
  return next;
}

/** Merges a page into an oldest-first list by id. */
function mergeMessages(list: ChatMessageResponse[], page: ChatMessageResponse[]): ChatMessageResponse[] {
  const byId = new Map(list.map((m) => [m.id, m]));
  page.forEach((m) => byId.set(m.id, m));
  return [...byId.values()].sort((a, b) => a.id - b.id);
}

/**
 * State for one chat room: paged history, live updates, and my sends. Every live update carries the
 * whole message, so it simply replaces what's here by id. A send shows at once as "sending", turns
 * into the saved message when the server echoes its clientId, and is marked failed if the server
 * rejects it, the socket is down, or no echo comes within SEND_TIMEOUT_MS.
 */
export function useChatMessages({ channel, partner, me, onIncoming }: ChatOptions) {
  const [messages, setMessages] = useState<ChatMessageResponse[]>([]);
  const [pending, setPending] = useState<PendingSend[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasMore, setHasMore] = useState(false);

  const messagesRef = useRef(messages);
  messagesRef.current = messages;
  const pendingRef = useRef(pending);
  pendingRef.current = pending;
  const onIncomingRef = useRef(onIncoming);
  onIncomingRef.current = onIncoming;
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const loadingOlderRef = useRef(false);
  const initialLoadDone = useRef(false);

  const fetchPage = useCallback(
    (before?: number) =>
      channel === "dm"
        ? messagingAPI.getDMHistory(partner ?? "", before)
        : messagingAPI.getCommunityHistory(before),
    [channel, partner],
  );

  const clearTimer = (clientId: string) => {
    const timer = timers.current.get(clientId);
    if (timer) clearTimeout(timer);
    timers.current.delete(clientId);
  };

  const markFailed = useCallback((clientId: string, error: string) => {
    clearTimer(clientId);
    setPending((list) =>
      list.map((p) => (p.clientId === clientId && p.status === "sending" ? { ...p, status: "failed", error } : p)),
    );
  }, []);

  /** Applies a message from the server (live or a REST result). */
  const upsert = useCallback(
    (message: ChatMessageResponse) => {
      setMessages((list) => upsertMessage(list, message));
      if (message.clientId && message.senderUsername === me) {
        clearTimer(message.clientId);
        setPending((list) => list.filter((p) => p.clientId !== message.clientId));
      }
    },
    [me],
  );

  const loadLatest = useCallback(async () => {
    try {
      const page = await fetchPage();
      setMessages((list) => mergeMessages(list, page));
      if (!initialLoadDone.current) setHasMore(page.length >= HISTORY_PAGE_SIZE);
      setLoadError(false);
      // Sends the server saved while the echo was lost (e.g. a reconnect) are done
      const saved = new Set(page.filter((m) => m.senderUsername === me && m.clientId).map((m) => m.clientId));
      if (saved.size > 0) {
        saved.forEach((id) => clearTimer(id as string));
        setPending((list) => list.filter((p) => !saved.has(p.clientId)));
      }
    } catch {
      if (!initialLoadDone.current) setLoadError(true);
    } finally {
      initialLoadDone.current = true;
      setLoading(false);
    }
  }, [fetchPage, me]);

  useEffect(() => {
    initialLoadDone.current = false;
    setMessages([]);
    setPending([]);
    setLoading(true);
    setLoadError(false);
    if (channel === "dm" && !partner) return;

    websocketService.connect();
    loadLatest();

    const handleLive = (message: ChatMessageResponse) => {
      if (channel === "dm") {
        const relevant =
          (message.senderUsername === partner && message.recipientUsername === me) ||
          (message.senderUsername === me && message.recipientUsername === partner);
        if (!relevant) return;
      }
      const isNew = !messagesRef.current.some((m) => m.id === message.id);
      upsert(message);
      if (isNew && message.senderUsername !== me) onIncomingRef.current?.(message);
    };
    const unsubscribeLive =
      channel === "dm"
        ? websocketService.subscribeToUserQueue(handleLive)
        : websocketService.subscribeToCommunity(handleLive);

    const unsubscribeErrors = websocketService.subscribeToChatErrors((error: ChatSendError) => {
      if (error.clientId && pendingRef.current.some((p) => p.clientId === error.clientId)) {
        markFailed(error.clientId, error.message || "Not sent");
      }
    });

    // Catch up on anything missed while the socket was down
    const unsubscribeConnect = websocketService.onConnect(() => {
      if (initialLoadDone.current) loadLatest();
    });

    const pendingTimers = timers.current;
    return () => {
      unsubscribeLive();
      unsubscribeErrors();
      unsubscribeConnect();
      pendingTimers.forEach((timer) => clearTimeout(timer));
      pendingTimers.clear();
    };
  }, [channel, partner, me, loadLatest, upsert, markFailed]);

  const loadOlder = useCallback(async () => {
    const oldest = messagesRef.current[0];
    if (!oldest || !hasMore || loadingOlderRef.current) return;
    loadingOlderRef.current = true;
    setLoadingOlder(true);
    try {
      const page = await fetchPage(oldest.id);
      setMessages((list) => mergeMessages(list, page));
      setHasMore(page.length >= HISTORY_PAGE_SIZE);
    } catch {
      // Leave hasMore as it was, so scrolling up tries again
    } finally {
      loadingOlderRef.current = false;
      setLoadingOlder(false);
    }
  }, [fetchPage, hasMore]);

  const publish = useCallback(
    (send: PendingSend) => {
      const payload: OutgoingChatMessage =
        send.draft.kind === "TEXT"
          ? { clientId: send.clientId, kind: "TEXT", content: send.draft.content }
          : { clientId: send.clientId, kind: send.draft.kind, media: send.draft.media };
      const published =
        channel === "dm"
          ? websocketService.sendDM(partner ?? "", payload)
          : websocketService.sendCommunityMessage(payload);
      if (!published) {
        markFailed(send.clientId, "Not connected");
        return;
      }
      clearTimer(send.clientId);
      timers.current.set(
        send.clientId,
        setTimeout(() => markFailed(send.clientId, "Not sent"), SEND_TIMEOUT_MS),
      );
    },
    [channel, partner, markFailed],
  );

  const send = useCallback(
    (draft: ChatDraft) => {
      if (draft.kind === "TEXT" && !draft.content.trim()) return;
      const next: PendingSend = {
        clientId: newClientId(),
        draft: draft.kind === "TEXT" ? { kind: "TEXT", content: draft.content.trim() } : draft,
        status: "sending",
        createdAt: new Date().toISOString(),
      };
      setPending((list) => [...list, next]);
      publish(next);
    },
    [publish],
  );

  /** Sends a failed message again with the same clientId, so the server can't save it twice. */
  const retry = useCallback(
    (clientId: string) => {
      const send = pendingRef.current.find((p) => p.clientId === clientId);
      if (!send) return;
      const again: PendingSend = { ...send, status: "sending", error: undefined };
      setPending((list) => list.map((p) => (p.clientId === clientId ? again : p)));
      publish(again);
    },
    [publish],
  );

  const discard = useCallback((clientId: string) => {
    clearTimer(clientId);
    setPending((list) => list.filter((p) => p.clientId !== clientId));
  }, []);

  /** "Try again" after the first load failed. */
  const reload = useCallback(() => {
    initialLoadDone.current = false;
    setLoading(true);
    setLoadError(false);
    return loadLatest();
  }, [loadLatest]);

  /** Newest first, for an inverted list: my unsent messages, then saved ones. */
  const rows = useMemo<ChatRow[]>(() => {
    const pendingRows: ChatRow[] = pending.map((p) => ({
      key: `pending-${p.clientId}`,
      status: p.status,
      error: p.error,
      message: {
        id: -1,
        senderUsername: me ?? "",
        recipientUsername: channel === "dm" ? partner : undefined,
        content: p.draft.kind === "TEXT" ? p.draft.content : "",
        sentAt: p.createdAt,
        type: channel === "dm" ? "DM" : "COMMUNITY",
        kind: p.draft.kind,
        media: p.draft.kind === "TEXT" ? null : p.draft.media,
        clientId: p.clientId,
        reactions: {},
      },
    }));
    const savedRows: ChatRow[] = messages.map((m) => ({ key: `message-${m.id}`, message: m, status: "sent" }));
    return [...pendingRows.reverse(), ...savedRows.reverse()];
  }, [messages, pending, me, channel, partner]);

  return { rows, loading, loadError, loadingOlder, hasMore, loadOlder, send, retry, discard, upsert, reload };
}
