import {
  FITNESS_ZONES,
  INDOOR_FLOORS,
  INDOOR_GEOJSON,
  INDOOR_WALLS,
  toLngLat,
  WALL_M,
  wallQuads,
} from "@/constants/indoorVenue";
import type { MachineDto } from "@/services/machineAPI";
import { footprint, placeEquipment } from "@/utils/indoorPlacement";

const props = INDOOR_GEOJSON.features.map((f) => f.properties!);
const ring = (id: string) =>
  (
    INDOOR_GEOJSON.features.find((f) => f.properties!.id === id)!
      .geometry as GeoJSON.Polygon
  ).coordinates[0];
// Ray casting; fine for the simple rings in the venue.
const inside = ([x, y]: number[], r: number[][]) =>
  r.reduce(
    (inn, [xi, yi], i) => {
      const [xj, yj] = r[(i + r.length - 1) % r.length];
      return yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi
        ? !inn
        : inn;
    },
    false,
  );
const corners = (z: (typeof FITNESS_ZONES)[number]) => [
  [z.x, z.y],
  [z.x + z.width, z.y],
  [z.x, z.y + z.height],
  [z.x + z.width, z.y + z.height],
] as [number, number][];
const machine = (id: number, group?: string): MachineDto => ({
  id,
  code: `M${id}`,
  name: `Machine ${String(id).padStart(3, "0")}`,
  status: "Available",
  exercise: "",
  muscleGroups: group ? [group] : undefined,
});
const machines = (n: number) =>
  Array.from({ length: n }, (_, i) =>
    machine(i + 1, ["Legs", "Chest", undefined, "Back"][i % 4]),
  );

describe("Level 1 venue data (Mapbox indoor schema)", () => {
  it("has unique ids and every room on a known floor", () => {
    const ids = props.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    const floors = new Set(INDOOR_FLOORS.map((f) => f.id));
    const rooms = props.filter((p) => p.type === "room");
    expect(rooms.length).toBeGreaterThan(0);
    rooms.forEach((r) => expect(floors).toContain(r.floor_id));
    expect(props.filter((p) => p.type === "floor").map((p) => p.id)).toEqual([
      ...floors,
    ]);
  });
  it("keeps the fitness zones inside the Fitness rooms and the building", () => {
    const [north, south] = FITNESS_ZONES.map((z) => corners(z).map(toLngLat));
    north.forEach((p) => expect(inside(p, ring("l1-fitness-north"))).toBe(true));
    south.forEach((p) => expect(inside(p, ring("l1-fitness-south"))).toBe(true));
    [...north, ...south].forEach((p) =>
      expect(inside(p, ring("urec-main"))).toBe(true),
    );
    // Nothing is placed on the stairs or the partition.
    for (const id of ["l1-stairs-centre", "l1-partition"])
      ring(id).forEach((p) =>
        [north, south].forEach((z) =>
          expect(inside(p, [z[0], z[1], z[3], z[2]])).toBe(false),
        ),
      );
  });
});

describe("placeEquipment", () => {
  const inZone = ([x, y]: number[]) =>
    FITNESS_ZONES.some(
      (z) => x > z.x && x < z.x + z.width && y > z.y && y < z.y + z.height,
    );
  it.each([0, 1, 95, 160])("fits %i machines in the zones, spaced apart", (n) => {
    const placed = placeEquipment(machines(n));
    expect(placed).toHaveLength(n);
    placed.forEach((p) => expect(inZone(p.at)).toBe(true));
    let min = Infinity;
    placed.forEach((a, i) =>
      placed.slice(i + 1).forEach((b) => {
        min = Math.min(min, Math.hypot(a.at[0] - b.at[0], a.at[1] - b.at[1]));
      }),
    );
    if (n > 1) expect(min).toBeGreaterThan(1.5); // metres
  });
  it("groups by muscle group (ungrouped last), then name, deterministically", () => {
    const input = machines(12);
    const order = placeEquipment(input).map((p) => p.machine.muscleGroups?.[0]);
    expect(order).toEqual([
      ...Array(3).fill("Back"),
      ...Array(3).fill("Chest"),
      ...Array(3).fill("Legs"),
      ...Array(3).fill(undefined),
    ]);
    expect(placeEquipment([...input].reverse())).toEqual(placeEquipment(input));
  });
});

describe("3D walls", () => {
  const centre = (q: number[][]) =>
    [0, 1].map((k) => q.reduce((sum, p) => sum + p[k], 0) / q.length);
  const area = (q: number[][]) =>
    Math.abs(
      q.reduce((sum, [x0, y0], i) => {
        const [x1, y1] = q[(i + 1) % q.length];
        return sum + x0 * y1 - x1 * y0;
      }, 0) / 2,
    );
  const key = (quads: number[][][]) =>
    quads.map((q) => q.map((p) => p.map((v) => v.toFixed(6)).join(",")).sort().join(" ")).sort();
  const square: [number, number][] = [[0, 0], [4, 0], [4, 4], [0, 4]];

  it("puts one wall-thick quad inside each edge, for either winding", () => {
    const quads = wallQuads(square);
    expect(quads).toHaveLength(4);
    quads.forEach((q) => {
      expect(inside(centre(q), square)).toBe(true);
      const edge = Math.hypot(q[1][0] - q[0][0], q[1][1] - q[0][1]);
      expect(area(q) / edge).toBeCloseTo(WALL_M);
    });
    expect(key(wallQuads([...square].reverse()))).toEqual(key(quads));
  });

  const walls = INDOOR_WALLS.features.map((f) => ({
    id: f.properties!.id as string,
    floor: f.properties!.floor_id,
    ring: (f.geometry as GeoJSON.Polygon).coordinates[0].slice(0, -1),
  }));
  it("has unique ids on known floors and includes the partition", () => {
    const ids = walls.map((w) => w.id);
    expect(new Set(ids).size).toBe(ids.length);
    const floors = new Set(INDOOR_FLOORS.map((f) => f.id));
    walls.forEach((w) => expect(floors).toContain(w.floor));
    expect(ids).toContain("l1-partition");
  });
  it("keeps every wall inside its own room or the outline (concave rings too)", () => {
    const edges = walls.filter((w) => /-wall-\d+$/.test(w.id));
    expect(edges.length).toBeGreaterThan(0);
    edges.forEach((w) =>
      expect(inside(centre(w.ring), ring(w.id.replace(/-wall-\d+$/, "")))).toBe(true),
    );
  });
  it("leaves the open floor between the two Fitness rooms free of walls", () => {
    const zones = FITNESS_ZONES.map((z) => {
      const [a, b, c, d] = corners(z).map(toLngLat);
      return [a, b, d, c];
    });
    walls.forEach((w) =>
      w.ring.forEach((p) => zones.forEach((z) => expect(inside(p, z)).toBe(false))),
    );
  });
});

describe("footprint", () => {
  it("is a box of the given size centred on the point", () => {
    expect(footprint([10, 20])).toEqual([[9.5, 19.5], [10.5, 19.5], [10.5, 20.5], [9.5, 20.5]]);
    expect(footprint([0, 0], 2)[2]).toEqual([1, 1]);
  });
  it("never overlaps another machine's box, even with 160 machines", () => {
    const boxes = placeEquipment(machines(160)).map((p) => footprint(p.at));
    let overlaps = 0;
    boxes.forEach((a, i) =>
      boxes.slice(i + 1).forEach((b) => {
        const apart =
          a[1][0] <= b[0][0] || b[1][0] <= a[0][0] || a[2][1] <= b[0][1] || b[2][1] <= a[0][1];
        if (!apart) overlaps++;
      }),
    );
    expect(overlaps).toBe(0);
  });
});
