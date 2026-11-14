import {
  areaPoints,
  floorCoordinate,
  validGeography,
} from "@/utils/floorGeography";
import { demoGeography } from "@/constants/googleFloorMaps";
import type { FloorPlanResponse } from "@/services/machineAPI";

const size = { width: 800, height: 600 };
const bounds = {
  southwest: { latitude: 35, longitude: -81 },
  northeast: { latitude: 36, longitude: -80 },
};

it("maps pixel corners with Y increasing south and interpolates the center in Mercator", () => {
  const nw = floorCoordinate({ x: 0, y: 0 }, size, bounds);
  const se = floorCoordinate({ x: 800, y: 600 }, size, bounds);
  expect(nw.latitude).toBeCloseTo(36, 10);
  expect(nw.longitude).toBe(-81);
  expect(se.latitude).toBeCloseTo(35, 10);
  expect(se.longitude).toBe(-80);
  const center = floorCoordinate({ x: 400, y: 300 }, size, bounds);
  expect(center.longitude).toBe(-80.5);
  expect(center.latitude).toBeCloseTo(35.50156, 4);
  expect(floorCoordinate({ x: 0, y: 450 }, size, bounds).latitude).toBeLessThan(
    center.latitude,
  );
});

it.each([
  [{ ...size, width: 0 }, bounds],
  [{ ...size, height: NaN }, bounds],
  [size, { ...bounds, southwest: bounds.northeast }],
  [size, { ...bounds, northeast: { latitude: 91, longitude: -80 } }],
  [size, { ...bounds, northeast: { latitude: 36, longitude: Infinity } }],
])("rejects invalid dimensions or bounds", (dimensions, geography) => {
  expect(validGeography(geography, dimensions)).toBe(false);
  expect(() =>
    floorCoordinate({ x: 0, y: 0 }, dimensions, geography),
  ).toThrow();
});

it("does not geographically place real or unconfigured floors", () => {
  const floor = {
    ...size,
    id: 1,
    illustrative: true,
    floorNumber: 0,
  } as FloorPlanResponse;
  for (const floorNumber of [0, 1, 2, 3])
    expect(demoGeography({ ...floor, floorNumber })).not.toBeNull();
  expect(demoGeography({ ...floor, illustrative: false })).toBeNull();
  expect(demoGeography({ ...floor, floorNumber: 99 })).toBeNull();
  expect(demoGeography({ ...floor, width: 0 })).toBeNull();
  expect(demoGeography({ ...floor, id: 0 })).toBeNull();
});

it("converts rectangle corners and preserves polygon vertices for the same transform", () => {
  const area = {
    id: "room",
    name: "Room",
    kind: "room" as const,
    shape: "rect" as const,
    x: 10,
    y: 20,
    width: 30,
    height: 40,
  };
  expect(areaPoints(area)).toEqual([
    { x: 10, y: 20 },
    { x: 40, y: 20 },
    { x: 40, y: 60 },
    { x: 10, y: 60 },
  ]);
  const vertices = [
    { x: 1, y: 2 },
    { x: 3, y: 4 },
    { x: 5, y: 6 },
  ];
  expect(areaPoints({ ...area, shape: "polygon", points: vertices })).toBe(
    vertices,
  );
});
