import AsyncStorage from "@react-native-async-storage/async-storage";
import { Client, IMessage, StompSubscription } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import { WS_URL } from "./networkConfig";

export interface MachineUpdateCallback {
  (machine: any): void;
}

export interface ChatMessageCallback {
  (message: any): void;
}

/** What the app sends for a chat message; the server echoes clientId back on the saved message. */
export interface OutgoingChatMessage {
  clientId: string;
  kind: "TEXT" | "GIF" | "STICKER";
  content?: string;
  media?: {
    url: string;
    previewUrl?: string | null;
    width?: number | null;
    height?: number | null;
    providerId?: string;
  };
}

/** A rejected send, from /user/queue/errors. */
export interface ChatSendError {
  clientId: string | null;
  code: string;
  message: string;
}

export interface ChatErrorCallback {
  (error: ChatSendError): void;
}

class WebSocketService {
  private client: Client | null = null;
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private subscribers: MachineUpdateCallback[] = [];
  private gymId: number | null = null;
  private machineSubscription: StompSubscription | null = null;
  setGym(id: number | null) {
    if (this.client?.connected) this.machineSubscription?.unsubscribe();
    this.machineSubscription = null;
    this.gymId = id;
    this.subscribeMachines();
  }
  private subscribeMachines() {
    if (!this.client?.connected || this.gymId === null) return;
    this.machineSubscription = this.client.subscribe(
      `/topic/gyms/${this.gymId}/machines`,
      (message) => {
        try {
          const machine = JSON.parse(message.body);
          this.subscribers.forEach((cb) => cb(machine));
        } catch {
          /* Ignore malformed updates. */
        }
      },
    );
  }

  private communitySubscription: StompSubscription | null = null;
  private userQueueSubscription: StompSubscription | null = null;
  private communityCallbacks: ChatMessageCallback[] = [];
  private userQueueCallbacks: ChatMessageCallback[] = [];
  private errorSubscription: StompSubscription | null = null;
  private errorCallbacks: ChatErrorCallback[] = [];

  // When the current connection came up (null while disconnected), and who to tell when it does
  private connectedSince: number | null = null;
  private connectionListeners = new Set<() => void>();
  onConnectionChange = (listener: () => void): (() => void) => {
    this.connectionListeners.add(listener);
    return () => {
      this.connectionListeners.delete(listener);
    };
  };
  private notifyConnection() {
    this.connectionListeners.forEach((listener) => listener());
  }
  private connectListeners = new Set<() => void>();
  // Bumped by disconnect(), so a connect() still reading the token doesn't start a client afterwards
  private connectionId = 0;
  private connecting = false;

  async connect() {
    console.log(
      "[WS] connect() called — isConnected:",
      this.isConnected,
      "client.active:",
      this.client?.active,
    );
    if (this.isConnected || this.client?.active || this.connecting) {
      console.log("[WS] Already connected/active, skipping");
      return;
    }

    this.connecting = true;
    const attempt = ++this.connectionId;
    let token: string | null;
    try {
      token = await AsyncStorage.getItem("accessToken");
    } finally {
      this.connecting = false;
    }
    if (attempt !== this.connectionId) return;
    console.log("[WS] Token present:", !!token, "— connecting to:", WS_URL);
    const connectHeaders: Record<string, string> = token
      ? { Authorization: `Bearer ${token}` }
      : {};

    try {
      const client: Client = new Client({
        webSocketFactory: () => new SockJS(WS_URL),
        connectHeaders,
        beforeConnect: async () => {
          const currentToken = await AsyncStorage.getItem("accessToken");
          client.connectHeaders = currentToken
            ? { Authorization: `Bearer ${currentToken}` }
            : {};
        },
        reconnectDelay: 5000,
        heartbeatIncoming: 4000,
        heartbeatOutgoing: 4000,
        onConnect: () => {
          if (this.client !== client) return; // replaced by a newer connection
          console.log(
            "[WS] onConnect fired — communityCallbacks:",
            this.communityCallbacks.length,
            "userQueueCallbacks:",
            this.userQueueCallbacks.length,
          );
          this.isConnected = true;
          this.reconnectAttempts = 0;
          this.connectedSince = Date.now();
          this.notifyConnection();

          this.machineSubscription = null;
          this.subscribeMachines();

          // Re-establish community subscription if callbacks are waiting
          if (
            this.communityCallbacks.length > 0 &&
            !this.communitySubscription
          ) {
            console.log(
              "[WS] Subscribing to /topic/chat.community from onConnect",
            );
            this.communitySubscription = this.client!.subscribe(
              "/topic/chat.community",
              (msg: IMessage) => {
                try {
                  const data = JSON.parse(msg.body);
                  console.log("[WS] Community message received:", data);
                  this.communityCallbacks.forEach((cb) => cb(data));
                } catch (e) {
                  console.error("[WS] Error parsing community message:", e);
                }
              },
            );
          }

          // Re-establish user queue subscription if callbacks are waiting
          if (
            this.userQueueCallbacks.length > 0 &&
            !this.userQueueSubscription
          ) {
            console.log(
              "[WS] Subscribing to /user/queue/messages from onConnect",
            );
            this.userQueueSubscription = this.client!.subscribe(
              "/user/queue/messages",
              (msg: IMessage) => {
                try {
                  const data = JSON.parse(msg.body);
                  console.log("[WS] DM received:", data);
                  this.userQueueCallbacks.forEach((cb) => cb(data));
                } catch (e) {
                  console.error("[WS] Error parsing DM:", e);
                }
              },
            );
          }

          // Re-establish the chat error queue if a chat screen is open
          if (this.errorCallbacks.length > 0 && !this.errorSubscription) {
            this.subscribeErrorQueue();
          }

          this.connectListeners.forEach((listener) => listener());
        },
        onDisconnect: () => {
          if (this.client !== client) return;
          console.log("[WS] Disconnected");
          this.isConnected = false;
          this.connectedSince = null;
          this.notifyConnection();
          this.communitySubscription = null;
          this.userQueueSubscription = null;
          this.errorSubscription = null;
        },
        onStompError: (frame) => {
          console.error(
            "[WS] STOMP error:",
            frame.headers["message"],
            frame.body,
          );
        },
        onWebSocketError: (event) => {
          console.error("[WS] WebSocket error:", event);
        },
        onWebSocketClose: () => {
          // A replaced client's late close event must not reset the new connection
          if (this.client !== client) return;
          this.machineSubscription = null;
          this.communitySubscription = null;
          this.userQueueSubscription = null;
          this.errorSubscription = null;
          console.log(
            "[WS] WebSocket closed, reconnect attempt:",
            this.reconnectAttempts,
          );
          this.isConnected = false;
          this.connectedSince = null;
          this.notifyConnection();
          if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
          }
        },
      });

      this.client = client;
      client.activate();
      console.log("[WS] client.activate() called");
    } catch (error) {
      console.error("[WS] Connection error:", error);
    }
  }

  disconnect() {
    this.connectionId++;
    this.connectedSince = null;
    this.notifyConnection();
    if (this.client) {
      this.client.deactivate();
      this.client = null;
      this.isConnected = false;
      this.subscribers = [];
      this.communityCallbacks = [];
      this.userQueueCallbacks = [];
      this.errorCallbacks = [];
      this.communitySubscription = null;
      this.userQueueSubscription = null;
      this.errorSubscription = null;
    }
  }

  /** When the current connection came up, or null while disconnected */
  getConnectedSince(): number | null {
    return this.connectedSince;
  }

  /** Calls the listener after every connect, including automatic reconnects. Returns an unsubscribe. */
  onConnect(listener: () => void): () => void {
    this.connectListeners.add(listener);
    return () => {
      this.connectListeners.delete(listener);
    };
  }

  // ── Machine updates ────────────────────────────────────────────────────

  subscribe(callback: MachineUpdateCallback) {
    this.subscribers.push(callback);
    return () => {
      this.subscribers = this.subscribers.filter((cb) => cb !== callback);
    };
  }

  getConnectionStatus() {
    return this.isConnected;
  }

  // ── Community chat ─────────────────────────────────────────────────────

  subscribeToCommunity(callback: ChatMessageCallback): () => void {
    console.log(
      "[WS] subscribeToCommunity — client.connected:",
      this.client?.connected,
      "existing sub:",
      !!this.communitySubscription,
    );
    this.communityCallbacks.push(callback);

    // Subscribe immediately if already connected; otherwise onConnect will handle it
    if (this.client?.connected && !this.communitySubscription) {
      console.log(
        "[WS] Subscribing to /topic/chat.community immediately (already connected)",
      );
      this.communitySubscription = this.client.subscribe(
        "/topic/chat.community",
        (msg: IMessage) => {
          try {
            const data = JSON.parse(msg.body);
            this.communityCallbacks.forEach((cb) => cb(data));
          } catch (e) {
            console.error("[WebSocket] Error parsing community message:", e);
          }
        },
      );
    }

    return () => {
      this.communityCallbacks = this.communityCallbacks.filter(
        (cb) => cb !== callback,
      );
      if (this.communityCallbacks.length === 0) {
        this.communitySubscription?.unsubscribe();
        this.communitySubscription = null;
      }
    };
  }

  /** Publishes a community message; false if the socket is down and nothing was sent. */
  sendCommunityMessage(message: OutgoingChatMessage): boolean {
    if (!this.client?.connected) {
      console.warn("[WS] sendCommunityMessage dropped — not connected");
      return false;
    }
    this.client.publish({
      destination: "/app/chat.community.send",
      body: JSON.stringify(message),
    });
    return true;
  }

  // ── Direct messages ────────────────────────────────────────────────────

  subscribeToUserQueue(callback: ChatMessageCallback): () => void {
    this.userQueueCallbacks.push(callback);

    // Subscribe immediately if already connected; otherwise onConnect will handle it
    if (this.client?.connected && !this.userQueueSubscription) {
      this.userQueueSubscription = this.client.subscribe(
        "/user/queue/messages",
        (msg: IMessage) => {
          try {
            const data = JSON.parse(msg.body);
            this.userQueueCallbacks.forEach((cb) => cb(data));
          } catch (e) {
            console.error("[WebSocket] Error parsing DM:", e);
          }
        },
      );
    }

    return () => {
      this.userQueueCallbacks = this.userQueueCallbacks.filter(
        (cb) => cb !== callback,
      );
      if (this.userQueueCallbacks.length === 0) {
        this.userQueueSubscription?.unsubscribe();
        this.userQueueSubscription = null;
      }
    };
  }

  /** Publishes a DM; false if the socket is down and nothing was sent. */
  sendDM(recipient: string, message: OutgoingChatMessage): boolean {
    if (!this.client?.connected) return false;
    this.client.publish({
      destination: "/app/chat.dm.send",
      body: JSON.stringify({ ...message, recipient }),
    });
    return true;
  }

  // ── Chat send errors ───────────────────────────────────────────────────

  /** Rejected chat sends for this user (e.g. too long, unknown recipient). Returns an unsubscribe. */
  subscribeToChatErrors(callback: ChatErrorCallback): () => void {
    this.errorCallbacks.push(callback);

    // Subscribe immediately if already connected; otherwise onConnect will handle it
    if (this.client?.connected && !this.errorSubscription) {
      this.subscribeErrorQueue();
    }

    return () => {
      this.errorCallbacks = this.errorCallbacks.filter((cb) => cb !== callback);
      if (this.errorCallbacks.length === 0) {
        this.errorSubscription?.unsubscribe();
        this.errorSubscription = null;
      }
    };
  }

  private subscribeErrorQueue() {
    this.errorSubscription = this.client!.subscribe(
      "/user/queue/errors",
      (msg: IMessage) => {
        try {
          const error = JSON.parse(msg.body) as ChatSendError;
          this.errorCallbacks.forEach((cb) => cb(error));
        } catch (e) {
          console.error("[WS] Error parsing chat error:", e);
        }
      },
    );
  }
}

export default new WebSocketService();
