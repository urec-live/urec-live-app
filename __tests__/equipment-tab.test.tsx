import "react-native-gesture-handler/jestSetup";
import React from "react";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";
import { FlatList } from "react-native";
import { State } from "react-native-gesture-handler";
import {
  fireGestureHandler,
  getByGestureTestId,
} from "react-native-gesture-handler/jest-utils";
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
        <Text testID="map-full-screen">{String(!!p.fullScreen)}</Text>
        <Text testID="map-insets">{`${p.insets?.top}/${p.insets?.bottom}`}</Text>
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
const SEARCH = "Search equipment, exercises, or places";
/** Opens the results sheet with a tap on its title. */
const openList = () => fireEvent.press(screen.getByLabelText("Show equipment list"));
const listOpen = () =>
  screen.getByLabelText(/^(Show|Hide) equipment list$/).props
    .accessibilityState.expanded;
/** A pan: BEGAN, ACTIVE, then released at `dy` px with `vy` px/s (negative = up). */
const swipe = (gestureId: string, dy: number, vy: number) =>
  act(async () =>
    fireGestureHandler(getByGestureTestId(gestureId), [
      { state: State.BEGAN, translationY: 0, velocityY: 0 },
      { state: State.ACTIVE, translationY: dy / 2, velocityY: vy },
      { state: State.ACTIVE, translationY: dy, velocityY: vy },
      { state: State.END, translationY: dy, velocityY: vy },
    ]),
  );
const layout = (testID: string, height: number) =>
  fireEvent(
    screen.getByTestId(testID, { includeHiddenElements: true }),
    "layout",
    { nativeEvent: { layout: { x: 0, y: 0, width: 390, height } } },
  );
/** Measured sizes: panel 200, pill 44, closed sheet 76, screen 700, so the sheet travels 416. */
const measure = () => {
  layout("map-top-panel", 200);
  layout("map-top-pill", 44);
  layout("results-sheet-peek", 76);
  layout("equipment-screen", 700);
};
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
  openList();
  await screen.findByText("Treadmill");
  expect(screen.getByTestId("map-floor").props.children).toBe("7");
  fireEvent.changeText(screen.getByLabelText(SEARCH), "running");
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
  openList();
  await screen.findByText("Cable Station");
  fireEvent.changeText(screen.getByLabelText(SEARCH), "fly");
  fireEvent.press(screen.getByLabelText("Filters, 0 active"));
  fireEvent.press(screen.getByLabelText("Availability: choose Available"));
  fireEvent.press(screen.getByLabelText("Done filtering"));
  expect(screen.getByLabelText("Filters, 1 active")).toBeTruthy();
  expect(screen.getByTestId("map-matches").props.children).toBe("1");
  await act(async () => patchCachedMachine({ ...cable, status: "In Use" }));
  expect(screen.getByText("No matches")).toBeTruthy();
  expect(screen.getByTestId("map-floor").props.children).toBe("7");
  expect(screen.getByTestId("map-matches").props.children).toBe("0");
});
it("searches places and clears an empty search", async () => {
  render(<Equipment />);
  openList();
  await screen.findByText("Indoor pool");
  fireEvent.changeText(screen.getByLabelText(SEARCH), "pool");
  expect(screen.getByText("Indoor pool")).toBeTruthy();
  expect(screen.queryByText("Cable Station")).toBeNull();
  fireEvent.changeText(screen.getByLabelText(SEARCH), "not-a-machine");
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
  openList();
  await screen.findByText("Cable Station");
  await waitFor(() =>
    expect(mockApi.getExercisesByEquipmentId).toHaveBeenCalledWith(1),
  );
  fireEvent.changeText(screen.getByLabelText(SEARCH), "legacy");
  await waitFor(() => expect(screen.getByText("Cable Station")).toBeTruthy());
  expect(screen.getByText("Location not mapped")).toBeTruthy();
});
describe("full-screen map with sliding panels", () => {
  it("starts with the map full screen, the search panel open and the results closed", async () => {
    render(<Equipment />);
    await screen.findByText("2 on Ground · 1 elsewhere");
    expect(screen.getByText(/Equipment & places/)).toBeTruthy();
    expect(screen.getByTestId("map-full-screen").props.children).toBe("true");
    expect(screen.getByLabelText(SEARCH)).toBeTruthy();
    expect(screen.getByLabelText("Hide search and floors")).toBeTruthy();
    expect(screen.queryByLabelText("Show search and floors")).toBeNull();
    expect(listOpen()).toBe(false);
    // The list is there, under the map's edge, but out of reach until the sheet opens.
    expect(screen.queryByText("Cable Station")).toBeNull();
    expect(
      screen.getByText("Cable Station", { includeHiddenElements: true }),
    ).toBeTruthy();
  });

  it("hides the search panel with its handle and brings it back from the pill", async () => {
    render(<Equipment />);
    await screen.findByText("2 on Ground · 1 elsewhere");
    fireEvent.changeText(screen.getByLabelText(SEARCH), "cable");
    fireEvent.press(screen.getByLabelText("Hide search and floors"));
    expect(screen.queryByLabelText(SEARCH)).toBeNull();
    expect(screen.getByText("Ground · “cable”")).toBeTruthy();
    fireEvent.press(screen.getByLabelText("Show search and floors"));
    expect(screen.getByLabelText(SEARCH).props.value).toBe("cable");
    expect(screen.queryByLabelText("Show search and floors")).toBeNull();
  });

  it("swipes the search panel up and away, and pulls it back down", async () => {
    render(<Equipment />);
    await screen.findByText("2 on Ground · 1 elsewhere");
    measure();
    // A short, slow drag springs back.
    await swipe("map-top-panel-drag", -60, -100);
    await waitFor(() => expect(screen.getByLabelText(SEARCH)).toBeTruthy());
    // Dragged three quarters of the way, slowly: it settles hidden.
    await swipe("map-top-panel-drag", -150, -100);
    await waitFor(() => expect(screen.queryByLabelText(SEARCH)).toBeNull());
    expect(screen.getByText("Ground")).toBeTruthy();
    // A downward flick on the pill brings it back.
    await swipe("map-top-pill-drag", 30, 900);
    await waitFor(() => expect(screen.getByLabelText(SEARCH)).toBeTruthy());
    // An upward flick hides it however short the drag.
    await swipe("map-top-panel-drag", -15, -900);
    await waitFor(() => expect(screen.queryByLabelText(SEARCH)).toBeNull());
  });

  it("opens the results with a swipe up or a tap, over the map", async () => {
    render(<Equipment />);
    await screen.findByText("2 on Ground · 1 elsewhere");
    measure();
    // Slow drag up 250 of 416 px: past halfway, so it opens.
    await swipe("results-sheet-drag", -250, -100);
    await waitFor(() => expect(listOpen()).toBe(true));
    expect(screen.getByText("Cable Station")).toBeTruthy();
    expect(screen.getByText("Out of Order")).toBeTruthy(); // the legend
    // The map keeps its size: the sheet only covers it.
    expect(screen.getByTestId("map-insets").props.children).toBe("200/76");
    // A downward flick closes it.
    await swipe("results-sheet-drag", 40, 900);
    await waitFor(() => expect(listOpen()).toBe(false));
    expect(screen.queryByText("Cable Station")).toBeNull();
    // Tapping the title toggles it.
    openList();
    expect(listOpen()).toBe(true);
    fireEvent.press(screen.getByLabelText("Hide equipment list"));
    expect(listOpen()).toBe(false);
  });

  it("tells the map how much of it the panels cover", async () => {
    render(<Equipment />);
    await screen.findByText("2 on Ground · 1 elsewhere");
    measure();
    expect(screen.getByTestId("map-insets").props.children).toBe("200/76");
    fireEvent.press(screen.getByLabelText("Hide search and floors"));
    // Hidden, only the pill (44) and its 8 px gap remain at the top.
    expect(screen.getByTestId("map-insets").props.children).toBe("52/76");
    layout("results-sheet-peek", 180); // a selection card joined the closed sheet
    expect(screen.getByTestId("map-insets").props.children).toBe("52/180");
  });

  it("closes the list when a result is chosen and keeps its card in the closed sheet", async () => {
    render(<Equipment />);
    openList();
    fireEvent.press(await screen.findByLabelText(/Cable Station, Available/));
    expect(listOpen()).toBe(false);
    expect(screen.getByTestId("map-selected").props.children).toBe("1");
    expect(screen.getByText("View equipment")).toBeTruthy();
    fireEvent.press(screen.getByLabelText("Close selection"));
    expect(screen.queryByText("View equipment")).toBeNull();
  });

  it("starts a new search at the top of the list", async () => {
    const scrollTo = jest.spyOn(FlatList.prototype, "scrollToOffset");
    render(<Equipment />);
    openList();
    await screen.findByText("Cable Station");
    scrollTo.mockClear();
    fireEvent.changeText(screen.getByLabelText(SEARCH), "tread");
    expect(scrollTo).toHaveBeenCalledWith({ offset: 0, animated: false });
    scrollTo.mockClear();
    fireEvent.press(screen.getByLabelText(/Treadmill, In Use/));
    // Choosing a result isn't a new search: the list stays where it was.
    expect(scrollTo).not.toHaveBeenCalled();
    scrollTo.mockRestore();
  });

  it("opens the results when the keyboard's search key is pressed", async () => {
    render(<Equipment />);
    await screen.findByText("2 on Ground · 1 elsewhere");
    fireEvent.changeText(screen.getByLabelText(SEARCH), "running");
    fireEvent(screen.getByLabelText(SEARCH), "submitEditing");
    expect(listOpen()).toBe(true);
    expect(screen.getByText("Treadmill")).toBeTruthy();
  });
});
