import { cacheKeys, setCacheGymScope } from "@/services/cachedResources";
import type { MachineDto } from "@/services/machineAPI";
import { clearCache, isFresh, patchCachedMachine, peekCached, setLiveSinceSource, writeCached } from "@/services/resourceCache";

jest.mock("@react-native-async-storage/async-storage", () =>
  jest.requireActual("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);
jest.mock("@/services/machineAPI", () => ({ machineAPI: {} }));
jest.mock("@/services/sessionAPI", () => ({ sessionAPI: {} }));

const machine = (id: number, status = "Available"): MachineDto => ({
  id,
  code: `M${id}`,
  name: `Machine ${id}`,
  status,
  exercise: "Bench Press",
});

/** A machine list counts as fresh for live data while the socket has been connected since it was saved */
const fresh = (key: string) => isFresh(key, peekCached(key)!, { live: true, staleTime: 2 * 60 * 1000 });

/** Machines and floor plans are per gym since main's gym settings (#24) */
describe("Saved gym data", () => {
  let now: number;

  beforeEach(async () => {
    await clearCache();
    setCacheGymScope(null);
    now = 1_000_000;
    jest.spyOn(Date, "now").mockImplementation(() => now);
    setLiveSinceSource(() => 0); // live updates connected the whole time
  });

  afterEach(() => jest.restoreAllMocks());

  it("is kept per gym, while a machine's exercises are not", () => {
    setCacheGymScope(3);

    expect(cacheKeys.machines).toBe("machines@3");
    expect(cacheKeys.machine(12)).toBe("machine:12@3");
    expect(cacheKeys.machinesFor("Bench Press")).toBe("machines-by-exercise:bench press@3");
    expect(cacheKeys.floorPlans).toBe("floor-plans@3");
    expect(cacheKeys.machineExercises(12)).toBe("machine-exercises:12");

    setCacheGymScope(null);
    expect(cacheKeys.machines).toBe("machines@none");
  });

  it("still gets live updates", () => {
    setCacheGymScope(3);
    writeCached(cacheKeys.machines, [machine(1)]);

    patchCachedMachine(machine(1, "In Use"));

    expect(peekCached<MachineDto[]>(cacheKeys.machines)?.data[0].status).toBe("In Use");
  });

  it("never shows another gym's saved list", () => {
    setCacheGymScope(3);
    writeCached(cacheKeys.machines, [machine(1)]);

    setCacheGymScope(4);

    expect(peekCached(cacheKeys.machines)).toBeUndefined();
  });

  it("refetches a gym's saved list after switching away and back, though the connection never dropped", () => {
    setCacheGymScope(3);
    now += 500; // the list's request takes a moment
    writeCached(cacheKeys.machines, [machine(1)]);
    expect(fresh(cacheKeys.machines)).toBe(true);

    // Gym 4's updates came in meanwhile, but not gym 3's
    now += 1_000;
    setCacheGymScope(4);
    now += 1_000;
    setCacheGymScope(3);

    expect(fresh(cacheKeys.machines)).toBe(false);
  });

  it("leaves saved data alone when the gym stays the same", () => {
    setCacheGymScope(3);
    now += 500; // the list's request takes a moment
    writeCached(cacheKeys.machines, [machine(1)]);
    now += 1_000;

    setCacheGymScope(3); // called on every render of the root layout

    expect(fresh(cacheKeys.machines)).toBe(true);
  });
});
