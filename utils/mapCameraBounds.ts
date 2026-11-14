import type { Coordinate, FloorGeography } from "./floorGeography";

export interface BoundedRegion extends Coordinate {
  latitudeDelta: number;
  longitudeDelta: number;
}

// Allow a small border around the roof, extending the shorter dimension to fit
// the actual native viewport. Tall phones need more north/south context to show
// the entire building; zooming out never exposes an unrestricted campus map.
export function buildingCameraRegion(
  bounds: FloorGeography,
  width: number,
  height: number,
): BoundedRegion {
  const latitude = (bounds.northeast.latitude + bounds.southwest.latitude) / 2;
  const longitude =
    (bounds.northeast.longitude + bounds.southwest.longitude) / 2;
  const aspect = width > 0 && height > 0 ? width / height : 1;
  const cosine = Math.cos((latitude * Math.PI) / 180);
  const latitudeDelta =
    (bounds.northeast.latitude - bounds.southwest.latitude) * 1.24;
  const longitudeDelta =
    (bounds.northeast.longitude - bounds.southwest.longitude) * 1.24;
  return {
    latitude,
    longitude,
    latitudeDelta: Math.max(latitudeDelta, (longitudeDelta * cosine) / aspect),
    longitudeDelta: Math.max(longitudeDelta, (latitudeDelta * aspect) / cosine),
  };
}

const clamp = (value: number, low: number, high: number) =>
  Math.max(low, Math.min(high, value));
export function constrainMapRegion(
  next: BoundedRegion,
  allowed: BoundedRegion,
): BoundedRegion {
  if (
    !Object.values(next).every(Number.isFinite) ||
    next.latitudeDelta <= 0 ||
    next.longitudeDelta <= 0
  )
    return allowed;
  // Preserve aspect ratio and cap the zoom range to a 16x close-up of the site.
  const scale = Math.min(
    1,
    allowed.latitudeDelta / next.latitudeDelta,
    allowed.longitudeDelta / next.longitudeDelta,
  );
  const latitudeDelta = clamp(
    next.latitudeDelta * scale,
    allowed.latitudeDelta / 16,
    allowed.latitudeDelta,
  );
  const longitudeDelta = clamp(
    next.longitudeDelta * scale,
    allowed.longitudeDelta / 16,
    allowed.longitudeDelta,
  );
  return {
    latitude: clamp(
      next.latitude,
      allowed.latitude - (allowed.latitudeDelta - latitudeDelta) / 2,
      allowed.latitude + (allowed.latitudeDelta - latitudeDelta) / 2,
    ),
    longitude: clamp(
      next.longitude,
      allowed.longitude - (allowed.longitudeDelta - longitudeDelta) / 2,
      allowed.longitude + (allowed.longitudeDelta - longitudeDelta) / 2,
    ),
    latitudeDelta,
    longitudeDelta,
  };
}

export function sameMapRegion(a: BoundedRegion, b: BoundedRegion): boolean {
  return (Object.keys(a) as (keyof BoundedRegion)[]).every(
    (key) => Math.abs(a[key] - b[key]) < 0.0000001,
  );
}
