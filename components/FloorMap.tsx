import { useRouter } from "expo-router";
import React, { useRef } from "react";
import {
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Svg, { Rect, Line, Text as SvgText } from "react-native-svg";
import { MachineDto } from "@/services/machineAPI";
import EquipmentMarker from "./EquipmentMarker";
import MapLegend from "./MapLegend";

interface FloorMapProps {
  equipment: MachineDto[];
  width: number;
  height: number;
}

// Generate placeholder positions for equipment without assigned coordinates.
// Distributes equipment in a grid within the floor plan bounds.
function assignPlaceholderPositions(
  equipment: MachineDto[],
  floorWidth: number,
  floorHeight: number
): (MachineDto & { displayX: number; displayY: number })[] {
  const withPos = equipment.filter((e) => e.floorX != null && e.floorY != null);
  const withoutPos = equipment.filter((e) => e.floorX == null || e.floorY == null);

  const result: (MachineDto & { displayX: number; displayY: number })[] = [];

  for (const e of withPos) {
    result.push({ ...e, displayX: e.floorX!, displayY: e.floorY! });
  }

  // Grid layout for unpositioned equipment
  if (withoutPos.length > 0) {
    const cols = Math.ceil(Math.sqrt(withoutPos.length));
    const rows = Math.ceil(withoutPos.length / cols);
    const cellW = (floorWidth - 80) / cols;
    const cellH = (floorHeight - 80) / rows;

    withoutPos.forEach((e, idx) => {
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      result.push({
        ...e,
        displayX: 40 + col * cellW + cellW / 2,
        displayY: 40 + row * cellH + cellH / 2,
      });
    });
  }

  return result;
}

// Zone labels for the placeholder layout
const ZONES = [
  { label: "Free Weights", x: 80, y: 30 },
  { label: "Cardio", x: 450, y: 30 },
  { label: "Machines", x: 250, y: 320 },
];

export default function FloorMap({ equipment, width, height }: FloorMapProps) {
  const router = useRouter();
  const screenWidth = Dimensions.get("window").width - 40;
  const scale = screenWidth / width;
  const scaledH = height * scale;

  const positioned = assignPlaceholderPositions(equipment, width, height);

  const availableCount = equipment.filter(
    (e) => e.status.toUpperCase() === "AVAILABLE"
  ).length;
  const inUseCount = equipment.filter(
    (e) => e.status.toUpperCase() === "IN USE"
  ).length;

  return (
    <View style={styles.wrapper}>
      {/* Summary bar */}
      <View style={styles.summaryBar}>
        <Text style={styles.summaryText}>
          <Text style={styles.summaryGreen}>{availableCount}</Text> available
          {"  "}
          <Text style={styles.summaryRed}>{inUseCount}</Text> in use
          {"  "}
          <Text style={styles.summaryGray}>{equipment.length}</Text> total
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ width: screenWidth }}
      >
        <View style={[styles.mapContainer, { width: screenWidth, height: scaledH }]}>
          {/* SVG grid background */}
          <Svg width={screenWidth} height={scaledH} style={StyleSheet.absoluteFill}>
            <Rect x={0} y={0} width={screenWidth} height={scaledH} fill="#fafafa" rx={12} />
            {/* Grid lines */}
            {Array.from({ length: Math.ceil(width / 100) + 1 }).map((_, i) => (
              <Line
                key={`v${i}`}
                x1={i * 100 * scale}
                y1={0}
                x2={i * 100 * scale}
                y2={scaledH}
                stroke="#e8e8e8"
                strokeWidth={0.5}
              />
            ))}
            {Array.from({ length: Math.ceil(height / 100) + 1 }).map((_, i) => (
              <Line
                key={`h${i}`}
                x1={0}
                y1={i * 100 * scale}
                x2={screenWidth}
                y2={i * 100 * scale}
                stroke="#e8e8e8"
                strokeWidth={0.5}
              />
            ))}
            {/* Zone labels */}
            {ZONES.map((zone) => (
              <SvgText
                key={zone.label}
                x={zone.x * scale}
                y={zone.y * scale}
                fill="#ccc"
                fontSize={12 * scale}
                fontWeight="700"
                textAnchor="middle"
              >
                {zone.label}
              </SvgText>
            ))}
          </Svg>

          {/* Equipment markers */}
          {positioned.map((eq) => (
            <EquipmentMarker
              key={eq.id}
              x={eq.displayX * scale}
              y={eq.displayY * scale}
              status={eq.status}
              name={eq.name}
              label={eq.floorLabel}
              onPress={() =>
                router.push({
                  pathname: "/machine/[id]",
                  params: { id: String(eq.id) },
                })
              }
            />
          ))}
        </View>
      </ScrollView>

      <View style={styles.legendContainer}>
        <MapLegend />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  summaryBar: {
    alignItems: "center",
    paddingVertical: 8,
    marginBottom: 8,
  },
  summaryText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#888",
  },
  summaryGreen: {
    color: "#4CAF50",
    fontWeight: "800",
    fontSize: 16,
  },
  summaryRed: {
    color: "#FF5722",
    fontWeight: "800",
    fontSize: 16,
  },
  summaryGray: {
    color: "#666",
    fontWeight: "800",
    fontSize: 16,
  },
  mapContainer: {
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  legendContainer: {
    alignItems: "center",
    marginTop: 12,
  },
});
