import { render, screen } from "@testing-library/react-native";
import React from "react";

import EquipmentScreen from "@/app/(tabs)/equipment";

jest.mock("expo-router", () => ({ useRouter: () => ({ push: jest.fn() }) }));

const mockListAll = jest.fn();
jest.mock("@/services/machineAPI", () => ({
  machineAPI: {
    listAll: (...args: unknown[]) => mockListAll(...args),
    getExercisesByEquipmentId: () => Promise.resolve([]),
    getFloorPlans: () => Promise.resolve([]),
    getFloorPlan: () => Promise.reject(new Error("no floor plan")),
  },
}));

jest.mock("@/services/websocketService", () => ({
  __esModule: true,
  default: { connect: jest.fn(), subscribe: () => () => {} },
}));
jest.mock("@/components/MapModal", () => () => null);
jest.mock("@expo/vector-icons", () => ({ MaterialCommunityIcons: () => null }));

const machine = (id: number, name: string, status: string) => ({
  id,
  code: `M${id}`,
  name,
  status,
  exercise: "Leg Press",
});

describe("Equipment tab", () => {
  it("labels each machine Available, In Use or Out of order", async () => {
    mockListAll.mockResolvedValue([
      machine(1, "Leg Press A", "Available"),
      machine(2, "Leg Press B", "In Use"),
      machine(3, "Leg Press C", "Out of Order"),
    ]);
    render(<EquipmentScreen />);

    expect(await screen.findByText("Leg Press C")).toBeTruthy();
    expect(screen.getByText("Out of order")).toBeTruthy();
    expect(screen.getByText("Available")).toBeTruthy();
    expect(screen.getByText("In Use")).toBeTruthy();
  });
});
