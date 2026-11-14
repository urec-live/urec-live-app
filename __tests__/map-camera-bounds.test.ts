import {
  UREC_BUILDING_BOUNDARY,
  UREC_BUILDING_BOUNDS,
  UREC_MAP_REFERENCE,
} from "@/constants/googleFloorMaps";
import {
  buildingCameraRegion,
  constrainMapRegion,
  sameMapRegion,
} from "@/utils/mapCameraBounds";

it("encloses the sourced roof vertices and the supplied map center", () => {
  const { southwest: sw, northeast: ne } = UREC_BUILDING_BOUNDS;
  expect(sw).toEqual({ latitude: 35.3081058, longitude: -80.7358842 });
  expect(ne).toEqual({ latitude: 35.3084858, longitude: -80.7349778 });
  for (const point of [...UREC_BUILDING_BOUNDARY, UREC_MAP_REFERENCE]) {
    expect(point.latitude).toBeGreaterThanOrEqual(sw.latitude);
    expect(point.latitude).toBeLessThanOrEqual(ne.latitude);
    expect(point.longitude).toBeGreaterThanOrEqual(sw.longitude);
    expect(point.longitude).toBeLessThanOrEqual(ne.longitude);
  }
});

it.each([
  [360, 280],
  [360, 640],
])(
  "fits the building with a margin for native viewport %sx%s",
  (width, height) => {
    const view = buildingCameraRegion(UREC_BUILDING_BOUNDS, width, height);
    expect(view.longitudeDelta).toBeGreaterThan(
      UREC_BUILDING_BOUNDS.northeast.longitude -
        UREC_BUILDING_BOUNDS.southwest.longitude,
    );
    expect(view.latitudeDelta).toBeGreaterThan(
      UREC_BUILDING_BOUNDS.northeast.latitude -
        UREC_BUILDING_BOUNDS.southwest.latitude,
    );
    expect(
      view.longitudeDelta /
        (view.latitudeDelta / Math.cos((view.latitude * Math.PI) / 180)),
    ).toBeCloseTo(width / height);
  },
);

it("clamps every viewport edge after a distant pan, zoom-out, or excessive zoom-in", () => {
  const allowed = buildingCameraRegion(UREC_BUILDING_BOUNDS, 360, 280);
  for (const scale of [0.0001, 0.5, 1, 1000]) {
    for (const direction of [-1, 1]) {
      const limited = constrainMapRegion(
        {
          latitude: allowed.latitude + direction,
          longitude: allowed.longitude + direction,
          latitudeDelta: allowed.latitudeDelta * scale,
          longitudeDelta: allowed.longitudeDelta * scale,
        },
        allowed,
      );
      expect(limited.latitudeDelta).toBeGreaterThanOrEqual(
        allowed.latitudeDelta / 16,
      );
      expect(limited.longitudeDelta).toBeGreaterThanOrEqual(
        allowed.longitudeDelta / 16,
      );
      expect(limited.latitude + limited.latitudeDelta / 2).toBeLessThanOrEqual(
        allowed.latitude + allowed.latitudeDelta / 2 + 1e-12,
      );
      expect(
        limited.latitude - limited.latitudeDelta / 2,
      ).toBeGreaterThanOrEqual(
        allowed.latitude - allowed.latitudeDelta / 2 - 1e-12,
      );
      expect(
        limited.longitude + limited.longitudeDelta / 2,
      ).toBeLessThanOrEqual(
        allowed.longitude + allowed.longitudeDelta / 2 + 1e-12,
      );
      expect(
        limited.longitude - limited.longitudeDelta / 2,
      ).toBeGreaterThanOrEqual(
        allowed.longitude - allowed.longitudeDelta / 2 - 1e-12,
      );
      expect(sameMapRegion(limited, constrainMapRegion(limited, allowed))).toBe(
        true,
      );
    }
  }
});

it("returns the fitted site for invalid camera spans", () => {
  const allowed = buildingCameraRegion(UREC_BUILDING_BOUNDS, 360, 280);
  expect(constrainMapRegion({ ...allowed, latitude: NaN }, allowed)).toBe(
    allowed,
  );
  expect(constrainMapRegion({ ...allowed, longitudeDelta: -1 }, allowed)).toBe(
    allowed,
  );
});
