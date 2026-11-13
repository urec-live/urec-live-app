import React from "react";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";
import Equipment from "@/app/(tabs)/equipment";
import {
  clearCache,
  patchCachedMachine,
  setLiveSinceSource,
} from "@/services/resourceCache";
import type { MachineDto, FloorPlanResponse } from "@/services/machineAPI";
const mockPush = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush }),
  useFocusEffect: (cb: () => void) => {
    require("react").useEffect(cb, [cb]);
  },
}));
jest.mock("@/contexts/GymContext", () => ({
  useGym: () => ({ gym: { id: 1, name: "University gym" }, loading: false }),
}));
const mockApi = {
  listAll: jest.fn(),
  getFloorPlans: jest.fn(),
  getFloorPlan: jest.fn(),
  getExercisesByEquipmentId: jest.fn(),
};
jest.mock("@/services/machineAPI", () => ({
  machineAPI: new Proxy(
    {},
    {
      get:
        (_t, k: string) =>
        (...args: unknown[]) =>
          mockApi[k as keyof typeof mockApi](...args),
    },
  ),
}));
jest.mock("@/services/websocketService", () => ({
  __esModule: true,
  default: { onConnectionChange: () => () => {}, getConnectedSince: () => 1 },
}));
jest.mock("@/services/sessionAPI", () => ({ sessionAPI: {} }));
jest.mock("@/components/FloorMap", () => {
  const { View, Text } = require("react-native");
  return {
    __esModule: true,
    default: (p: any) => (
      <View>
        <Text testID="map-floor">{String(p.selectedFloorId)}</Text>
        <Text testID="map-selected">{String(p.highlightedEquipmentId)}</Text>
        <Text testID="map-matches">
          {String(p.matchingEquipmentIds?.size ?? -1)}
        </Text>
      </View>
    ),
  };
});
jest.mock("@expo/vector-icons", () => ({ MaterialCommunityIcons: () => null }));
jest.mock("@react-native-async-storage/async-storage", () =>
  jest.requireActual(
    "@react-native-async-storage/async-storage/jest/async-storage-mock",
  ),
);
const cable: MachineDto = {
  id: 1,
  code: "C1",
  name: "Cable Station",
  status: "Available",
  exercise: "Cable Fly",
  exerciseNames: ["Cable Fly", "Face Pull"],
  muscleGroups: ["Chest", "Back"],
  floorX: 100,
  floorY: 100,
};
const treadmill: MachineDto = {
  ...cable,
  id: 2,
  code: "T1",
  name: "Treadmill",
  exercise: "Running",
  exerciseNames: ["Running"],
  muscleGroups: ["Cardio"],
  status: "In Use",
};
const floors: FloorPlanResponse[] = [
  {
    id: 7,
    name: "Ground",
    width: 800,
    height: 600,
    floorNumber: 0,
    imageUrl: null,
    equipment: [cable],
    layout: {
      version: 1,
      areas: [
        {
          id: "pool",
          name: "Indoor pool",
          kind: "pool",
          shape: "rect",
          x: 300,
          y: 300,
          width: 300,
          height: 200,
        },
      ],
    },
  },
  {
    id: 8,
    name: "Level 2",
    width: 800,
    height: 600,
    floorNumber: 1,
    imageUrl: null,
    equipment: [treadmill],
  },
];
beforeEach(async () => {
  jest.clearAllMocks();
  await clearCache();
  setLiveSinceSource(() => 0);
  mockApi.listAll.mockResolvedValue([cable, treadmill]);
  mockApi.getFloorPlans.mockResolvedValue(floors);
  mockApi.getExercisesByEquipmentId.mockResolvedValue([]);
});
it("preserves Ground during search, then switches and opens a cross-floor result", async () => {
  render(<Equipment />);
  await screen.findByText("Treadmill");
  expect(screen.getByTestId("map-floor").props.children).toBe("7");
  fireEvent.changeText(
    screen.getByLabelText("Search equipment, exercises, or places"),
    "running",
  );
  expect(screen.queryByText("Cable Station")).toBeNull();
  expect(screen.getByTestId("map-floor").props.children).toBe("7");
  fireEvent.press(screen.getByLabelText(/Treadmill, In Use/));
  expect(screen.getByTestId("map-floor").props.children).toBe("8");
  expect(screen.getByTestId("map-selected").props.children).toBe("2");
  fireEvent.press(screen.getByText("View equipment"));
  expect(mockPush).toHaveBeenCalledWith({
    pathname: "/machine/[id]",
    params: { id: "2" },
  });
});
it("combines filters and updates live counts without moving floors", async () => {
  render(<Equipment />);
  await screen.findByText("Cable Station");
  fireEvent.changeText(
    screen.getByLabelText("Search equipment, exercises, or places"),
    "fly",
  );
  fireEvent.press(screen.getByLabelText("Availability: Any availability"));
  fireEvent.press(screen.getByLabelText("Availability: choose Available"));
  expect(screen.getByTestId("map-matches").props.children).toBe("1");
  await act(async () => patchCachedMachine({ ...cable, status: "In Use" }));
  expect(screen.getByText("No matches")).toBeTruthy();
  expect(screen.getByTestId("map-floor").props.children).toBe("7");
  expect(screen.getByTestId("map-matches").props.children).toBe("0");
});
it("searches places and clears an empty search", async () => {
  render(<Equipment />);
  await screen.findByText("Indoor pool");
  fireEvent.changeText(
    screen.getByLabelText("Search equipment, exercises, or places"),
    "pool",
  );
  expect(screen.getByText("Indoor pool")).toBeTruthy();
  expect(screen.queryByText("Cable Station")).toBeNull();
  fireEvent.changeText(
    screen.getByLabelText("Search equipment, exercises, or places"),
    "not-a-machine",
  );
  expect(screen.getByText("No matches")).toBeTruthy();
  fireEvent.press(screen.getAllByText("Clear filters")[0]);
  expect(screen.getByText("Cable Station")).toBeTruthy();
});
it("loads equipment before maps and searches legacy exercise metadata", async () => {
  const { exerciseNames: _e, muscleGroups: _m, ...old } = cable;
  mockApi.listAll.mockResolvedValue([old]);
  mockApi.getFloorPlans.mockReturnValue(new Promise(() => {}));
  mockApi.getExercisesByEquipmentId.mockResolvedValue([
    { id: 3, name: "Legacy face pull", muscleGroup: "Back" },
  ]);
  render(<Equipment />);
  await screen.findByText("Cable Station");
  await waitFor(() =>
    expect(mockApi.getExercisesByEquipmentId).toHaveBeenCalledWith(1),
  );
  fireEvent.changeText(
    screen.getByLabelText("Search equipment, exercises, or places"),
    "legacy",
  );
  await waitFor(() => expect(screen.getByText("Cable Station")).toBeTruthy());
  expect(screen.getByText("Location not mapped")).toBeTruthy();
});
