import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, renderHook, waitFor } from "@testing-library/react-native";

import { useCachedResource, useCachedResources } from "@/hooks/useCachedResource";
import { clearCache, patchCachedMachine, peekCached, setLiveSinceSource, writeCached } from "@/services/resourceCache";

jest.mock("@react-native-async-storage/async-storage", () =>
  jest.requireActual("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const MINUTE = 60_000;

beforeEach(async () => {
  await clearCache();
  await AsyncStorage.clear();
  setLiveSinceSource(() => null);
});

describe("useCachedResource", () => {
  it("shows a spinner only when nothing is saved, then the fetched data", async () => {
    const request = deferred<string[]>();
    const fetcher = jest.fn(() => request.promise);

    const { result } = renderHook(() => useCachedResource("muscle-groups", fetcher));
    expect(result.current.loading).toBe(true);
    expect(result.current.data).toBeUndefined();

    await act(async () => request.resolve(["Back", "Chest"]));

    expect(result.current.loading).toBe(false);
    expect(result.current.data).toEqual(["Back", "Chest"]);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("shows a fresh saved copy at once without fetching", async () => {
    writeCached("muscle-groups", ["Back"]);
    const fetcher = jest.fn().mockResolvedValue(["Changed"]);

    const { result } = renderHook(() => useCachedResource("muscle-groups", fetcher, { staleTime: 10 * MINUTE }));

    expect(result.current.loading).toBe(false);
    expect(result.current.data).toEqual(["Back"]);
    await act(async () => {});
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("shows a stale saved copy at once and swaps in the fetched one", async () => {
    writeCached("muscle-groups", ["Back"], Date.now() - 20 * MINUTE);
    const request = deferred<string[]>();

    const { result } = renderHook(() =>
      useCachedResource("muscle-groups", () => request.promise, { staleTime: 10 * MINUTE }),
    );

    expect(result.current.loading).toBe(false);
    expect(result.current.data).toEqual(["Back"]);
    await act(async () => request.resolve(["Back", "Chest"]));
    expect(result.current.data).toEqual(["Back", "Chest"]);
  });

  it("finds a copy saved before an app restart in phone storage", async () => {
    await AsyncStorage.setItem("cache:v1:muscle-groups", JSON.stringify({ data: ["Abs"], updatedAt: Date.now() }));
    const fetcher = jest.fn().mockResolvedValue(["Abs"]);

    const { result } = renderHook(() => useCachedResource("muscle-groups", fetcher, { staleTime: 10 * MINUTE }));

    await waitFor(() => expect(result.current.data).toEqual(["Abs"]));
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("lets screens using the same key share one request and its data", async () => {
    const request = deferred<string[]>();
    const fetcher = jest.fn(() => request.promise);

    const first = renderHook(() => useCachedResource("muscle-groups", fetcher));
    const second = renderHook(() => useCachedResource("muscle-groups", fetcher));
    await act(async () => request.resolve(["Back"]));

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(first.result.current.data).toEqual(["Back"]);
    expect(second.result.current.data).toEqual(["Back"]);
  });

  it("keeps showing the saved copy when the refresh fails, and reports the error", async () => {
    writeCached("muscle-groups", ["Back"], 0);

    const { result } = renderHook(() =>
      useCachedResource("muscle-groups", () => Promise.reject(new Error("offline"))),
    );

    await waitFor(() => expect(result.current.error).toBeTruthy());
    expect(result.current.data).toEqual(["Back"]);
    expect(result.current.loading).toBe(false);
  });

  it("stops the spinner and reports the error when there's nothing to show", async () => {
    const { result } = renderHook(() =>
      useCachedResource("muscle-groups", () => Promise.reject(new Error("offline"))),
    );

    await waitFor(() => expect(result.current.error).toBeTruthy());
    expect(result.current.loading).toBe(false);
    expect(result.current.data).toBeUndefined();
  });

  it("revalidate fetches only a stale copy; refresh always fetches", async () => {
    const fetcher = jest.fn().mockResolvedValue(["Back"]);
    const { result } = renderHook(() => useCachedResource("muscle-groups", fetcher, { staleTime: 10 * MINUTE }));
    await waitFor(() => expect(result.current.data).toEqual(["Back"]));

    await act(async () => result.current.revalidate());
    expect(fetcher).toHaveBeenCalledTimes(1);

    const request = deferred<string[]>();
    fetcher.mockReturnValueOnce(request.promise);
    let refreshed!: Promise<void>;
    act(() => {
      refreshed = result.current.refresh();
    });
    expect(result.current.refreshing).toBe(true);
    await act(async () => {
      request.resolve(["Back", "Chest"]);
      await refreshed;
    });
    expect(result.current.refreshing).toBe(false);
    expect(result.current.data).toEqual(["Back", "Chest"]);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("shows initialData until the key's own data arrives", async () => {
    const request = deferred<{ id: number; status: string }>();
    const { result } = renderHook(() =>
      useCachedResource("machine:3", () => request.promise, { initialData: { id: 3, status: "Available" } }),
    );

    expect(result.current.loading).toBe(false);
    expect(result.current.data).toEqual({ id: 3, status: "Available" });
    await act(async () => request.resolve({ id: 3, status: "In Use" }));
    expect(result.current.data).toEqual({ id: 3, status: "In Use" });
  });

  it("does nothing for a null key", async () => {
    const fetcher = jest.fn();
    const { result } = renderHook(() => useCachedResource(null, fetcher));

    await act(async () => result.current.revalidate());
    expect(result.current).toMatchObject({ data: undefined, loading: false });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("redraws with a live machine update without refetching", async () => {
    const fetcher = jest.fn().mockResolvedValue([{ id: 1, code: "BP001", status: "Available", exercise: "Bench" }]);
    setLiveSinceSource(() => 0);
    const { result } = renderHook(() =>
      useCachedResource<{ status: string }[]>("machines", fetcher, { live: true, staleTime: 2 * MINUTE }),
    );
    await waitFor(() => expect(result.current.data).toHaveLength(1));

    act(() => patchCachedMachine({ id: 1, code: "BP001", status: "In Use", exercise: "Bench" }));

    expect(result.current.data?.[0].status).toBe("In Use");
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});

describe("useCachedResources", () => {
  const request = (name: string, fetcher: () => Promise<unknown>) => ({ key: `machines-by-exercise:${name}`, fetcher });

  it("fetches each key that isn't saved and returns them by key", async () => {
    writeCached("machines-by-exercise:squat", ["saved"]);
    const bench = jest.fn().mockResolvedValue(["bench"]);
    const squat = jest.fn().mockResolvedValue(["fresh squat"]);

    const { result } = renderHook(() =>
      useCachedResources([request("bench", bench), request("squat", squat)], { staleTime: 10 * MINUTE }),
    );

    await waitFor(() => expect(result.current.data["machines-by-exercise:bench"]).toEqual(["bench"]));
    expect(result.current.data["machines-by-exercise:squat"]).toEqual(["saved"]);
    expect(squat).not.toHaveBeenCalled();
  });

  it("leaves a key undefined when its fetch fails, without affecting the others", async () => {
    const { result } = renderHook(() =>
      useCachedResources([
        request("bench", () => Promise.resolve(["bench"])),
        request("squat", () => Promise.reject(new Error("offline"))),
      ]),
    );

    await waitFor(() => expect(result.current.data["machines-by-exercise:bench"]).toEqual(["bench"]));
    expect(result.current.data["machines-by-exercise:squat"]).toBeUndefined();
  });

  it("refresh refetches every key, fresh or not", async () => {
    const bench = jest.fn().mockResolvedValue(["bench"]);
    const { result } = renderHook(() => useCachedResources([request("bench", bench)], { staleTime: 10 * MINUTE }));
    await waitFor(() => expect(peekCached("machines-by-exercise:bench")).toBeDefined());

    await act(() => result.current.refresh());

    expect(bench).toHaveBeenCalledTimes(2);
  });

  it("returns the same data object until something changes", async () => {
    writeCached("machines-by-exercise:bench", ["bench"]);
    const { result, rerender } = renderHook(() =>
      useCachedResources([request("bench", jest.fn())], { staleTime: 10 * MINUTE }),
    );
    const first = result.current.data;

    rerender({});

    expect(result.current.data).toBe(first);
  });
});
