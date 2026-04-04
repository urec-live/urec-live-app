import { Client, IMessage } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { Platform } from 'react-native';

const WS_URL = Platform.select({
  ios: 'http://172.20.1.229:8081/ws',
  android: 'http://172.20.1.229:8081/ws',
  default: 'http://localhost:8081/ws',
}) || 'http://localhost:8081/ws';

export interface MachineUpdateCallback {
  (machine: any): void;
}

class WebSocketService {
  private client: Client | null = null;
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private subscribers: MachineUpdateCallback[] = [];

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

          // Subscribe to machine updates
          this.client?.subscribe('/topic/machines', (message: IMessage) => {
            try {
              const machine = JSON.parse(message.body);
              console.log('[WebSocket] Received machine update:', machine);
              
              // Notify all subscribers
              this.subscribers.forEach(callback => callback(machine));
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

  subscribe(callback: MachineUpdateCallback) {
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
