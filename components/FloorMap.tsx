import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import Svg, {
  Circle,
  G,
  Line,
  Polygon,
  Rect,
  Text as SvgText,
} from "react-native-svg";
import type {
  FloorArea,
  FloorPlanResponse,
  MachineDto,
} from "@/services/machineAPI";
import { areaBounds, areaColors, isPositioned } from "@/utils/equipmentMap";
import AreaPressTarget from "./equipment/AreaPressTarget";
import MapViewport, { MapPin } from "./equipment/MapViewport";
import { markerColor } from "./EquipmentMarker";

interface FloorMapProps {
  floors: FloorPlanResponse[];
  allMachines: MachineDto[];
  selectedMuscleGroup?: string | null;
  muscleGroupsByEquipment?: Record<number, string[]>;
  highlightedEquipmentId?: number | null;
  initialFloorIdx?: number;
  selectedFloorId?: number | null;
  onFloorChange?: (id: number) => void;
  matchingEquipmentIds?: Set<number>;
  matchingAreaIds?: Set<string>;
  selectedAreaId?: string | null;
  onSelectEquipment?: (machine: MachineDto) => void;
  onSelectArea?: (area: FloorArea, floor: FloorPlanResponse) => void;
  hideFloorPicker?: boolean;
}
export function AreaDrawing({
  area,
  selected,
  matching,
  onPress,
}: {
  area: FloorArea;
  selected?: boolean;
  matching?: boolean;
  onPress?: () => void;
}) {
  const b = areaBounds(area),
    cx = b.x + b.width / 2,
    cy = b.y + b.height / 2;
  const fill = areaColors[area.kind] ?? "#EDF1EF",
    stroke = selected ? "#193D75" : matching ? "#216C50" : "#C5D0CA";
  return (
    <AreaPressTarget onPress={onPress} label={area.name}>
      {area.shape === "polygon" ? (
        <Polygon
          points={area.points?.map((p) => `${p.x},${p.y}`).join(" ")}
          fill={fill}
          stroke={stroke}
          strokeWidth={selected ? 8 : matching ? 5 : 2}
        />
      ) : (
        <Rect
          x={b.x}
          y={b.y}
          width={b.width}
          height={b.height}
          rx={area.kind === "track" ? 90 : 8}
          fill={fill}
          stroke={stroke}
          strokeWidth={selected ? 8 : matching ? 5 : 2}
          strokeDasharray={area.kind === "void" ? "10 8" : undefined}
        />
      )}
      {area.kind === "pool" &&
        [1, 2, 3, 4].map((i) => (
          <Line
            key={i}
            x1={b.x + 40}
            x2={b.x + b.width - 40}
            y1={b.y + 80 + (i * (b.height - 120)) / 5}
            y2={b.y + 80 + (i * (b.height - 120)) / 5}
            stroke="#91C6DC"
            strokeWidth={3}
          />
        ))}
      {area.kind === "court" && (
        <G>
          <Rect
            x={b.x + 25}
            y={b.y + 50}
            width={b.width - 50}
            height={b.height - 70}
            fill="none"
            stroke="#C7AC7D"
            strokeWidth={2}
          />
          <Line
            x1={cx}
            x2={cx}
            y1={b.y + 50}
            y2={b.y + b.height - 20}
            stroke="#C7AC7D"
            strokeWidth={2}
          />
          <Circle
            cx={cx}
            cy={cy + 15}
            r={35}
            fill="none"
            stroke="#C7AC7D"
            strokeWidth={2}
          />
        </G>
      )}
      {area.kind === "stairs" &&
        Array.from({ length: 5 }, (_, i) => (
          <Line
            key={i}
            x1={b.x + 15}
            x2={b.x + b.width - 15}
            y1={b.y + 40 + i * 11}
            y2={b.y + 40 + i * 11}
            stroke="#A3B0BA"
            strokeWidth={3}
          />
        ))}
      <SvgText
        x={cx}
        y={b.y + 26}
        textAnchor="middle"
        fontFamily="Arial"
        fontSize={area.kind === "stairs" || area.kind === "elevator" ? 17 : 24}
        fontWeight="600"
        fill={selected ? "#193D75" : "#4A5D53"}
      >
        {area.name}
      </SvgText>
    </AreaPressTarget>
  );
}
export default function FloorMap(p: FloorMapProps) {
  const router = useRouter();
  const floors = useMemo(
    () =>
      p.floors
        .filter((f) => f.id !== 0)
        .sort((a, b) => a.floorNumber - b.floorNumber),
    [p.floors],
  );
  const [internalId, setInternalId] = useState(
    floors[p.initialFloorIdx ?? 0]?.id,
  );
  const floor =
    floors.find((f) => f.id === (p.selectedFloorId ?? internalId)) ?? floors[0];
  const machines = useMemo(
    () => new Map(p.allMachines.map((m) => [m.id, m])),
    [p.allMachines],
  );
  if (!floor)
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyTitle}>Map not available yet</Text>
        <Text style={styles.hint}>
          Equipment is still searchable in the results list.
        </Text>
      </View>
    );
  const equipment = floor.equipment
    .map((eq) => ({ ...eq, ...machines.get(eq.id) }))
    .filter((eq) => isPositioned(eq, floor));
  const selected = equipment.find((eq) => eq.id === p.highlightedEquipmentId);
  const area = floor.layout?.areas.find((a) => a.id === p.selectedAreaId);
  const bounds = area ? areaBounds(area) : null;
  const focus = selected
    ? { x: selected.floorX!, y: selected.floorY!, key: `m:${selected.id}` }
    : bounds
      ? {
          x: bounds.x + bounds.width / 2,
          y: bounds.y + bounds.height / 2,
          key: `a:${area!.id}`,
        }
      : null;
  return (
    <GestureHandlerRootView style={styles.wrapper}>
      {!p.hideFloorPicker && (
        <ScrollView
          horizontal
          style={{ maxHeight: 48 }}
          contentContainerStyle={{ gap: 8 }}
        >
          {floors.map((f) => (
            <Pressable
              key={f.id}
              onPress={() => {
                setInternalId(f.id);
                p.onFloorChange?.(f.id);
              }}
              style={[styles.floor, f.id === floor.id && styles.active]}
            >
              <Text style={{ color: f.id === floor.id ? "white" : "#216C50" }}>
                {f.name}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      )}
      <MapViewport
        key={floor.id}
        width={floor.width}
        height={floor.height}
        focus={focus}
      >
        <Svg
          width={floor.width}
          height={floor.height}
          viewBox={`0 0 ${floor.width} ${floor.height}`}
          style={StyleSheet.absoluteFill}
        >
          <Rect
            width={floor.width}
            height={floor.height}
            rx={18}
            fill="white"
            stroke="#CDD6D1"
            strokeWidth={3}
          />
          {(floor.layout?.areas ?? []).map((a) => (
            <AreaDrawing
              key={a.id}
              area={a}
              selected={a.id === p.selectedAreaId}
              matching={p.matchingAreaIds?.has(a.id)}
              onPress={() => p.onSelectArea?.(a, floor)}
            />
          ))}
        </Svg>
        {equipment.map((eq) => {
          const groups =
            p.muscleGroupsByEquipment?.[eq.id] ?? eq.muscleGroups ?? [];
          const dimmed = p.matchingEquipmentIds
            ? !p.matchingEquipmentIds.has(eq.id)
            : !!p.selectedMuscleGroup &&
              !groups.some(
                (g) => g.toLowerCase() === p.selectedMuscleGroup?.toLowerCase(),
              );
          return (
            <MapPin
              key={eq.id}
              x={eq.floorX!}
              y={eq.floorY!}
              label={`${eq.floorLabel || eq.name} · ${eq.status}`}
              color={markerColor(eq.status)}
              selected={eq.id === p.highlightedEquipmentId}
              matched={p.matchingEquipmentIds?.has(eq.id)}
            dimmed={dimmed}
              onPress={() =>
                p.onSelectEquipment
                  ? p.onSelectEquipment(eq)
                  : router.push({
                      pathname: "/machine/[id]",
                      params: { id: String(eq.id) },
                    })
              }
            />
          );
        })}
      </MapViewport>
    </GestureHandlerRootView>
  );
}
const styles = StyleSheet.create({
  wrapper: { flex: 1, minHeight: 120, gap: 8 },
  floor: { padding: 10, borderRadius: 10, backgroundColor: "#E9F1EC" },
  active: { backgroundColor: "#216C50" },
  empty: {
    flex: 1,
    minHeight: 120,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EFF3F0",
    borderRadius: 14,
    padding: 24,
  },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: "#213C2D" },
  hint: { fontSize: 13, color: "#66796D", marginTop: 8, textAlign: "center" },
});
