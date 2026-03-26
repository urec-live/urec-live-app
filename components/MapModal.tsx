import React, { useMemo } from "react";
import {
  Dimensions,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { FloorPlanResponse, MachineDto } from "@/services/machineAPI";
import FloorMap from "./FloorMap";

interface MapModalProps {
  visible: boolean;
  onClose: () => void;
  floors: FloorPlanResponse[];
  allMachines: MachineDto[];
  targetEquipment: MachineDto | null;
}

export default function MapModal({
  visible,
  onClose,
  floors,
  allMachines,
  targetEquipment,
}: MapModalProps) {
  // Find which floor this equipment is on
  const initialFloorIdx = useMemo(() => {
    if (!targetEquipment) return 0;
    const idx = floors.findIndex((floor) =>
      floor.equipment.some((eq) => eq.id === targetEquipment.id)
    );
    return idx >= 0 ? idx : 0;
  }, [targetEquipment, floors]);

  const floorName = useMemo(() => {
    if (floors[initialFloorIdx]) return floors[initialFloorIdx].name;
    return "Floor Map";
  }, [floors, initialFloorIdx]);

  if (!targetEquipment) return null;

  const isAvailable = targetEquipment.status.toUpperCase() === "AVAILABLE";

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <MaterialCommunityIcons
              name="map-marker-radius"
              size={24}
              color="#4CAF50"
            />
            <Text style={styles.headerTitle}>Locate Equipment</Text>
          </View>
          <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={12}>
            <MaterialCommunityIcons name="close" size={24} color="#666" />
          </Pressable>
        </View>

        {/* Equipment info card */}
        <View style={styles.infoCard}>
          <View
            style={[
              styles.infoDot,
              { backgroundColor: isAvailable ? "#4CAF50" : "#FF5722" },
            ]}
          />
          <View style={styles.infoContent}>
            <Text style={styles.infoName}>{targetEquipment.name}</Text>
            <Text style={styles.infoMeta}>
              {floorName} · {isAvailable ? "Available" : "In Use"}
            </Text>
          </View>
        </View>

        {/* Floor Map */}
        <View style={styles.mapWrapper}>
          <FloorMap
            floors={floors}
            allMachines={allMachines}
            highlightedEquipmentId={targetEquipment.id}
            initialFloorIdx={initialFloorIdx}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e8e8e8",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1a1a1a",
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#f0f0f0",
    alignItems: "center",
    justifyContent: "center",
  },
  infoCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    marginHorizontal: 20,
    marginTop: 16,
    padding: 14,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    gap: 12,
  },
  infoDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  infoContent: {
    flex: 1,
  },
  infoName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1a1a1a",
  },
  infoMeta: {
    fontSize: 13,
    color: "#888",
    marginTop: 2,
  },
  mapWrapper: {
    flex: 1,
    padding: 20,
    paddingTop: 12,
  },
});
