import AsyncStorage from '@react-native-async-storage/async-storage';
import { Client, IMessage, StompSubscription } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { WS_URL } from './networkConfig';

export interface MachineUpdateCallback {
  (machine: any): void;
}

export interface ChatMessageCallback {
  (message: any): void;
}

class WebSocketService {
  private client: Client | null = null;
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private subscribers: MachineUpdateCallback[] = [];

  private communitySubscription: StompSubscription | null = null;
  private userQueueSubscription: StompSubscription | null = null;
  private communityCallbacks: ChatMessageCallback[] = [];
  private userQueueCallbacks: ChatMessageCallback[] = [];

  async connect() {
    console.log('[WS] connect() called — isConnected:', this.isConnected, 'client.active:', this.client?.active);
    if (this.isConnected || this.client?.active) {
      console.log('[WS] Already connected/active, skipping');
      return;
    }

    const token = await AsyncStorage.getItem('accessToken');
    console.log('[WS] Token present:', !!token, '— connecting to:', WS_URL);
    const connectHeaders: Record<string, string> = token
      ? { Authorization: `Bearer ${token}` }
      : {};

    try {
      this.client = new Client({
        webSocketFactory: () => new SockJS(WS_URL),
        connectHeaders,
        reconnectDelay: 5000,
        heartbeatIncoming: 4000,
        heartbeatOutgoing: 4000,
        onConnect: () => {
          console.log('[WS] onConnect fired — communityCallbacks:', this.communityCallbacks.length, 'userQueueCallbacks:', this.userQueueCallbacks.length);
          this.isConnected = true;
          this.reconnectAttempts = 0;

          // Machines
          this.client!.subscribe('/topic/machines', (message: IMessage) => {
            try {
              const machine = JSON.parse(message.body);
              this.subscribers.forEach(cb => cb(machine));
            } catch (error) {
              console.error('[WS] Error parsing machine message:', error);
            }
          });

          // Re-establish community subscription if callbacks are waiting
          if (this.communityCallbacks.length > 0 && !this.communitySubscription) {
            console.log('[WS] Subscribing to /topic/chat.community from onConnect');
            this.communitySubscription = this.client!.subscribe(
              '/topic/chat.community',
              (msg: IMessage) => {
                try {
                  const data = JSON.parse(msg.body);
                  console.log('[WS] Community message received:', data);
                  this.communityCallbacks.forEach(cb => cb(data));
                } catch (e) {
                  console.error('[WS] Error parsing community message:', e);
                }
              }
            );
          }

          // Re-establish user queue subscription if callbacks are waiting
          if (this.userQueueCallbacks.length > 0 && !this.userQueueSubscription) {
            console.log('[WS] Subscribing to /user/queue/messages from onConnect');
            this.userQueueSubscription = this.client!.subscribe(
              '/user/queue/messages',
              (msg: IMessage) => {
                try {
                  const data = JSON.parse(msg.body);
                  console.log('[WS] DM received:', data);
                  this.userQueueCallbacks.forEach(cb => cb(data));
                } catch (e) {
                  console.error('[WS] Error parsing DM:', e);
                }
              }
            );
          }
        },
        onDisconnect: () => {
          console.log('[WS] Disconnected');
          this.isConnected = false;
          this.communitySubscription = null;
          this.userQueueSubscription = null;
        },
        onStompError: (frame) => {
          console.error('[WS] STOMP error:', frame.headers['message'], frame.body);
        },
        onWebSocketError: (event) => {
          console.error('[WS] WebSocket error:', event);
        },
        onWebSocketClose: () => {
          console.log('[WS] WebSocket closed, reconnect attempt:', this.reconnectAttempts);
          this.isConnected = false;
          if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
          }
        },
      });

      this.client.activate();
      console.log('[WS] client.activate() called');
    } catch (error) {
      console.error('[WS] Connection error:', error);
    }
  }

  disconnect() {
    if (this.client) {
      this.client.deactivate();
      this.isConnected = false;
      this.subscribers = [];
      this.communityCallbacks = [];
      this.userQueueCallbacks = [];
      this.communitySubscription = null;
      this.userQueueSubscription = null;
    }
  }

  // ── Machine updates ────────────────────────────────────────────────────

  subscribe(callback: MachineUpdateCallback) {
    this.subscribers.push(callback);
    return () => {
      this.subscribers = this.subscribers.filter(cb => cb !== callback);
    };
  }

  getConnectionStatus() {
    return this.isConnected;
  }

  // ── Community chat ─────────────────────────────────────────────────────

  subscribeToCommunity(callback: ChatMessageCallback): () => void {
    console.log('[WS] subscribeToCommunity — client.connected:', this.client?.connected, 'existing sub:', !!this.communitySubscription);
    this.communityCallbacks.push(callback);

    // Subscribe immediately if already connected; otherwise onConnect will handle it
    if (this.client?.connected && !this.communitySubscription) {
      console.log('[WS] Subscribing to /topic/chat.community immediately (already connected)');
      this.communitySubscription = this.client.subscribe(
        '/topic/chat.community',
        (msg: IMessage) => {
          try {
            const data = JSON.parse(msg.body);
            this.communityCallbacks.forEach(cb => cb(data));
          } catch (e) {
            console.error('[WebSocket] Error parsing community message:', e);
          }
        }
      );
    }

    return () => {
      this.communityCallbacks = this.communityCallbacks.filter(cb => cb !== callback);
      if (this.communityCallbacks.length === 0) {
        this.communitySubscription?.unsubscribe();
        this.communitySubscription = null;
      }
    };
  }

  sendCommunityMessage(content: string) {
    console.log('[WS] sendCommunityMessage — client.connected:', this.client?.connected, 'content:', content);
    if (!this.client?.connected) {
      console.warn('[WS] sendCommunityMessage dropped — not connected');
      return;
    }
    this.client.publish({
      destination: '/app/chat.community.send',
      body: JSON.stringify({ content }),
    });
    console.log('[WS] Published to /app/chat.community.send');
  }

  // ── Direct messages ────────────────────────────────────────────────────

  subscribeToUserQueue(callback: ChatMessageCallback): () => void {
    this.userQueueCallbacks.push(callback);

    // Subscribe immediately if already connected; otherwise onConnect will handle it
    if (this.client?.connected && !this.userQueueSubscription) {
      this.userQueueSubscription = this.client.subscribe(
        '/user/queue/messages',
        (msg: IMessage) => {
          try {
            const data = JSON.parse(msg.body);
            this.userQueueCallbacks.forEach(cb => cb(data));
          } catch (e) {
            console.error('[WebSocket] Error parsing DM:', e);
          }
        }
      );
    }

    return () => {
      this.userQueueCallbacks = this.userQueueCallbacks.filter(cb => cb !== callback);
      if (this.userQueueCallbacks.length === 0) {
        this.userQueueSubscription?.unsubscribe();
        this.userQueueSubscription = null;
      }
    };
  }

  sendDM(recipient: string, content: string) {
    if (!this.client?.connected) return;
    this.client.publish({
      destination: '/app/chat.dm.send',
      body: JSON.stringify({ recipient, content }),
    });
  }
}

export default new WebSocketService();
