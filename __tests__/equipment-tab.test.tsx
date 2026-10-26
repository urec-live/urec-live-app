import { act, render, screen, waitFor } from "@testing-library/react-native";
import React from "react";
import { RefreshControl } from "react-native";

import Equipment from "@/app/(tabs)/equipment";
import type { MachineDto } from "@/services/machineAPI";
import { clearCache, patchCachedMachine, setLiveSinceSource } from "@/services/resourceCache";

jest.mock("expo-router", () => ({ useRouter: () => ({ push: jest.fn() }) }));

const mockApi = {
  listAll: jest.fn(),
  getExercisesByEquipmentId: jest.fn(),
  getFloorPlans: jest.fn(),
  getFloorPlan: jest.fn(),
};
jest.mock("@/services/machineAPI", () => ({
  machineAPI: new Proxy({}, { get: (_target, name: string) => (...args: unknown[]) => mockApi[name as keyof typeof mockApi](...args) }),
}));
jest.mock("@/services/sessionAPI", () => ({ sessionAPI: {} }));
jest.mock("@/components/MapModal", () => () => null);
jest.mock("@expo/vector-icons", () => ({ MaterialCommunityIcons: () => null }));
jest.mock("@react-native-async-storage/async-storage", () =>
  jest.requireActual("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

const never = () => new Promise<never>(() => {});

// What the updated backend sends: each machine's exercises come with it
const cable = (status = "Available"): MachineDto => ({
  id: 1,
  code: "CC001",
  name: "Cable Station",
  status,
  exercise: "Cable Fly",
  exerciseNames: ["Cable Crossover", "Cable Fly", "Face Pull", "Tricep Pushdown"],
  muscleGroups: ["Back", "Chest", "Triceps"],
});
const treadmill: MachineDto = {
  id: 2,
  code: "TM001",
  name: "Treadmill 1",
  status: "In Use",
  exercise: "Running",
  exerciseNames: ["Running"],
  muscleGroups: ["Cardio"],
};

beforeEach(async () => {
  jest.clearAllMocks();
  await clearCache();
  setLiveSinceSource(() => 0);
  mockApi.listAll.mockResolvedValue([cable(), treadmill]);
  mockApi.getFloorPlans.mockResolvedValue([]);
});

describe("Equipment tab", () => {
  it("makes one request for everything on the cards", async () => {
    render(<Equipment />);

    expect(screen.getByText("Loading machines...")).toBeTruthy();
    expect(await screen.findByText("Cable Station")).toBeTruthy();
    expect(screen.getByText("Back, Chest, Triceps")).toBeTruthy();
    expect(screen.getByText("Cable Crossover, Cable Fly, Face Pull...")).toBeTruthy();
    expect(screen.getByText("Treadmill 1")).toBeTruthy();
    expect(mockApi.listAll).toHaveBeenCalledTimes(1);
    expect(mockApi.getExercisesByEquipmentId).not.toHaveBeenCalled();
  });

  it("shows the list without waiting for the floor plans", async () => {
    mockApi.getFloorPlans.mockImplementation(never);
    render(<Equipment />);

    expect(await screen.findByText("Cable Station")).toBeTruthy();
    expect(screen.queryByText("Locate")).toBeNull(); // appears once the floors are in
  });

  it("offers Locate once the floor plans arrive", async () => {
    mockApi.getFloorPlans.mockResolvedValue([
      { id: 5, name: "Floor 1", imageUrl: null, width: 800, height: 600, floorNumber: 1, equipment: [cable()] },
    ]);
    render(<Equipment />);

    expect(await screen.findByText("Locate")).toBeTruthy();
  });

  it("with an older backend, shows the list first and fills in each machine's exercises after", async () => {
    const { exerciseNames: _names, muscleGroups: _groups, ...oldCable } = cable();
    mockApi.listAll.mockResolvedValue([oldCable]);
    let answer!: (exercises: unknown[]) => void;
    mockApi.getExercisesByEquipmentId.mockReturnValue(new Promise((resolve) => (answer = resolve)));
    render(<Equipment />);

    expect(await screen.findByText("Cable Station")).toBeTruthy();
    expect(mockApi.getExercisesByEquipmentId).toHaveBeenCalledWith(1);

    await act(async () =>
      answer([
        { id: 7, name: "Cable Fly", muscleGroup: "Chest", gifUrl: "" },
        { id: 8, name: "Tricep Pushdown", muscleGroup: "Triceps", gifUrl: "" },
      ]),
    );
    expect(screen.getByText("Chest, Triceps")).toBeTruthy();
    expect(screen.getByText("Cable Fly, Tricep Pushdown")).toBeTruthy();
  });

  it("shows the saved list at once on the next visit, without requests", async () => {
    const first = render(<Equipment />);
    await screen.findByText("Cable Station");
    first.unmount();

    render(<Equipment />);

    expect(screen.queryByText("Loading machines...")).toBeNull();
    expect(screen.getByText("Cable Station")).toBeTruthy();
    await act(async () => {});
    expect(mockApi.listAll).toHaveBeenCalledTimes(1);
    expect(mockApi.getFloorPlans).toHaveBeenCalledTimes(1);
  });

  it("changes a card's status from a live update, without a request", async () => {
    render(<Equipment />);
    await screen.findByText("Cable Station");
    expect(screen.getAllByText("In Use")).toHaveLength(1);

    act(() => patchCachedMachine(cable("In Use")));

    expect(screen.getAllByText("In Use")).toHaveLength(2);
    expect(mockApi.listAll).toHaveBeenCalledTimes(1);
  });

  it("marks a machine Out of order when staff take it out of service, from the live update", async () => {
    render(<Equipment />);
    await screen.findByText("Cable Station");
    expect(screen.queryByText("Out of order")).toBeNull();

    act(() => patchCachedMachine(cable("Out of Order")));

    expect(screen.getByText("Out of order")).toBeTruthy();
    // The update carries the machine's exercises, so the card keeps them
    expect(screen.getByText("Back, Chest, Triceps")).toBeTruthy();
    expect(mockApi.listAll).toHaveBeenCalledTimes(1);
  });

  it("pull-to-refresh refetches the list and the floor plans once each", async () => {
    render(<Equipment />);
    await screen.findByText("Cable Station");

    await act(async () => {
      await screen.UNSAFE_getByType(RefreshControl).props.onRefresh();
    });

    expect(mockApi.listAll).toHaveBeenCalledTimes(2);
    expect(mockApi.getFloorPlans).toHaveBeenCalledTimes(2);
    expect(mockApi.getExercisesByEquipmentId).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.UNSAFE_getByType(RefreshControl).props.refreshing).toBe(false));
  });

  it("shows the empty state when the list can't load and nothing is saved", async () => {
    mockApi.listAll.mockRejectedValue(new Error("offline"));
    render(<Equipment />);

    expect(await screen.findByText("No machines available")).toBeTruthy();
  });
});
