import type { FloorArea, MapPoint } from "@/services/machineAPI";

export interface Coordinate {
  latitude: number;
  longitude: number;
}
export interface FloorGeography {
  southwest: Coordinate;
  northeast: Coordinate;
}
interface FloorSize {
  width: number;
  height: number;
}

export function validGeography(g: FloorGeography, size: FloorSize): boolean {
  const { southwest: sw, northeast: ne } = g;
  return (
    [
      sw.latitude,
      sw.longitude,
      ne.latitude,
      ne.longitude,
      size.width,
      size.height,
    ].every(Number.isFinite) &&
    size.width > 0 &&
    size.height > 0 &&
    sw.latitude >= -85 &&
    ne.latitude <= 85 &&
    sw.longitude >= -180 &&
    ne.longitude <= 180 &&
    sw.latitude < ne.latitude &&
    sw.longitude < ne.longitude
  );
}

// Interpolate in Web Mercator so image overlays, polygons and pins share the
// same geometry. Pixel Y runs down; north is at Y=0.
const mercatorY = (latitude: number) =>
  Math.log(Math.tan(Math.PI / 4 + (latitude * Math.PI) / 360));
export function floorCoordinate(
  point: MapPoint,
  size: FloorSize,
  g: FloorGeography,
): Coordinate {
  if (
    !validGeography(g, size) ||
    !Number.isFinite(point.x) ||
    !Number.isFinite(point.y)
  ) {
    throw new Error("Invalid floor geography or point");
  }
  const north = mercatorY(g.northeast.latitude);
  const south = mercatorY(g.southwest.latitude);
  const y = north + ((south - north) * point.y) / size.height;
  return {
    latitude: ((2 * Math.atan(Math.exp(y)) - Math.PI / 2) * 180) / Math.PI,
    longitude:
      g.southwest.longitude +
      ((g.northeast.longitude - g.southwest.longitude) * point.x) / size.width,
  };
}

export function areaPoints(area: FloorArea): MapPoint[] {
  if (area.shape === "polygon") return area.points ?? [];
  const { x = 0, y = 0, width = 0, height = 0 } = area;
  return [
    { x, y },
    { x: x + width, y },
    { x: x + width, y: y + height },
    { x, y: y + height },
  ];
}
