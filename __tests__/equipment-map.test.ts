import {
  areaContains,
  areaOf,
  fitCamera,
  clampCamera,
  zoomCamera,
  isPositioned,
  searchEquipment,
} from "@/utils/equipmentMap";
import type {
  FloorArea,
  FloorPlanResponse,
  MachineDto,
} from "@/services/machineAPI";
const room: FloorArea = {
  id: "weights",
  name: "Free weights",
  kind: "strength",
  shape: "rect",
  x: 0,
  y: 0,
  width: 400,
  height: 300,
};
const machine: MachineDto = {
  id: 1,
  code: "B1",
  name: "Cable Station",
  status: "Available",
  exercise: "Cable Fly",
  exerciseNames: ["Cable Fly", "Face Pull"],
  muscleGroups: ["Chest", "Back"],
  floorX: 100,
  floorY: 100,
};
const floor: FloorPlanResponse = {
  id: 7,
  name: "Ground",
  width: 800,
  height: 600,
  floorNumber: 0,
  imageUrl: null,
  equipment: [machine],
  layout: { version: 1, areas: [room] },
};
const empty = { query: "", muscle: "", status: "", area: "" };
it("combines query tokens, exercise, muscle, availability and area", () => {
  expect(
    searchEquipment([machine], [floor], {
      query: "FLY cable",
      muscle: "Chest",
      status: "Available",
      area: "7:weights",
    }),
  ).toHaveLength(1);
  expect(
    searchEquipment([machine], [floor], {
      ...empty,
      query: "face",
      status: "In Use",
    }),
  ).toHaveLength(0);
  expect(
    searchEquipment([machine], [floor], { ...empty, query: "back" }).map(
      (r) => r.name,
    ),
  ).toEqual(["Cable Station"]);
});
it("searches places while excluding them under equipment-only filters", () => {
  expect(
    searchEquipment([machine], [floor], { ...empty, query: "free weights" }),
  ).toHaveLength(2);
  expect(
    searchEquipment([machine], [floor], { ...empty, muscle: "Chest" }).every(
      (r) => r.machine,
    ),
  ).toBe(true);
});
it("keeps cross-floor matches and equipment without coordinates", () => {
  const other = {
    ...machine,
    id: 2,
    name: "Second cable",
    floorX: null,
    floorY: null,
  };
  const second = {
    ...floor,
    id: 8,
    name: "Level 2",
    floorNumber: 1,
    equipment: [other],
  };
  expect(
    searchEquipment([machine, other], [floor, second], {
      ...empty,
      query: "cable",
    }).map((r) => r.floor?.id),
  ).toEqual([7, 8]);
  expect(isPositioned(other, second)).toBe(false);
  expect(isPositioned({ ...machine, floorX: 999 }, floor)).toBe(false);
  expect(isPositioned(machine, { ...floor, id: 0 })).toBe(false);
});
it("finds containment inside polygons and rectangles", () => {
  const triangle: FloorArea = {
    id: "t",
    name: "Turf",
    kind: "turf",
    shape: "polygon",
    points: [
      { x: 0, y: 0 },
      { x: 200, y: 0 },
      { x: 0, y: 200 },
    ],
  };
  expect(areaContains(triangle, { x: 30, y: 30 })).toBe(true);
  expect(areaContains(triangle, { x: 190, y: 190 })).toBe(false);
  expect(areaOf(machine, floor)?.id).toBe("weights");
});
it("fits/clamps the camera and preserves zoom focal coordinates", () => {
  const c = fitCamera(800, 600, 432, 332);
  expect(c).toEqual({ scale: 0.5, x: 16, y: 16 });
  const cursor = { x: 132, y: 116 },
    world = { x: (cursor.x - c.x) / c.scale, y: (cursor.y - c.y) / c.scale },
    zoom = zoomCamera(c, 2, cursor);
  expect((cursor.x - zoom.x) / zoom.scale).toBe(world.x);
  expect((cursor.y - zoom.y) / zoom.scale).toBe(world.y);
  const bound = clampCamera({ scale: 2, x: 900, y: -3000 }, 800, 600, 432, 332);
  expect(bound.x).toBe(24);
  expect(bound.y).toBe(332 - 1200 - 24);
});
it("does not omit machines from a dense 300-machine floor", () => {
  const machines = Array.from({ length: 300 }, (_, id) => ({ ...machine, id }));
  expect(
    searchEquipment(machines, [{ ...floor, equipment: machines }], {
      ...empty,
      query: "fly",
    }),
  ).toHaveLength(300);
});
