import type {
  FloorArea,
  FloorPlanResponse,
  MachineDto,
  MapPoint,
} from "@/services/machineAPI";

export const areaColors: Record<string, string> = {
  pool: "#D9EEF7",
  court: "#F1E4CC",
  track: "#DEE8E1",
  turf: "#D5E9C9",
  strength: "#EDF1EF",
  cardio: "#E9EFF6",
  studio: "#F1ECF7",
  room: "#F2F3F4",
  amenity: "#EEF0F2",
  stairs: "#DBE1E5",
  elevator: "#DBE1E5",
  entrance: "#E5F1E9",
  void: "#F9FAFB",
};
export function areaBounds(a: FloorArea) {
  if (a.shape === "rect")
    return {
      x: a.x ?? 0,
      y: a.y ?? 0,
      width: a.width ?? 0,
      height: a.height ?? 0,
    };
  const pts = a.points ?? [];
  if (!pts.length) return { x: 0, y: 0, width: 0, height: 0 };
  const x = Math.min(...pts.map((p) => p.x)),
    y = Math.min(...pts.map((p) => p.y));
  return {
    x,
    y,
    width: Math.max(...pts.map((p) => p.x)) - x,
    height: Math.max(...pts.map((p) => p.y)) - y,
  };
}
export function areaContains(a: FloorArea, p: MapPoint): boolean {
  const b = areaBounds(a);
  if (p.x < b.x || p.x > b.x + b.width || p.y < b.y || p.y > b.y + b.height)
    return false;
  if (a.shape === "rect") return true;
  let inside = false;
  const pts = a.points ?? [];
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    if (
      pts[i].y > p.y !== pts[j].y > p.y &&
      p.x <
        ((pts[j].x - pts[i].x) * (p.y - pts[i].y)) / (pts[j].y - pts[i].y) +
          pts[i].x
    )
      inside = !inside;
  }
  return inside;
}
export function areaOf(m: MachineDto, floor?: FloorPlanResponse) {
  if (m.floorX == null || m.floorY == null) return undefined;
  // Small rooms override a larger containing zone (e.g. the void inside the track).
  return [...(floor?.layout?.areas ?? [])]
    .reverse()
    .find((a) => areaContains(a, { x: m.floorX!, y: m.floorY! }));
}
export function isPositioned(m: MachineDto, floor?: FloorPlanResponse) {
  return (
    !!floor &&
    floor.id !== 0 &&
    Number.isFinite(m.floorX) &&
    Number.isFinite(m.floorY) &&
    m.floorX! >= 0 &&
    m.floorY! >= 0 &&
    m.floorX! <= floor.width &&
    m.floorY! <= floor.height
  );
}
export const tokensMatch = (query: string, text: string) =>
  query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((t) => text.toLowerCase().includes(t));
export interface MapFilters {
  query: string;
  muscle: string;
  status: string;
  area: string;
}
export type MapResult = {
  key: string;
  name: string;
  floor?: FloorPlanResponse;
  machine?: MachineDto;
  area?: FloorArea;
};
export function searchEquipment(
  machines: MachineDto[],
  floors: FloorPlanResponse[],
  filters: MapFilters,
): MapResult[] {
  const byId = new Map(
    floors
      .filter((f) => f.id !== 0)
      .flatMap((f) => f.equipment.map((m) => [m.id, f] as const)),
  );
  const results: MapResult[] = [];
  for (const m of machines) {
    const floor = byId.get(m.id),
      area = areaOf(m, floor);
    const names = m.exerciseNames ?? [m.exercise];
    if (
      filters.muscle &&
      !m.muscleGroups?.some(
        (g) => g.toLowerCase() === filters.muscle.toLowerCase(),
      )
    )
      continue;
    if (
      filters.status &&
      m.status.toLowerCase() !== filters.status.toLowerCase()
    )
      continue;
    if (filters.area && `${floor?.id}:${area?.id}` !== filters.area) continue;
    if (
      !tokensMatch(
        filters.query,
        [m.name, ...names, ...(m.muscleGroups ?? []), area?.name ?? ""].join(
          " ",
        ),
      )
    )
      continue;
    results.push({
      key: `machine:${m.id}`,
      name: m.name,
      floor,
      machine: m,
      area,
    });
  }
  if (!filters.muscle && !filters.status)
    for (const floor of floors.filter((f) => f.id !== 0)) {
      for (const area of floor.layout?.areas ?? []) {
        if (
          area.kind === "void" ||
          (filters.area && `${floor.id}:${area.id}` !== filters.area)
        )
          continue;
        if (tokensMatch(filters.query, `${area.name} ${area.kind}`))
          results.push({
            key: `area:${floor.id}:${area.id}`,
            name: area.name,
            floor,
            area,
          });
      }
    }
  return results;
}
export interface Camera {
  x: number;
  y: number;
  scale: number;
}
export function fitCamera(
  w: number,
  h: number,
  vw: number,
  vh: number,
): Camera {
  "worklet";
  const scale = Math.min(Math.max(1, vw - 32) / w, Math.max(1, vh - 32) / h);
  return { scale, x: (vw - w * scale) / 2, y: (vh - h * scale) / 2 };
}
export function clampCamera(
  c: Camera,
  w: number,
  h: number,
  vw: number,
  vh: number,
): Camera {
  "worklet";
  return {
    ...c,
    x:
      w * c.scale <= vw
        ? (vw - w * c.scale) / 2
        : Math.max(vw - w * c.scale - 24, Math.min(24, c.x)),
    y:
      h * c.scale <= vh
        ? (vh - h * c.scale) / 2
        : Math.max(vh - h * c.scale - 24, Math.min(24, c.y)),
  };
}
export function zoomCamera(c: Camera, scale: number, p: MapPoint): Camera {
  "worklet";
  const ratio = scale / c.scale;
  return { scale, x: p.x - (p.x - c.x) * ratio, y: p.y - (p.y - c.y) * ratio };
}
