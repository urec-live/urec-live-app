import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  clearCache,
  clearUserCache,
  fetchCached,
  invalidateCached,
  isFresh,
  patchCachedMachine,
  patchMachines,
  peekCached,
  preloadCache,
  readCached,
  revalidateLiveResources,
  setLiveSinceSource,
  subscribeCached,
  updateCached,
  writeCached,
} from "@/services/resourceCache";

jest.mock("@react-native-async-storage/async-storage", () =>
  jest.requireActual("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

// Lets fire-and-forget storage writes land
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

const machine = (id: number, status: string, exercise = "Bench Press") => ({
  id,
  code: `BP00${id}`,
  name: `Bench ${id}`,
  status,
  exercise,
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

beforeEach(async () => {
  await clearCache();
  await AsyncStorage.clear();
  setLiveSinceSource(() => null);
  jest.restoreAllMocks();
});

describe("saving and reading", () => {
  it("keeps written data in memory and in phone storage", async () => {
    writeCached("muscle-groups", ["Back", "Chest"], 1000);
    await settle();

    expect(peekCached("muscle-groups")).toEqual({ data: ["Back", "Chest"], updatedAt: 1000 });
    expect(JSON.parse((await AsyncStorage.getItem("cache:v1:muscle-groups"))!)).toEqual({
      data: ["Back", "Chest"],
      updatedAt: 1000,
    });
  });

  it("reads a copy saved before an app restart back from storage", async () => {
    await AsyncStorage.setItem("cache:v1:muscle-groups", JSON.stringify({ data: ["Abs"], updatedAt: 5 }));
    expect(peekCached("muscle-groups")).toBeUndefined();

    expect(await readCached("muscle-groups")).toEqual({ data: ["Abs"], updatedAt: 5 });
    expect(peekCached("muscle-groups")).toEqual({ data: ["Abs"], updatedAt: 5 });
  });

  it("preloads every saved copy, ignoring unrelated and broken entries", async () => {
    await AsyncStorage.multiSet([
      ["cache:v1:muscle-groups", JSON.stringify({ data: ["Abs"], updatedAt: 5 })],
      ["cache:v1:user:sam:profile", JSON.stringify({ data: { streak: 3 }, updatedAt: 6 })],
      ["cache:v1:broken", "{not json"],
      ["accessToken", "secret"],
    ]);

    await preloadCache();

    expect(peekCached("muscle-groups")?.data).toEqual(["Abs"]);
    expect(peekCached("user:sam:profile")?.data).toEqual({ streak: 3 });
    expect(peekCached("broken")).toBeUndefined();
    expect(peekCached("accessToken")).toBeUndefined();
  });

  it("only tells listeners when the data actually changed", () => {
    const listener = jest.fn();
    subscribeCached("muscle-groups", listener);

    writeCached("muscle-groups", ["Back"], 1);
    writeCached("muscle-groups", ["Back"], 2);

    expect(listener).toHaveBeenCalledTimes(1);
    // Still notes that the copy was checked
    expect(peekCached("muscle-groups")?.updatedAt).toBe(2);

    writeCached("muscle-groups", ["Back", "Chest"], 3);
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("updates a saved copy in place, keeping its fetch time", () => {
    writeCached("exercises:chest", [{ name: "Fly" }], 7);
    updateCached<{ name: string }[]>("exercises:chest", (list) => [...list, { name: "Press" }]);

    expect(peekCached("exercises:chest")).toEqual({ data: [{ name: "Fly" }, { name: "Press" }], updatedAt: 7 });
    updateCached("nothing-saved", () => "ignored");
    expect(peekCached("nothing-saved")).toBeUndefined();
  });
});

describe("fetching", () => {
  it("shares one request between callers asking for the same key", async () => {
    const request = deferred<string[]>();
    const fetcher = jest.fn(() => request.promise);

    const first = fetchCached("muscle-groups", fetcher);
    const second = fetchCached("muscle-groups", fetcher);
    request.resolve(["Back"]);

    expect(await first).toEqual(["Back"]);
    expect(await second).toEqual(["Back"]);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(peekCached("muscle-groups")?.data).toEqual(["Back"]);

    // Once it's done, the next call fetches again
    await fetchCached("muscle-groups", fetcher);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("keeps the saved copy when a fetch fails", async () => {
    writeCached("muscle-groups", ["Back"], 1);

    await expect(fetchCached("muscle-groups", () => Promise.reject(new Error("offline")))).rejects.toThrow("offline");
    expect(peekCached("muscle-groups")?.data).toEqual(["Back"]);
  });

  it("drops the result of a fetch that was running when the member signed out", async () => {
    const request = deferred<{ streak: number }>();
    const pending = fetchCached("user:sam:profile", () => request.promise);

    await clearUserCache();
    request.resolve({ streak: 3 });
    await pending;

    expect(peekCached("user:sam:profile")).toBeUndefined();
  });
});

describe("freshness", () => {
  it("is fresh until staleTime has passed", () => {
    jest.spyOn(Date, "now").mockReturnValue(10_000);
    const entry = { data: 1, updatedAt: 9_000 };

    expect(isFresh("muscle-groups", entry, { staleTime: 5_000 })).toBe(true);
    expect(isFresh("muscle-groups", entry, { staleTime: 1_000 })).toBe(false);
    expect(isFresh("muscle-groups", entry, { staleTime: 0 })).toBe(false);
  });

  it("is stale once invalidated, for keys under the prefix only", () => {
    const now = jest.spyOn(Date, "now").mockReturnValue(10_000);
    const entry = { data: 1, updatedAt: 9_000 };

    invalidateCached("user:sam:");

    expect(isFresh("user:sam:history", entry, { staleTime: 60_000 })).toBe(false);
    expect(isFresh("user:alex:history", entry, { staleTime: 60_000 })).toBe(true);
    // A copy fetched after the invalidation is fresh again
    now.mockReturnValue(12_000);
    expect(isFresh("user:sam:history", { data: 1, updatedAt: 11_000 }, { staleTime: 60_000 })).toBe(true);
  });

  it("keeps machine data fresh only while live updates have been connected since the fetch", () => {
    jest.spyOn(Date, "now").mockReturnValue(10_000);
    const entry = { data: [], updatedAt: 9_000 };
    const options = { staleTime: 60_000, live: true };

    setLiveSinceSource(() => null);
    expect(isFresh("machines", entry, options)).toBe(false);

    setLiveSinceSource(() => 8_000); // connected before the fetch
    expect(isFresh("machines", entry, options)).toBe(true);

    setLiveSinceSource(() => 9_500); // reconnected after it: updates in the gap were missed
    expect(isFresh("machines", entry, options)).toBe(false);
  });
});

describe("live machine updates", () => {
  it("patches every saved machine list, floor plan and machine, keeping each copy's exercise", () => {
    writeCached("machines", [machine(1, "Available", "Bench Press"), machine(2, "Available")]);
    writeCached("machines-by-exercise:incline press", [machine(1, "Available", "Incline Press")]);
    writeCached("machine:1", machine(1, "Available"));
    writeCached("floor-plans", [{ id: 9, name: "Floor 1", equipment: [machine(1, "Available")] }]);
    writeCached("exercises:chest", [{ id: 1, name: "Bench Press", muscleGroup: "Chest" }]);
    const exercisesBefore = peekCached("exercises:chest");

    patchCachedMachine(machine(1, "In Use", "Bench Press"));

    expect(peekCached<ReturnType<typeof machine>[]>("machines")?.data.map((m) => m.status)).toEqual([
      "In Use",
      "Available",
    ]);
    expect(peekCached("machines-by-exercise:incline press")?.data).toEqual([machine(1, "In Use", "Incline Press")]);
    expect(peekCached("machine:1")?.data).toEqual(machine(1, "In Use"));
    expect(peekCached<{ equipment: { status: string }[] }[]>("floor-plans")?.data[0].equipment[0].status).toBe("In Use");
    // Exercises share ids with machines but aren't machines, and that key isn't live anyway
    expect(peekCached("exercises:chest")).toBe(exercisesBefore);
  });

  it("leaves data alone (same object, no redraw) when the update changes nothing", () => {
    writeCached("machines", [machine(1, "Available")]);
    const before = peekCached("machines");
    const listener = jest.fn();
    subscribeCached("machines", listener);

    patchCachedMachine(machine(1, "Available"));
    patchCachedMachine(machine(5, "In Use"));

    expect(peekCached("machines")).toBe(before);
    expect(listener).not.toHaveBeenCalled();
    expect(patchMachines(before!.data, machine(1, "Available"))).toBe(before!.data);
  });

  it("applies an update that arrived while a fetch was running to its (older) result", async () => {
    const request = deferred<ReturnType<typeof machine>[]>();
    const pending = fetchCached("machines-by-exercise:bench press", () => request.promise);

    patchCachedMachine(machine(1, "In Use"));
    // The server read the list before the check-in
    request.resolve([machine(1, "Available"), machine(2, "Available")]);
    await pending;

    expect(peekCached<ReturnType<typeof machine>[]>("machines-by-exercise:bench press")?.data.map((m) => m.status)).toEqual([
      "In Use",
      "Available",
    ]);
  });

  it("ignores updates without a machine id", () => {
    writeCached("machines", [machine(1, "Available")]);
    const before = peekCached("machines");

    patchCachedMachine(undefined as never);
    patchCachedMachine({ code: "X" } as never);

    expect(peekCached("machines")).toBe(before);
  });

  it("after a reconnect, refetches only the machine data that's on screen", async () => {
    const onScreen = jest.fn().mockResolvedValue([machine(1, "In Use")]);
    const offScreen = jest.fn().mockResolvedValue([machine(2, "In Use")]);
    const notLive = jest.fn().mockResolvedValue(["Back"]);
    await fetchCached("machines", onScreen);
    await fetchCached("machines-by-exercise:squat", offScreen);
    await fetchCached("muscle-groups", notLive);
    subscribeCached("machines", () => {});
    subscribeCached("muscle-groups", () => {});

    revalidateLiveResources();
    await settle();

    expect(onScreen).toHaveBeenCalledTimes(2);
    expect(offScreen).toHaveBeenCalledTimes(1);
    expect(notLive).toHaveBeenCalledTimes(1);
  });
});

describe("signing out", () => {
  it("forgets members' data in memory and storage, and keeps the gym's", async () => {
    writeCached("user:sam:profile", { streak: 3 });
    writeCached("user:sam:history", []);
    writeCached("muscle-groups", ["Back"]);
    const listener = jest.fn();
    subscribeCached("user:sam:profile", listener);
    await settle();

    await clearUserCache();

    expect(peekCached("user:sam:profile")).toBeUndefined();
    expect(peekCached("user:sam:history")).toBeUndefined();
    expect(peekCached("muscle-groups")?.data).toEqual(["Back"]);
    expect(listener).toHaveBeenCalled();
    expect(await AsyncStorage.getAllKeys()).toEqual(["cache:v1:muscle-groups"]);
    // Nothing comes back from storage either
    expect(await readCached("user:sam:profile")).toBeUndefined();
  });

  it("still forgets the memory copies when storage fails", async () => {
    writeCached("user:sam:profile", { streak: 3 });
    jest.spyOn(AsyncStorage, "getAllKeys").mockRejectedValueOnce(new Error("disk"));

    await expect(clearUserCache()).resolves.toBeUndefined();
    expect(peekCached("user:sam:profile")).toBeUndefined();
  });
});
