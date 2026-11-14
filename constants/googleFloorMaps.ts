import type { FloorPlanResponse } from "@/services/machineAPI";
import type { FloorGeography } from "@/utils/floorGeography";
import { validGeography } from "@/utils/floorGeography";

// Google URL @ coordinates are the viewing center, not surveyed roof corners.
export const UREC_MAP_REFERENCE = {
  latitude: 35.3083028,
  longitude: -80.7355263,
};
// Building outline: OpenStreetMap way 1051865705, version 3, retrieved 2026-11-13.
// © OpenStreetMap contributors, ODbL. This is mapped data, not a property survey.
// https://www.openstreetmap.org/way/1051865705
export const UREC_BUILDING_BOUNDARY = [
  { latitude: 35.3083597, longitude: -80.7358842 },
  { latitude: 35.3083607, longitude: -80.7358381 },
  { latitude: 35.3084219, longitude: -80.73584 },
  { latitude: 35.3084233, longitude: -80.7357756 },
  { latitude: 35.3084696, longitude: -80.7357771 },
  { latitude: 35.3084745, longitude: -80.7355408 },
  { latitude: 35.3084814, longitude: -80.7352017 },
  { latitude: 35.3084858, longitude: -80.7349889 },
  { latitude: 35.3084743, longitude: -80.7349886 },
  { latitude: 35.3081495, longitude: -80.7349786 },
  { latitude: 35.3081232, longitude: -80.7349778 },
  { latitude: 35.3081217, longitude: -80.7350519 },
  { latitude: 35.3081153, longitude: -80.7353651 },
  { latitude: 35.3081058, longitude: -80.7358259 },
  { latitude: 35.3081893, longitude: -80.7358285 },
  { latitude: 35.3081883, longitude: -80.735879 },
];
export const UREC_BUILDING_BOUNDS: FloorGeography = {
  southwest: {
    latitude: Math.min(...UREC_BUILDING_BOUNDARY.map((p) => p.latitude)),
    longitude: Math.min(...UREC_BUILDING_BOUNDARY.map((p) => p.longitude)),
  },
  northeast: {
    latitude: Math.max(...UREC_BUILDING_BOUNDARY.map((p) => p.latitude)),
    longitude: Math.max(...UREC_BUILDING_BOUNDARY.map((p) => p.longitude)),
  },
};
export const UREC_DEMO_CENTER = {
  latitude:
    (UREC_BUILDING_BOUNDS.northeast.latitude +
      UREC_BUILDING_BOUNDS.southwest.latitude) /
    2,
  longitude:
    (UREC_BUILDING_BOUNDS.northeast.longitude +
      UREC_BUILDING_BOUNDS.southwest.longitude) /
    2,
};
// Indoor geometry is still fictional; fitting its rectangle to the building's
// envelope is demo placement, not accurate room/equipment calibration.
export const DEMO_FLOOR_GEOGRAPHY: Readonly<Record<number, FloorGeography>> = {
  0: UREC_BUILDING_BOUNDS,
  1: UREC_BUILDING_BOUNDS,
  2: UREC_BUILDING_BOUNDS,
  3: UREC_BUILDING_BOUNDS,
};

export function demoGeography(floor: FloorPlanResponse): FloorGeography | null {
  const bounds = DEMO_FLOOR_GEOGRAPHY[floor.floorNumber];
  return floor.illustrative &&
    floor.id !== 0 &&
    bounds &&
    validGeography(bounds, floor)
    ? bounds
    : null;
}
