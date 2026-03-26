import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable,
  Platform,
} from "react-native";
import {
  GestureDetector,
  Gesture,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { FloorPlanResponse, MachineDto } from "@/services/machineAPI";
import EquipmentMarker from "./EquipmentMarker";
import MapLegend from "./MapLegend";

interface FloorMapProps {
  floors: FloorPlanResponse[];
  allMachines: MachineDto[];
  selectedMuscleGroup?: string | null;
  muscleGroupsByEquipment?: Record<number, string[]>;
  highlightedEquipmentId?: number | null;
  initialFloorIdx?: number;
}

function assignPlaceholderPositions(
  equipment: MachineDto[],
  floorWidth: number,
  floorHeight: number
): (MachineDto & { displayX: number; displayY: number })[] {
  const withPos = equipment.filter(
    (e) => e.floorX != null && e.floorY != null
  );
  const withoutPos = equipment.filter(
    (e) => e.floorX == null || e.floorY == null
  );

  const result: (MachineDto & { displayX: number; displayY: number })[] = [];

  for (const e of withPos) {
    result.push({ ...e, displayX: e.floorX!, displayY: e.floorY! });
  }

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

function FloorCanvas({
  floor,
  selectedMuscleGroup,
  muscleGroupsByEquipment,
  highlightedEquipmentId,
}: {
  floor: FloorPlanResponse;
  selectedMuscleGroup: string | null;
  muscleGroupsByEquipment: Record<number, string[]>;
  highlightedEquipmentId?: number | null;
}) {
  const router = useRouter();
  const screenWidth = Dimensions.get("window").width - 40;
  const baseScale = screenWidth / floor.width;
  const baseH = floor.height * baseScale;

  // Pinch-to-zoom state
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  const pinchGesture = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = Math.min(Math.max(savedScale.value * e.scale, 0.5), 4);
    })
    .onEnd(() => {
      savedScale.value = scale.value;
    });

  const panGesture = Gesture.Pan()
    .minPointers(2)
    .onUpdate((e) => {
      translateX.value = savedTranslateX.value + e.translationX;
      translateY.value = savedTranslateY.value + e.translationY;
    })
    .onEnd(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      scale.value = withSpring(1);
      savedScale.value = 1;
      translateX.value = withSpring(0);
      translateY.value = withSpring(0);
      savedTranslateX.value = 0;
      savedTranslateY.value = 0;
    });

  const composed = Gesture.Simultaneous(pinchGesture, panGesture);
  const gesture = Gesture.Exclusive(doubleTap, composed);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  const positioned = useMemo(
    () => assignPlaceholderPositions(floor.equipment, floor.width, floor.height),
    [floor]
  );

  // Determine which equipment IDs match the selected muscle group
  const highlightedIds = useMemo(() => {
    if (!selectedMuscleGroup) return null;
    const ids = new Set<number>();
    for (const eq of floor.equipment) {
      const groups = muscleGroupsByEquipment[eq.id] || [];
      if (
        groups.some(
          (g) => g.toLowerCase() === selectedMuscleGroup.toLowerCase()
        )
      ) {
        ids.add(eq.id);
      }
    }
    return ids;
  }, [selectedMuscleGroup, floor.equipment, muscleGroupsByEquipment]);

  const gridV = useMemo(() => {
    const lines = [];
    for (let i = 100; i < floor.width; i += 100) lines.push(i);
    return lines;
  }, [floor.width]);

  const gridH = useMemo(() => {
    const lines = [];
    for (let i = 100; i < floor.height; i += 100) lines.push(i);
    return lines;
  }, [floor.height]);

  const canvasContent = (
    <View
      style={[
        styles.mapContainer,
        {
          width: screenWidth,
          height: baseH,
          backgroundColor: "#fafafa",
        },
      ]}
    >
      {/* Vertical grid lines */}
      {gridV.map((i) => (
        <View
          key={`v${i}`}
          style={{
            position: "absolute" as const,
            left: i * baseScale,
            top: 0,
            width: 0.5,
            height: baseH,
            backgroundColor: "#e0e0e0",
          }}
        />
      ))}
      {/* Horizontal grid lines */}
      {gridH.map((i) => (
        <View
          key={`h${i}`}
          style={{
            position: "absolute" as const,
            top: i * baseScale,
            left: 0,
            height: 0.5,
            width: screenWidth,
            backgroundColor: "#e0e0e0",
          }}
        />
      ))}

      {/* Equipment markers — rendered LAST so they're on top */}
      {positioned.map((eq) => {
        const isDimmedByFilter =
          highlightedIds !== null && !highlightedIds.has(eq.id);
        const isDimmedByHighlight =
          highlightedEquipmentId != null && eq.id !== highlightedEquipmentId;
        const isHighlighted =
          highlightedEquipmentId != null && eq.id === highlightedEquipmentId;
        return (
          <EquipmentMarker
            key={eq.id}
            x={eq.displayX * baseScale}
            y={eq.displayY * baseScale}
            status={eq.status}
            name={eq.name}
            label={eq.floorLabel}
            dimmed={isDimmedByFilter || isDimmedByHighlight}
            highlighted={isHighlighted}
            onPress={() =>
              router.push({
                pathname: "/machine/[id]",
                params: { id: String(eq.id) },
              })
            }
          />
        );
      })}
    </View>
  );

  // On native, wrap with gesture detector for pinch-to-zoom
  if (Platform.OS !== "web") {
    return (
      <GestureDetector gesture={gesture}>
        <Animated.View
          style={[{ width: screenWidth, height: baseH }, animatedStyle]}
        >
          {canvasContent}
        </Animated.View>
      </GestureDetector>
    );
  }

  // On web, skip gesture detector (not well supported)
  return canvasContent;
}

export default function FloorMap({
  floors,
  allMachines,
  selectedMuscleGroup = null,
  muscleGroupsByEquipment = {},
  highlightedEquipmentId = null,
  initialFloorIdx = 0,
}: FloorMapProps) {
  const [selectedFloorIdx, setSelectedFloorIdx] = useState(initialFloorIdx);

  // Filter floors that have relevant equipment when muscle group is selected
  const relevantFloorIndices = useMemo(() => {
    if (!selectedMuscleGroup) return floors.map((_, i) => i);
    return floors
      .map((floor, i) => ({ floor, i }))
      .filter(({ floor }) =>
        floor.equipment.some((eq) => {
          const groups = muscleGroupsByEquipment[eq.id] || [];
          return groups.some(
            (g) => g.toLowerCase() === selectedMuscleGroup.toLowerCase()
          );
        })
      )
      .map(({ i }) => i);
  }, [selectedMuscleGroup, floors, muscleGroupsByEquipment]);

  const currentFloor = floors[selectedFloorIdx];
  if (!currentFloor) return null;

  const availableCount = currentFloor.equipment.filter(
    (e) => e.status.toUpperCase() === "AVAILABLE"
  ).length;
  const inUseCount = currentFloor.equipment.filter(
    (e) => e.status.toUpperCase() === "IN USE"
  ).length;

  return (
    <View style={styles.wrapper}>
      {/* Floor tabs */}
      {floors.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.floorTabs}
        >
          {floors.map((floor, idx) => {
            const isSelected = idx === selectedFloorIdx;
            const isRelevant =
              !selectedMuscleGroup || relevantFloorIndices.includes(idx);
            return (
              <Pressable
                key={floor.id}
                onPress={() => setSelectedFloorIdx(idx)}
                style={[
                  styles.floorTab,
                  isSelected && styles.floorTabActive,
                  !isRelevant && styles.floorTabDimmed,
                ]}
              >
                <Text
                  style={[
                    styles.floorTabText,
                    isSelected && styles.floorTabTextActive,
                    !isRelevant && styles.floorTabTextDimmed,
                  ]}
                >
                  {floor.name}
                </Text>
                <Text
                  style={[
                    styles.floorTabSub,
                    isSelected && styles.floorTabSubActive,
                  ]}
                >
                  {floor.equipment.length} equip
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      {/* Summary bar */}
      <View style={styles.summaryBar}>
        <Text style={styles.summaryText}>
          <Text style={styles.summaryGreen}>{availableCount}</Text> available
          {"  "}
          <Text style={styles.summaryRed}>{inUseCount}</Text> in use
          {"  "}
          <Text style={styles.summaryGray}>
            {currentFloor.equipment.length}
          </Text>{" "}
          total
        </Text>
      </View>

      {/* Zoomable floor canvas */}
      <GestureHandlerRootView style={styles.canvasWrapper}>
        <FloorCanvas
          key={currentFloor.id}
          floor={currentFloor}
          selectedMuscleGroup={selectedMuscleGroup}
          muscleGroupsByEquipment={muscleGroupsByEquipment}
          highlightedEquipmentId={highlightedEquipmentId}
        />
      </GestureHandlerRootView>

      {/* Zoom hint */}
      <Text style={styles.zoomHint}>Pinch to zoom · Double-tap to reset</Text>

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
  floorTabs: {
    paddingHorizontal: 4,
    paddingVertical: 6,
    gap: 8,
  },
  floorTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#e8e8e8",
    alignItems: "center",
  },
  floorTabActive: {
    backgroundColor: "#4CAF50",
  },
  floorTabDimmed: {
    opacity: 0.4,
  },
  floorTabText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#555",
  },
  floorTabTextActive: {
    color: "#fff",
  },
  floorTabTextDimmed: {
    color: "#999",
  },
  floorTabSub: {
    fontSize: 10,
    color: "#888",
    marginTop: 1,
  },
  floorTabSubActive: {
    color: "rgba(255,255,255,0.8)",
  },
  summaryBar: {
    alignItems: "center",
    paddingVertical: 6,
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
  canvasWrapper: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  mapContainer: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    overflow: "visible",
  },
  zoomHint: {
    textAlign: "center",
    fontSize: 11,
    color: "#bbb",
    marginTop: 4,
  },
  legendContainer: {
    alignItems: "center",
    marginTop: 8,
  },
});
