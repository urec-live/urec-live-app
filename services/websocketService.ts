import { Client, IMessage } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { Platform } from 'react-native';

const envWsBaseUrl = process.env.EXPO_PUBLIC_WS_BASE_URL;
const envApiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;

const deriveWsUrl = (baseUrl: string) => {
  const trimmed = baseUrl.replace(/\/$/, "");
  if (trimmed.endsWith("/api")) {
    return trimmed.replace(/\/api$/, "/ws");
  }
  return `${trimmed}/ws`;
};

let WS_URL = Platform.select({
  ios: 'http://localhost:8080/ws',
  android: 'http://10.0.2.2:8080/ws',
  default: 'http://localhost:8080/ws',
}) || 'http://localhost:8080/ws';

if (envWsBaseUrl) {
  WS_URL = envWsBaseUrl.replace(/\/$/, "");
} else if (envApiBaseUrl) {
  WS_URL = deriveWsUrl(envApiBaseUrl);
}

export interface EquipmentStatusUpdate {
  equipmentId: number;
  status: string;
  sessionId?: number | null;
  userId?: number | null;
  occurredAt?: string;
}

export interface EquipmentStatusUpdateCallback {
  (update: EquipmentStatusUpdate): void;
}

class WebSocketService {
  private client: Client | null = null;
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private subscribers: EquipmentStatusUpdateCallback[] = [];

  constructor() {
    this.client = null;
  }

  connect() {
    if (this.isConnected || this.client?.active) {
      console.log('[WebSocket] Already connected');
      return;
    }

    console.log('[WebSocket] Connecting to:', WS_URL);

    try {
      this.client = new Client({
        webSocketFactory: () => new SockJS(WS_URL),
        reconnectDelay: 5000,
        heartbeatIncoming: 4000,
        heartbeatOutgoing: 4000,
        debug: (str) => {
          console.log('[WebSocket Debug]', str);
        },
        onConnect: () => {
          console.log('[WebSocket] Connected successfully');
          this.isConnected = true;
          this.reconnectAttempts = 0;

          // Subscribe to equipment status updates
          this.client?.subscribe('/topic/equipment-status', (message: IMessage) => {
            try {
              const update = JSON.parse(message.body) as EquipmentStatusUpdate;
              console.log('[WebSocket] Received equipment status update:', update);
              
              // Notify all subscribers
              this.subscribers.forEach(callback => callback(update));
            } catch (error) {
              console.error('[WebSocket] Error parsing message:', error);
            }
          });
        },
        onDisconnect: () => {
          console.log('[WebSocket] Disconnected');
          this.isConnected = false;
        },
        onStompError: (frame) => {
          console.error('[WebSocket] STOMP error:', frame.headers['message']);
          console.error('[WebSocket] Error details:', frame.body);
        },
        onWebSocketError: (event) => {
          console.error('[WebSocket] WebSocket error:', event);
        },
        onWebSocketClose: () => {
          console.log('[WebSocket] WebSocket closed');
          this.isConnected = false;
          
          if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`[WebSocket] Reconnect attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
          }
        },
      });

      this.client.activate();
    } catch (error) {
      console.error('[WebSocket] Connection error:', error);
    }
  }

  disconnect() {
    if (this.client) {
      console.log('[WebSocket] Disconnecting...');
      this.client.deactivate();
      this.isConnected = false;
      this.subscribers = [];
    }
  }

  subscribe(callback: EquipmentStatusUpdateCallback) {
    this.subscribers.push(callback);
    
    // Return unsubscribe function
    return () => {
      this.subscribers = this.subscribers.filter(cb => cb !== callback);
    };
  }

  getConnectionStatus() {
    return this.isConnected;
  }
}

// Export singleton instance
export default new WebSocketService();
