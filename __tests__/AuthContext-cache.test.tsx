import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, render, waitFor } from "@testing-library/react-native";
import React from "react";

import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { clearCache, peekCached, writeCached } from "@/services/resourceCache";

jest.mock("@react-native-async-storage/async-storage", () =>
  jest.requireActual("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

let mockOnAuthFailure: (() => void) | null = null;
jest.mock("@/services/authAPI", () => ({
  authAPI: { login: jest.fn(), register: jest.fn() },
  setAuthFailureHandler: (handler: () => void) => {
    mockOnAuthFailure = handler;
  },
}));

let auth: ReturnType<typeof useAuth>;
function Probe() {
  auth = useAuth();
  return null;
}

const saved = (data: unknown) => JSON.stringify({ data, updatedAt: Date.now() });

async function signedInApp() {
  await AsyncStorage.multiSet([
    ["user", JSON.stringify({ username: "sam", email: "sam@example.com" })],
    ["accessToken", "token"],
    ["refreshToken", "refresh"],
    ["cache:v1:user:sam:profile", saved({ streak: 3 })],
    ["cache:v1:muscle-groups", saved(["Back", "Chest"])],
  ]);
  render(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  );
  await waitFor(() => expect(auth.user?.username).toBe("sam"));
}

beforeEach(async () => {
  await clearCache();
  await AsyncStorage.clear();
  mockOnAuthFailure = null;
});

describe("AuthContext and saved data", () => {
  it("has the saved data in memory by the time the signed-in screens show", async () => {
    await signedInApp();

    expect(peekCached("user:sam:profile")?.data).toEqual({ streak: 3 });
    expect(peekCached("muscle-groups")?.data).toEqual(["Back", "Chest"]);
  });

  it("forgets the member's saved data on sign-out, keeping the gym's", async () => {
    await signedInApp();

    await act(() => auth.signOut());

    expect(auth.user).toBeNull();
    expect(peekCached("user:sam:profile")).toBeUndefined();
    expect(await AsyncStorage.getItem("cache:v1:user:sam:profile")).toBeNull();
    expect(peekCached("muscle-groups")?.data).toEqual(["Back", "Chest"]);
  });

  it("forgets it too when the session expires and can't be refreshed", async () => {
    await signedInApp();
    writeCached("user:sam:history", []);

    await act(async () => mockOnAuthFailure!());

    expect(auth.user).toBeNull();
    await waitFor(() => expect(peekCached("user:sam:history")).toBeUndefined());
    expect(peekCached("user:sam:profile")).toBeUndefined();
  });
});
