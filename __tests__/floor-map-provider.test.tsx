/* eslint-disable @typescript-eslint/no-require-imports -- Jest hoists native mock factories. */
import React from "react";
import { fireEvent, render, screen } from "@testing-library/react-native";
import FloorMap from "@/components/FloorMap";
import type { GoogleFloorMapProps } from "@/components/equipment/GoogleFloorMap";

let mockAvailable = true;
jest.mock("@/utils/googleMapsAvailable", () => ({
  googleMapsAvailable: () => mockAvailable,
}));
jest.mock("expo-router", () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock("react-native-gesture-handler", () => ({
  GestureHandlerRootView: require("react-native").View,
}));
jest.mock("@/components/equipment/AreaPressTarget", () => ({
  __esModule: true,
  default: require("react-native").View,
}));
jest.mock("@/components/equipment/MapViewport", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => {
    const { View, Text } = require("react-native");
    return (
      <View>
        {children}
        <Text>Custom floor</Text>
      </View>
    );
  },
  MapPin: () => null,
}));
jest.mock("@/components/equipment/GoogleFloorMap", () => ({
  __esModule: true,
  default: (p: GoogleFloorMapProps) => {
    const { View, Text, Pressable } = require("react-native");
    return (
      <View>
        <Text testID="provider-floor">{p.floor.name}</Text>
        <Text testID="provider-status">{p.equipment[0]?.status}</Text>
        <Text testID="provider-focus">{p.focus?.key}</Text>
        <Pressable onPress={p.onFallback}>
          <Text>Fallback</Text>
        </Pressable>
      </View>
    );
  },
}));

const machine = {
  id: 1,
  code: "B1",
  name: "Bench",
  exercise: "Bench Press",
  status: "Available",
  floorX: 100,
  floorY: 100,
};
const floor = {
  id: 1,
  name: "Ground",
  width: 800,
  height: 600,
  floorNumber: 0,
  imageUrl: null,
  illustrative: true,
  equipment: [machine],
};
beforeEach(() => {
  mockAvailable = true;
});

it("switches Google floors and forwards selection and live statuses", () => {
  const second = { ...floor, id: 2, floorNumber: 1, name: "Level 2" };
  const { rerender } = render(
    <FloorMap
      enableGoogleMaps
      floors={[floor, second]}
      allMachines={[machine]}
      highlightedEquipmentId={1}
    />,
  );
  expect(screen.getByTestId("provider-floor").props.children).toBe("Ground");
  expect(screen.getByTestId("provider-focus").props.children).toBe("m:1");
  fireEvent.press(screen.getByText("Level 2"));
  expect(screen.getByTestId("provider-floor").props.children).toBe("Level 2");
  rerender(
    <FloorMap
      enableGoogleMaps
      floors={[floor, second]}
      allMachines={[{ ...machine, status: "In Use" }]}
      selectedFloorId={1}
      highlightedEquipmentId={1}
    />,
  );
  expect(screen.getByTestId("provider-floor").props.children).toBe("Ground");
  expect(screen.getByTestId("provider-status").props.children).toBe("In Use");
});

it("uses the custom map when configuration/native provider is missing", () => {
  mockAvailable = false;
  render(
    <FloorMap enableGoogleMaps floors={[floor]} allMachines={[machine]} />,
  );
  expect(screen.getByText("Custom floor")).toBeTruthy();
  expect(screen.queryByTestId("provider-floor")).toBeNull();
});

it("keeps unconfigured real floors in the custom renderer", () => {
  render(
    <FloorMap
      enableGoogleMaps
      floors={[{ ...floor, illustrative: false }]}
      allMachines={[machine]}
    />,
  );
  expect(screen.getByText("Custom floor")).toBeTruthy();
});

it("keeps manual provider fallback active through floor changes", () => {
  render(
    <FloorMap
      enableGoogleMaps
      floors={[floor, { ...floor, id: 2, floorNumber: 1, name: "Level 2" }]}
      allMachines={[machine]}
    />,
  );
  fireEvent.press(screen.getByText("Fallback"));
  expect(screen.getByText("Custom floor")).toBeTruthy();
  fireEvent.press(screen.getByText("Level 2"));
  expect(screen.getByText("Custom floor")).toBeTruthy();
  expect(screen.queryByTestId("provider-floor")).toBeNull();
});
