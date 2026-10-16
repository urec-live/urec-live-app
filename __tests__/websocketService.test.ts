import AsyncStorage from "@react-native-async-storage/async-storage";

jest.mock("@react-native-async-storage/async-storage", () =>
  jest.requireActual("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);
jest.mock("sockjs-client", () => jest.fn());
jest.mock("@/services/networkConfig", () => ({ WS_URL: "http://test/ws" }));

// Each STOMP client the service creates, with the callbacks it was configured with
interface FakeClient {
  config: Record<string, (...args: unknown[]) => void>;
  active: boolean;
  connected: boolean;
  activate: jest.Mock;
  deactivate: jest.Mock;
  subscribe: jest.Mock;
}
const mockClients: FakeClient[] = [];
jest.mock("@stomp/stompjs", () => ({
  Client: jest.fn().mockImplementation((config) => {
    const client: FakeClient = {
      config,
      active: false,
      connected: false,
      activate: jest.fn(() => {
        client.active = true;
      }),
      deactivate: jest.fn(() => {
        client.active = false;
      }),
      subscribe: jest.fn(() => ({ unsubscribe: jest.fn() })),
    };
    mockClients.push(client);
    return client;
  }),
}));

// A fresh service per test: it's a singleton module
let ws: typeof import("@/services/websocketService").default;
beforeEach(async () => {
  mockClients.length = 0;
  await AsyncStorage.setItem("accessToken", "token-1");
  jest.isolateModules(() => {
    ws = jest.requireActual<typeof import("@/services/websocketService")>("@/services/websocketService").default;
  });
  jest.spyOn(console, "log").mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

function connectNow(client: FakeClient, at: number) {
  jest.spyOn(Date, "now").mockReturnValue(at);
  client.connected = true;
  client.config.onConnect();
}

describe("websocketService", () => {
  it("starts one client even when connect() is called twice at once", async () => {
    await Promise.all([ws.connect(), ws.connect()]);

    expect(mockClients).toHaveLength(1);
    expect(mockClients[0].activate).toHaveBeenCalled();
  });

  it("doesn't start a client when disconnect() came while connect() was reading the token", async () => {
    const connecting = ws.connect();
    ws.disconnect();
    await connecting;

    expect(mockClients).toHaveLength(0);
  });

  it("reports since when it's connected, and tells listeners on every connect", async () => {
    const listener = jest.fn();
    ws.onConnect(listener);
    await ws.connect();
    expect(ws.getConnectedSince()).toBeNull();

    connectNow(mockClients[0], 5_000);
    expect(ws.getConnectedSince()).toBe(5_000);
    expect(listener).toHaveBeenCalledTimes(1);

    mockClients[0].config.onWebSocketClose();
    expect(ws.getConnectedSince()).toBeNull();

    connectNow(mockClients[0], 9_000); // STOMP's automatic reconnect
    expect(ws.getConnectedSince()).toBe(9_000);
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("stops telling a listener after it unsubscribes", async () => {
    const listener = jest.fn();
    const stop = ws.onConnect(listener);
    await ws.connect();

    stop();
    connectNow(mockClients[0], 1_000);

    expect(listener).not.toHaveBeenCalled();
  });

  it("ignores late events from a client replaced after sign-out and back in", async () => {
    await ws.connect();
    const old = mockClients[0];
    connectNow(old, 1_000);

    ws.disconnect();
    expect(ws.getConnectedSince()).toBeNull();
    await ws.connect();
    connectNow(mockClients[1], 2_000);

    // The old client finishes closing only now
    old.config.onWebSocketClose();
    old.config.onDisconnect();

    expect(ws.getConnectedSince()).toBe(2_000);
    expect(ws.getConnectionStatus()).toBe(true);
  });

  it("hands each machine update to every subscriber", async () => {
    const first = jest.fn();
    const second = jest.fn();
    ws.subscribe(first);
    ws.subscribe(second);
    await ws.connect();
    connectNow(mockClients[0], 1_000);

    const [topic, onMessage] = mockClients[0].subscribe.mock.calls[0];
    onMessage({ body: JSON.stringify({ id: 1, status: "In Use" }) });

    expect(topic).toBe("/topic/machines");
    expect(first).toHaveBeenCalledWith({ id: 1, status: "In Use" });
    expect(second).toHaveBeenCalledWith({ id: 1, status: "In Use" });
  });
});
