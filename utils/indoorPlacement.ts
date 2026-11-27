import { FITNESS_ZONES, Zone } from "@/constants/indoorVenue";
import type { MachineDto } from "@/services/machineAPI";

const cells = (zones: Zone[], step: number) =>
  zones.flatMap((z) => {
    const cols = Math.floor(z.width / step),
      rows = Math.floor(z.height / step);
    return Array.from(
      { length: cols * rows },
      (_, i) =>
        [
          z.x + ((i % cols) + 0.5) * (z.width / cols),
          z.y + (Math.floor(i / cols) + 0.5) * (z.height / rows),
        ] as [number, number],
    );
  });

// shortcut: lays every machine out in rows across the Fitness zones (grouped by first muscle
// group, then name) instead of using real positions; replace once staff can place machines.
export function placeEquipment(machines: MachineDto[], zones = FITNESS_ZONES) {
  const group = (m: MachineDto) => m.muscleGroups?.[0];
  const sorted = [...machines].sort(
    (a, b) =>
      Number(!group(a)) - Number(!group(b)) || // ungrouped machines last
      (group(a) ?? "").localeCompare(group(b) ?? "") ||
      a.name.localeCompare(b.name) ||
      a.id - b.id,
  );
  const area = zones.reduce((sum, z) => sum + z.width * z.height, 0);
  let step = Math.sqrt(area / Math.max(sorted.length, 1));
  let grid = cells(zones, step);
  while (grid.length < sorted.length) grid = cells(zones, (step *= 0.95));
  return sorted.map((machine, i) => ({ machine, at: grid[i] }));
}
