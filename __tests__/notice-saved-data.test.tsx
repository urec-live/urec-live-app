import { render, screen } from "@testing-library/react-native";
import { AxiosError } from "axios";
import React from "react";
import { View } from "react-native";

import Equipment from "@/app/(tabs)/equipment";
import BackendUnreachableNotice from "@/components/BackendUnreachableNotice";
import api from "@/services/authAPI";
import { resetBackendStatus } from "@/services/backendStatus";
import { cacheKeys } from "@/services/cachedResources";
import type { MachineDto } from "@/services/machineAPI";
import { clearCache, writeCached } from "@/services/resourceCache";

jest.mock("expo-router", () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock("@/components/MapModal", () => () => null);
jest.mock("@expo/vector-icons", () => ({ MaterialCommunityIcons: () => null }));
jest.mock("@react-native-async-storage/async-storage", () =>
  jest.requireActual("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

const cable: MachineDto = {
  id: 1,
  code: "CC001",
  name: "Cable Station",
  status: "Available",
  exercise: "Cable Fly",
  exerciseNames: ["Cable Fly"],
  muscleGroups: ["Chest"],
};

/**
 * The real Equipment tab, saved-data layer and shared API client together, with the server out
 * of reach: the member keeps the saved list, and the bar explains why it may be out of date.
 */
describe("The unreachable notice with saved data", () => {
  const originalAdapter = api.defaults.adapter;

  beforeEach(async () => {
    await clearCache();
    resetBackendStatus();
    api.defaults.adapter = (config) => Promise.reject(new AxiosError("Network Error", "ERR_NETWORK", config));
  });

  afterEach(() => {
    api.defaults.adapter = originalAdapter;
  });

  it("keeps the saved machines on screen and shows the bar when the refresh can't reach the server", async () => {
    // Saved earlier; live updates aren't connected, so it's due for a refresh
    writeCached(cacheKeys.machines, [cable]);

    render(
      <View>
        <BackendUnreachableNotice />
        <Equipment />
      </View>,
    );

    expect(await screen.findByText("Can't reach UREC Live")).toBeTruthy();
    expect(screen.getByText("Cable Station")).toBeTruthy();
    expect(screen.queryByText("Loading machines...")).toBeNull();
  });
});
