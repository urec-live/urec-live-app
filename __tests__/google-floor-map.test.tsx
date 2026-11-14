/* eslint-disable @typescript-eslint/no-require-imports -- Jest hoists native mock factories. */
import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react-native";
import GoogleFloorMap, {
  type GoogleFloorMapProps,
} from "@/components/equipment/GoogleFloorMap";
import { floorCoordinate } from "@/utils/floorGeography";
import {
  buildingCameraRegion,
  constrainMapRegion,
} from "@/utils/mapCameraBounds";
import { UREC_BUILDING_BOUNDARY } from "@/constants/googleFloorMaps";

const mockFit = jest.fn();
const mockAnimate = jest.fn();
const mockSetBoundaries = jest.fn();
jest.mock("react-native-maps", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    __esModule: true,
    default: React.forwardRef(function MockMap(props: any, ref: any) {
      React.useImperativeHandle(ref, () => ({
        fitToCoordinates: mockFit,
        animateToRegion: mockAnimate,
        setMapBoundaries: mockSetBoundaries,
      }));
      return <View {...props} />;
    }),
    Marker: (props: any) => <View {...props} />,
    Polygon: (props: any) => <View {...props} />,
    Overlay: (props: any) => <View testID="ground-overlay" {...props} />,
    PROVIDER_GOOGLE: "google",
  };
});

const machine = {
  id: 1,
  code: "B1",
  name: "Bench",
  exercise: "Bench Press",
  status: "Available",
  floorX: 100,
  floorY: 100,
};
const room = {
  id: "weights",
  name: "Weights",
  kind: "strength" as const,
  shape: "rect" as const,
  x: 0,
  y: 0,
  width: 300,
  height: 300,
};
const floor = {
  id: 1,
  name: "Ground",
  width: 800,
  height: 600,
  floorNumber: 0,
  imageUrl: "https://example.test/floor.png",
  illustrative: true,
  layout: { version: 1 as const, areas: [room] },
  equipment: [machine],
};
const geography = {
  southwest: { latitude: 35, longitude: -81 },
  northeast: { latitude: 35.001, longitude: -80.999 },
};
let props: GoogleFloorMapProps;
beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  props = {
    floor,
    equipment: [machine],
    geography,
    focus: null,
    options: {
      floors: [floor],
      allMachines: [machine],
      onSelectArea: jest.fn(),
    },
    onSelectEquipment: jest.fn(),
    onFallback: jest.fn(),
  };
});
afterEach(() => {
  jest.clearAllTimers();
  jest.useRealTimers();
});

it("uses Google with one coordinate system for overlays, polygons and pins, and forwards selections", () => {
  render(<GoogleFloorMap {...props} />);
  const map = screen.getByTestId("google-floor-map");
  expect(map.props.provider).toBe("google");
  expect(map.props.showsIndoorLevelPicker).toBe(false);
  expect(map.props.rotateEnabled).toBe(false);
  expect(map.props.pitchEnabled).toBe(false);
  expect(map.props.showsUserLocation).toBe(false);
  expect(
    screen.getByTestId("urec-building-boundary").props.coordinates,
  ).toEqual(UREC_BUILDING_BOUNDARY);
  expect(screen.getByTestId("urec-building-boundary").props.tappable).toBe(
    false,
  );
  expect(screen.getByTestId("ground-overlay").props.bounds).toEqual([
    [35, -81],
    [35.001, -80.999],
  ]);
  const pin = screen.getByTestId("google-equipment-1");
  expect(pin.props.coordinate).toEqual(
    floorCoordinate({ x: 100, y: 100 }, floor, geography),
  );
  const polygon = screen.getByTestId("google-area-weights");
  expect(polygon.props.coordinates[0]).toEqual(
    floorCoordinate({ x: 0, y: 0 }, floor, geography),
  );
  fireEvent.press(pin);
  expect(props.onSelectEquipment).toHaveBeenCalledWith(machine);
  fireEvent.press(polygon);
  expect(props.options.onSelectArea).toHaveBeenCalledWith(room, floor);
  expect(screen.getByText("Demo floor placement · approximate")).toBeTruthy();
});

it("focuses selected results after map readiness and connects Fit and zoom to the camera", () => {
  render(<GoogleFloorMap {...props} focus={{ x: 100, y: 100, key: "m:1" }} />);
  expect(mockAnimate).not.toHaveBeenCalled();
  fireEvent(screen.getByTestId("google-floor-map"), "mapReady");
  expect(mockAnimate).toHaveBeenCalledWith(
    expect.objectContaining(
      floorCoordinate({ x: 100, y: 100 }, floor, geography),
    ),
    300,
  );
  fireEvent.press(screen.getByLabelText("Fit floor"));
  const allowed = buildingCameraRegion(geography, 300, 300);
  expect(mockAnimate).toHaveBeenLastCalledWith(allowed, 200);
  expect(mockSetBoundaries).toHaveBeenCalledWith(
    {
      latitude: allowed.latitude + allowed.latitudeDelta / 2,
      longitude: allowed.longitude + allowed.longitudeDelta / 2,
    },
    {
      latitude: allowed.latitude - allowed.latitudeDelta / 2,
      longitude: allowed.longitude - allowed.longitudeDelta / 2,
    },
  );
  const closeup = {
    ...allowed,
    latitudeDelta: allowed.latitudeDelta / 2,
    longitudeDelta: allowed.longitudeDelta / 2,
  };
  fireEvent(screen.getByTestId("google-floor-map"), "regionChangeComplete", {
    ...closeup,
  });
  fireEvent.press(screen.getByLabelText("Zoom in"));
  expect(mockAnimate).toHaveBeenLastCalledWith(
    expect.objectContaining({
      latitudeDelta: closeup.latitudeDelta * 0.8,
      longitudeDelta: closeup.longitudeDelta * 0.8,
    }),
    200,
  );
});

it("corrects gestures outside the site and limits repeated zoom-out controls", () => {
  render(<GoogleFloorMap {...props} />);
  fireEvent(screen.getByTestId("google-floor-map"), "mapReady");
  const allowed = buildingCameraRegion(geography, 300, 300);
  const outside = {
    latitude: 40,
    longitude: -75,
    latitudeDelta: 1,
    longitudeDelta: 1,
  };
  fireEvent(
    screen.getByTestId("google-floor-map"),
    "regionChangeComplete",
    outside,
  );
  expect(mockAnimate).toHaveBeenLastCalledWith(
    constrainMapRegion(outside, allowed),
    0,
  );
  mockAnimate.mockClear();
  fireEvent(
    screen.getByTestId("google-floor-map"),
    "regionChangeComplete",
    allowed,
  );
  expect(mockAnimate).not.toHaveBeenCalled();
  for (let i = 0; i < 5; i++)
    fireEvent.press(screen.getByLabelText("Zoom out"));
  expect(mockAnimate).toHaveBeenLastCalledWith(allowed, 200);
});

it("updates status and filter highlighting without refocusing the camera on live updates", () => {
  const { rerender } = render(<GoogleFloorMap {...props} />);
  fireEvent(screen.getByTestId("google-floor-map"), "mapReady");
  mockFit.mockClear();
  mockAnimate.mockClear();
  rerender(
    <GoogleFloorMap
      {...props}
      equipment={[{ ...machine, status: "In Use" }]}
      options={{ ...props.options, matchingEquipmentIds: new Set() }}
    />,
  );
  const pin = screen.getByTestId("google-equipment-1");
  expect(pin.props.description).toBe("In Use");
  expect(pin.props.opacity).toBe(0.22);
  expect(pin.props.children.props.children.props.style).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ backgroundColor: "#FF5722" }),
    ]),
  );
  expect(mockFit).not.toHaveBeenCalled();
  expect(mockAnimate).not.toHaveBeenCalled();
});

it("offers manual fallback and falls back if the provider never becomes ready", () => {
  render(<GoogleFloorMap {...props} />);
  fireEvent.press(screen.getByText("Use floor map"));
  expect(props.onFallback).toHaveBeenCalledTimes(1);
  act(() => jest.advanceTimersByTime(15000));
  expect(props.onFallback).toHaveBeenCalledTimes(2);
});

it("cancels the provider timeout once ready", () => {
  render(<GoogleFloorMap {...props} />);
  fireEvent(screen.getByTestId("google-floor-map"), "mapReady");
  act(() => jest.advanceTimersByTime(16000));
  expect(props.onFallback).not.toHaveBeenCalled();
});
