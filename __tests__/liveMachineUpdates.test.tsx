import { act, renderHook } from "@testing-library/react-native";

import { useLiveMachineUpdates } from "@/hooks/useLiveMachineUpdates";
import { clearCache, fetchCached, isFresh, peekCached, subscribeCached, writeCached } from "@/services/resourceCache";

jest.mock("@react-native-async-storage/async-storage", () =>
  jest.requireActual("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

const mockWs = {
  connect: jest.fn(),
  disconnect: jest.fn(),
  subscribe: jest.fn(),
  onConnect: jest.fn(),
  getConnectedSince: jest.fn(),
};
jest.mock("@/services/websocketService", () => ({
  __esModule: true,
  default: new Proxy({}, { get: (_target, name: string) => (...args: unknown[]) => mockWs[name as keyof typeof mockWs](...args) }),
}));

let onMachine: (machine: unknown) => void;
let onConnect: () => void;
const stopMachine = jest.fn();
const stopConnect = jest.fn();

const machine = (status: string) => ({ id: 1, code: "BP001", name: "Bench 1", status, exercise: "Bench Press" });

beforeEach(async () => {
  jest.clearAllMocks();
  await clearCache();
  mockWs.subscribe.mockImplementation((callback) => {
    onMachine = callback;
    return stopMachine;
  });
  mockWs.onConnect.mockImplementation((callback) => {
    onConnect = callback;
    return stopConnect;
  });
  mockWs.getConnectedSince.mockReturnValue(1_000);
});

const signedInFor = (signedIn: boolean) =>
  renderHook((props: { on: boolean }) => useLiveMachineUpdates(props.on), { initialProps: { on: signedIn } });

describe("useLiveMachineUpdates", () => {
  it("does nothing while signed out", () => {
    signedInFor(false);

    expect(mockWs.connect).not.toHaveBeenCalled();
    expect(mockWs.subscribe).not.toHaveBeenCalled();
  });

  it("connects at sign-in and applies each machine update to the saved data", () => {
    writeCached("machines", [machine("Available")]);
    signedInFor(true);

    expect(mockWs.connect).toHaveBeenCalledTimes(1);
    act(() => onMachine(machine("In Use")));

    expect(peekCached<{ status: string }[]>("machines")?.data[0].status).toBe("In Use");
  });

  it("lets machine data count as fresh while connected since the fetch", () => {
    const fetchedAt = Date.now() - 5_000;
    const entry = { data: [], updatedAt: fetchedAt };
    const options = { staleTime: 60_000, live: true };
    signedInFor(true);

    mockWs.getConnectedSince.mockReturnValue(fetchedAt - 10_000); // connected before the fetch
    expect(isFresh("machines", entry, options)).toBe(true);

    mockWs.getConnectedSince.mockReturnValue(fetchedAt + 1_000); // reconnected after it
    expect(isFresh("machines", entry, options)).toBe(false);

    mockWs.getConnectedSince.mockReturnValue(null); // disconnected
    expect(isFresh("machines", entry, options)).toBe(false);
  });

  it("disconnects at sign-out, after which no machine data counts as fresh", () => {
    const hook = signedInFor(true);

    hook.rerender({ on: false });

    expect(stopMachine).toHaveBeenCalled();
    expect(stopConnect).toHaveBeenCalled();
    expect(mockWs.disconnect).toHaveBeenCalledTimes(1);
    expect(isFresh("machines", { data: [], updatedAt: Date.now() }, { staleTime: 60_000, live: true })).toBe(false);
  });

  it("refetches the machine data on screen after a reconnect, but not on the first connect", async () => {
    const fetcher = jest.fn().mockResolvedValue([machine("Available")]);
    await fetchCached("machines", fetcher);
    subscribeCached("machines", () => {});
    signedInFor(true);

    await act(async () => onConnect());
    expect(fetcher).toHaveBeenCalledTimes(1);

    await act(async () => onConnect());
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});
