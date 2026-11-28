// Level 1 of the UREC building in Mapbox's custom indoor schema (facility > structure > floor > room,
// https://docs.mapbox.com/help/dive-deeper/indoor-mapping/), so the same data can later feed
// `is-active-floor` or an uploaded tileset.
// shortcut: traced by hand from the Level 1 wayfinding sign (0.1 m per sign pixel, north assumed up),
// not surveyed; replace with CAD/IMDF floor data when the gym provides it.
type Pt = [number, number]; // metres east / south of the plan's north-west corner

const PLAN_SIZE: Pt = [82.8, 33.1];
// Centre of the building outline in OpenStreetMap way 1051865705 (v3, retrieved 2026-11-13).
// © OpenStreetMap contributors, ODbL. https://www.openstreetmap.org/way/1051865705
const CENTER = { lng: -80.735431, lat: 35.3082958 };
const M_PER_DEG_LAT = 110574;
const M_PER_DEG_LNG = 111320 * Math.cos((CENTER.lat * Math.PI) / 180);

// Equirectangular: exact enough over one building.
export const toLngLat = ([x, y]: Pt): Pt => [
  CENTER.lng + (x - PLAN_SIZE[0] / 2) / M_PER_DEG_LNG,
  CENTER.lat - (y - PLAN_SIZE[1] / 2) / M_PER_DEG_LAT,
];

const rect = (x0: number, y0: number, x1: number, y1: number): Pt[] => [
  [x0, y0],
  [x1, y0],
  [x1, y1],
  [x0, y1],
];

const OUTLINE: Pt[] = [
  [3.6, 1.2], [8.1, 1.2], [8.1, 0], [68.6, 0], [76.6, 3.3], [82.8, 4.4],
  [79.3, 33.1], [71.6, 30.5], [68.3, 31.3], [68.3, 32.8], [4.1, 32.8],
  [4.1, 31.5], [0, 31.5], [0, 10.8], [3.6, 10.8],
];

// `class` reuses the floor map's area kinds so both maps share one palette (areaColors).
const ROOMS: { id: string; name: string; class: string; ring: Pt[] }[] = [
  { id: "l1-fitness-north", name: "Fitness", class: "strength", ring: [[46.6, 0], [68.6, 0], [76.6, 3.3], [74.2, 16.3], [46.6, 16.3]] },
  { id: "l1-fitness-south", name: "Fitness", class: "strength", ring: [[46.6, 16.3], [74.2, 16.3], [71.6, 30.5], [68.3, 31.3], [68.3, 32.8], [46.6, 32.8]] },
  { id: "l1-pool", name: "Pool", class: "pool", ring: [[4, 13.2], [32.8, 13.2], [32.8, 28.5], [31.6, 29.7], [10.6, 29.7], [7.6, 28.5], [7.6, 21], [4, 21]] },
  { id: "l1-lockers-north", name: "Lockers", class: "amenity", ring: [[36.1, 4.5], [46.6, 4.5], [46.6, 13.8], [44.8, 13.8], [44.8, 15.3], [41.1, 15.3], [41.1, 14.3], [36.1, 14.3]] },
  { id: "l1-restroom-north", name: "Restroom", class: "amenity", ring: rect(37.5, 11.5, 41.1, 14) },
  { id: "l1-lockers-south", name: "Lockers", class: "amenity", ring: [[36.1, 19], [41.1, 19], [41.1, 18], [44.8, 18], [44.8, 19.3], [46.4, 19.3], [46.4, 28.5], [36.1, 28.5]] },
  { id: "l1-restroom-south", name: "Restroom", class: "amenity", ring: rect(37.5, 19, 41.1, 21.8) },
  { id: "l1-wet-classroom", name: "Wet classroom", class: "studio", ring: rect(36.1, 28.5, 46.4, 32.4) },
  { id: "l1-stairs-centre", name: "Stairs", class: "stairs", ring: rect(50.6, 14.8, 59.3, 17.3) },
  { id: "l1-stairs-west", name: "Stairs", class: "stairs", ring: rect(8.1, 0.3, 15.8, 3.1) },
  { id: "l1-stairs-east", name: "Stairs", class: "stairs", ring: [[73.2, 21.9], [80.4, 24.2], [80, 27.4], [72.6, 24.9]] },
  { id: "l1-elevator", name: "Elevator", class: "elevator", ring: [[75.5, 9.2], [82, 10.7], [81.5, 15], [74.8, 13.3]] },
  { id: "l1-partition", name: "", class: "wall", ring: rect(67.6, 4.5, 69, 14.3) },
  { id: "l1-room-1", name: "", class: "room", ring: rect(3.6, 1.3, 8.1, 4.3) },
  { id: "l1-room-2", name: "", class: "room", ring: rect(9.3, 7.5, 15.1, 10.3) },
  { id: "l1-room-3", name: "", class: "room", ring: rect(15.8, 2.5, 23.6, 10.3) },
  { id: "l1-room-4", name: "", class: "room", ring: rect(23.6, 2.5, 31.3, 10.3) },
  { id: "l1-room-5", name: "", class: "room", ring: rect(31.3, 2.5, 34.3, 6) },
  { id: "l1-room-6", name: "", class: "room", ring: rect(36.3, 2.5, 46.6, 4.5) },
];

// Open floor inside the two Fitness rooms, clear of the central stairs and the partition.
export const FITNESS_ZONES = [
  { x: 47.8, y: 1.2, width: 18.6, height: 12.6 },
  { x: 47.8, y: 18.5, width: 21.7, height: 11.5 },
];
export type Zone = (typeof FITNESS_ZONES)[number];

export const LEVEL_1 = { id: "l1", name: "Level 1" };
export const INDOOR_FLOORS = [LEVEL_1];

export const polygon = (ring: Pt[]): GeoJSON.Polygon => ({
  type: "Polygon",
  coordinates: [[...ring, ring[0]].map(toLngLat)],
});
const [centerLon, centerLat] = toLngLat([PLAN_SIZE[0] / 2, PLAN_SIZE[1] / 2]);
const feature = (ring: Pt[], properties: GeoJSON.GeoJsonProperties) =>
  ({ type: "Feature", geometry: polygon(ring), properties }) as const;

export const INDOOR_GEOJSON: GeoJSON.FeatureCollection = {
  type: "FeatureCollection",
  features: [
    feature(OUTLINE, { type: "facility", id: "urec", name: "UREC" }),
    feature(OUTLINE, {
      type: "structure",
      id: "urec-main",
      name: "UREC",
      facility_id: "urec",
      center_lon: centerLon,
      center_lat: centerLat,
    }),
    feature(OUTLINE, {
      type: "floor",
      id: LEVEL_1.id,
      name: LEVEL_1.name,
      structure_ids: "urec-main",
      z_index: 0,
      conflicted_floor_ids: "",
      is_default: true,
    }),
    ...ROOMS.map(({ ring, ...room }) =>
      feature(ring, { type: "room", floor_id: LEVEL_1.id, ...room }),
    ),
  ],
};

export const WALL_M = 0.2; // wall thickness
export const WALL_H = 2.5; // wall height; lower it if walls hide too many machines

/** One quad per edge, offset inward so rooms sharing an edge get side-by-side walls, not z-fighting. */
export function wallQuads(ring: Pt[], t = WALL_M): Pt[][] {
  const area2 = ring.reduce((sum, [x0, y0], i) => {
    const [x1, y1] = ring[(i + 1) % ring.length];
    return sum + x0 * y1 - x1 * y0;
  }, 0);
  return ring.map(([x0, y0], i) => {
    const [x1, y1] = ring[(i + 1) % ring.length];
    const k = (Math.sign(area2) * t) / Math.hypot(x1 - x0, y1 - y0);
    // (-dy, dx) is the left normal, which points inside when the signed area is positive.
    const [nx, ny] = [-(y1 - y0) * k, (x1 - x0) * k];
    return [[x0, y0], [x1, y1], [x1 + nx, y1 + ny], [x0 + nx, y0 + ny]];
  });
}

const wall = (ring: Pt[], id: string) => feature(ring, { id, floor_id: LEVEL_1.id });
// The Fitness rooms are open floor, so the line between them gets no wall; the partition stands as drawn.
export const INDOOR_WALLS: GeoJSON.FeatureCollection = {
  type: "FeatureCollection",
  features: [
    ...wallQuads(OUTLINE).map((q, i) => wall(q, `urec-main-wall-${i}`)),
    ...ROOMS.filter((r) => r.class !== "strength").flatMap((r) =>
      r.class === "wall"
        ? [wall(r.ring, r.id)]
        : wallQuads(r.ring).map((q, i) => wall(q, `${r.id}-wall-${i}`)),
    ),
  ],
};

export const VENUE_BOUNDS = {
  sw: toLngLat([0, PLAN_SIZE[1]]),
  ne: toLngLat([PLAN_SIZE[0], 0]),
};
