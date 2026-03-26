import { useRouter } from "expo-router";
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  MachineDto,
  FloorPlanResponse,
  machineAPI,
  Exercise,
} from "@/services/machineAPI";
import websocketService from "@/services/websocketService";
import MapModal from "../../components/MapModal";

export default function Equipment() {
  const router = useRouter();
  const [machines, setMachines] = useState<MachineDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exercisesByEquipment, setExercisesByEquipment] = useState<
    Record<number, Exercise[]>
  >({});
  const [floors, setFloors] = useState<FloorPlanResponse[]>([]);

  // Map modal state
  const [mapModalVisible, setMapModalVisible] = useState(false);
  const [locateTarget, setLocateTarget] = useState<MachineDto | null>(null);

  const loadMachines = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      const res = await machineAPI.listAll();
      setMachines(res);

      // Fetch exercises for each machine
      const exercisesMap: Record<number, Exercise[]> = {};
      await Promise.all(
        res.map(async (machine) => {
          try {
            const exercises = await machineAPI.getExercisesByEquipmentId(
              machine.id
            );
            exercisesMap[machine.id] = exercises;
          } catch {
            exercisesMap[machine.id] = [];
          }
        })
      );
      setExercisesByEquipment(exercisesMap);

      // Fetch floor plans
      try {
        const fp = await machineAPI.getFloorPlans();
        setFloors(fp);
      } catch {
        try {
          const fp = await machineAPI.getFloorPlan();
          setFloors([fp]);
        } catch {
          // no floor plans
        }
      }
    } catch (error) {
      console.error("Error loading machines:", error);
      setMachines([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadMachines();

    websocketService.connect();

    const unsubscribe = websocketService.subscribe((updatedMachine) => {
      setMachines((prev) =>
        prev.map((m) => (m.id === updatedMachine.id ? updatedMachine : m))
      );
      setFloors((prev) =>
        prev.map((floor) => ({
          ...floor,
          equipment: floor.equipment.map((eq) =>
            eq.id === updatedMachine.id
              ? { ...eq, status: updatedMachine.status }
              : eq
          ),
        }))
      );
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const onRefresh = () => {
    loadMachines(true);
  };

  const openLocateModal = (machine: MachineDto) => {
    setLocateTarget(machine);
    setMapModalVisible(true);
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Loading machines...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Equipment Availability</Text>

      {/* Scan QR button row */}
      <View style={styles.topRow}>
        <View />
        <TouchableOpacity
          style={styles.scanButton}
          onPress={() => router.push("/scan")}
        >
          <MaterialCommunityIcons name="qrcode-scan" size={16} color="#fff" />
          <Text style={styles.scanButtonText}>Scan QR</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={machines}
        keyExtractor={(item) => item.code}
        contentContainerStyle={{ margin: 0 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No machines available</Text>
            <Text style={styles.emptySubtext}>Pull to refresh</Text>
          </View>
        )}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#4CAF50"
            colors={["#4CAF50", "#66BB6A", "#81C784"]}
            progressBackgroundColor="#ffffff"
            title="Pull to refresh"
            titleColor="#4CAF50"
          />
        }
        renderItem={({ item }) => {
          const statusUpper = item.status.toUpperCase();
          const isAvailable = statusUpper === "AVAILABLE";
          const exercises = exercisesByEquipment[item.id] || [];
          const muscleGroupsStr = [
            ...new Set(exercises.map((e) => e.muscleGroup)),
          ].join(", ");

          // Check if this equipment is placed on any floor
          const isOnFloor = floors.some((f) =>
            f.equipment.some((eq) => eq.id === item.id)
          );

          return (
            <TouchableOpacity
              onPress={() =>
                router.push({
                  pathname: "/machine/[id]",
                  params: { id: String(item.id) },
                })
              }
              activeOpacity={0.7}
              style={[
                styles.card,
                isAvailable ? styles.availableCard : styles.inUseCard,
              ]}
            >
              <View
                style={[
                  styles.iconContainer,
                  isAvailable ? styles.availableIconBg : styles.inUseIconBg,
                ]}
              >
                <MaterialCommunityIcons
                  name="dumbbell"
                  size={28}
                  color={isAvailable ? "#4CAF50" : "#FF5722"}
                />
              </View>
              <View style={styles.cardContent}>
                <Text style={styles.name} numberOfLines={1}>
                  {item.name}
                </Text>
                <View
                  style={[
                    styles.statusBadge,
                    isAvailable ? styles.availableBadge : styles.inUseBadge,
                  ]}
                >
                  <View
                    style={[
                      styles.statusDot,
                      isAvailable ? styles.availableDot : styles.inUseDot,
                    ]}
                  />
                  <Text
                    style={[
                      styles.statusText,
                      isAvailable ? styles.availableText : styles.inUseText,
                    ]}
                  >
                    {isAvailable ? "Available" : "In Use"}
                  </Text>
                </View>
                {exercises.length > 0 && (
                  <View style={styles.exercisesContainer}>
                    {muscleGroupsStr ? (
                      <Text style={styles.muscleGroupText}>
                        {muscleGroupsStr}
                      </Text>
                    ) : null}
                    <Text style={styles.exercisesText} numberOfLines={2}>
                      {exercises
                        .slice(0, 3)
                        .map((e) => e.name)
                        .join(", ")}
                      {exercises.length > 3 ? "..." : ""}
                    </Text>
                  </View>
                )}
              </View>
              <View style={styles.cardActions}>
                {isOnFloor && (
                  <TouchableOpacity
                    style={styles.locateBtn}
                    onPress={(e) => {
                      e.stopPropagation();
                      openLocateModal(item);
                    }}
                    hitSlop={6}
                    activeOpacity={0.7}
                  >
                    <MaterialCommunityIcons
                      name="map-marker-radius-outline"
                      size={18}
                      color="#4CAF50"
                    />
                    <Text style={styles.locateBtnText}>Locate</Text>
                  </TouchableOpacity>
                )}
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={24}
                  color="#bdbdbd"
                />
              </View>
            </TouchableOpacity>
          );
        }}
      />

      {/* Map Modal */}
      <MapModal
        visible={mapModalVisible}
        onClose={() => {
          setMapModalVisible(false);
          setLocateTarget(null);
        }}
        floors={floors}
        allMachines={machines}
        targetEquipment={locateTarget}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    padding: 20,
    paddingTop: 50,
  },
  title: {
    fontSize: 26,
    fontWeight: "900",
    color: "#1a1a1a",
    textAlign: "center",
    marginBottom: 16,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    marginBottom: 12,
  },
  scanButton: {
    backgroundColor: "#4CAF50",
    borderRadius: 20,
    paddingVertical: 9,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  scanButtonText: {
    color: "#ffffff",
    fontWeight: "800",
    fontSize: 13,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  availableCard: {
    backgroundColor: "#f1f8f4",
    borderLeftWidth: 4,
    borderLeftColor: "#4CAF50",
  },
  inUseCard: {
    backgroundColor: "#fff5f2",
    borderLeftWidth: 4,
    borderLeftColor: "#FF5722",
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  availableIconBg: {
    backgroundColor: "#e8f5e9",
  },
  inUseIconBg: {
    backgroundColor: "#ffebee",
  },
  cardContent: {
    flex: 1,
    justifyContent: "center",
  },
  name: {
    color: "#1a1a1a",
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 6,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    gap: 6,
  },
  availableBadge: {
    backgroundColor: "#e8f5e9",
  },
  inUseBadge: {
    backgroundColor: "#ffebee",
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  availableDot: {
    backgroundColor: "#4CAF50",
  },
  inUseDot: {
    backgroundColor: "#FF5722",
  },
  statusText: {
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  availableText: {
    color: "#2e7d32",
  },
  inUseText: {
    color: "#d32f2f",
  },
  exercisesContainer: {
    marginTop: 8,
  },
  muscleGroupText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#666",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  exercisesText: {
    fontSize: 13,
    color: "#888",
    lineHeight: 16,
  },
  cardActions: {
    alignItems: "flex-end",
    justifyContent: "center",
    gap: 8,
  },
  locateBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#e8f5e9",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  locateBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#4CAF50",
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: "#4CAF50",
    fontSize: 16,
    marginTop: 10,
  },
  emptyContainer: {
    padding: 40,
    alignItems: "center",
  },
  emptyText: {
    color: "#666",
    fontSize: 18,
    fontWeight: "700",
  },
  emptySubtext: {
    color: "#999",
    fontSize: 14,
    marginTop: 8,
  },
});
