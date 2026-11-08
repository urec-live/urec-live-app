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
  publish: jest.Mock;
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
      publish: jest.fn(),
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

  it("hands each machine update for the member's gym to every subscriber", async () => {
    const first = jest.fn();
    const second = jest.fn();
    ws.subscribe(first);
    ws.subscribe(second);
    await ws.connect();
    connectNow(mockClients[0], 1_000);
    expect(mockClients[0].subscribe).not.toHaveBeenCalled(); // no gym yet, so no machine updates

    ws.setGym(3);
    const [topic, onMessage] = mockClients[0].subscribe.mock.calls[0];
    onMessage({ body: JSON.stringify({ id: 1, status: "In Use" }) });

    expect(topic).toBe("/topic/gyms/3/machines");
    expect(first).toHaveBeenCalledWith({ id: 1, status: "In Use" });
    expect(second).toHaveBeenCalledWith({ id: 1, status: "In Use" });
  });
});

describe("websocketService chat", () => {
  const gif = { url: "https://static.klipy.com/a.webp", previewUrl: null, width: 200, height: 150, providerId: "a" };

  it("says a send didn't go out while disconnected", async () => {
    jest.spyOn(console, "warn").mockImplementation(() => {});
    expect(ws.sendCommunityMessage({ clientId: "c1", kind: "TEXT", content: "hi" })).toBe(false);
    await ws.connect();
    expect(ws.sendDM("bob", { clientId: "c2", kind: "TEXT", content: "hi" })).toBe(false);
    expect(mockClients[0].publish).not.toHaveBeenCalled();
  });

  it("publishes community messages and DMs with their clientId, kind and media", async () => {
    await ws.connect();
    connectNow(mockClients[0], 1_000);

    expect(ws.sendCommunityMessage({ clientId: "c1", kind: "GIF", media: gif })).toBe(true);
    expect(ws.sendDM("bob", { clientId: "c2", kind: "TEXT", content: "hey" })).toBe(true);

    const [community, dm] = mockClients[0].publish.mock.calls.map(([frame]) => frame);
    expect(community.destination).toBe("/app/chat.community.send");
    expect(JSON.parse(community.body)).toEqual({ clientId: "c1", kind: "GIF", media: gif });
    expect(dm.destination).toBe("/app/chat.dm.send");
    expect(JSON.parse(dm.body)).toEqual({ clientId: "c2", kind: "TEXT", content: "hey", recipient: "bob" });
  });

  it("hands rejected sends from the error queue to subscribers, and resubscribes after a reconnect", async () => {
    const onError = jest.fn();
    const stop = ws.subscribeToChatErrors(onError);
    await ws.connect();
    connectNow(mockClients[0], 1_000);

    const errorSubscriptions = () =>
      mockClients[0].subscribe.mock.calls.filter(([destination]) => destination === "/user/queue/errors");
    expect(errorSubscriptions()).toHaveLength(1);
    const deliver = errorSubscriptions()[0][1];
    jest.spyOn(console, "error").mockImplementation(() => {});
    deliver({ body: JSON.stringify({ clientId: "c1", code: "TOO_LONG", message: "Too long" }) });
    deliver({ body: "not json" });
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith({ clientId: "c1", code: "TOO_LONG", message: "Too long" });

    mockClients[0].config.onWebSocketClose();
    connectNow(mockClients[0], 2_000);
    expect(errorSubscriptions()).toHaveLength(2);

    stop();
    const unsubscribe = mockClients[0].subscribe.mock.results[mockClients[0].subscribe.mock.results.length - 1].value.unsubscribe;
    expect(unsubscribe).toHaveBeenCalled();
  });

  it("subscribes to the error queue straight away when already connected", async () => {
    await ws.connect();
    connectNow(mockClients[0], 1_000);
    ws.subscribeToChatErrors(jest.fn());
    expect(mockClients[0].subscribe).toHaveBeenCalledWith("/user/queue/errors", expect.any(Function));
  });
});
