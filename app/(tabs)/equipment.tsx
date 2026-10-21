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
import React, { useMemo, useState } from "react";
import { isOutOfOrder, OUT_OF_ORDER_COLOR, OUT_OF_ORDER_ICON } from "@/constants/machineStatus";
import { useCachedResource, useCachedResources } from "@/hooks/useCachedResource";
import { cacheKeys, fetchFloorPlans, STALE_MS } from "@/services/cachedResources";
import { MachineDto, machineAPI, Exercise } from "@/services/machineAPI";
import MapModal from "../../components/MapModal";

export default function Equipment() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  // One request for everything the cards show; live updates keep the statuses (and the map) current
  const {
    data: machinesData,
    loading,
    refresh: refreshMachines,
  } = useCachedResource<MachineDto[]>(cacheKeys.machines, machineAPI.listAll, {
    live: true,
    staleTime: STALE_MS.live,
  });
  const machines = useMemo(() => machinesData ?? [], [machinesData]);
  // Only for Locate, so it loads on its own and never holds up the list
  const { data: floorsData, refresh: refreshFloors } = useCachedResource(cacheKeys.floorPlans, fetchFloorPlans, {
    live: true,
    staleTime: STALE_MS.live,
  });
  const floors = floorsData ?? [];

  // A backend that doesn't send each machine's exercises with it needs a request per machine.
  // Those run in the background and are saved, so they never hold up the list.
  const exerciseRequests = useMemo(
    () =>
      machines
        .filter((m) => m.exerciseNames === undefined)
        .map((m) => ({
          key: cacheKeys.machineExercises(m.id),
          fetcher: () => machineAPI.getExercisesByEquipmentId(m.id),
        })),
    [machines],
  );
  const { data: exercisesByKey } = useCachedResources<Exercise[]>(exerciseRequests, {
    staleTime: STALE_MS.catalog,
  });
  const exercisesOf = (machine: MachineDto) => {
    if (machine.exerciseNames) return { names: machine.exerciseNames, muscleGroups: machine.muscleGroups ?? [] };
    const fetched = exercisesByKey[cacheKeys.machineExercises(machine.id)] ?? [];
    return { names: fetched.map((e) => e.name), muscleGroups: [...new Set(fetched.map((e) => e.muscleGroup))] };
  };

  // Map modal state
  const [mapModalVisible, setMapModalVisible] = useState(false);
  const [locateTarget, setLocateTarget] = useState<MachineDto | null>(null);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([refreshMachines(), refreshFloors()]);
    } finally {
      setRefreshing(false);
    }
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
          const outOfOrder = isOutOfOrder(item.status);
          const { names: exerciseNames, muscleGroups } = exercisesOf(item);
          const muscleGroupsStr = muscleGroups.join(", ");

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
                outOfOrder ? styles.outOfOrderCard : isAvailable ? styles.availableCard : styles.inUseCard,
              ]}
            >
              <View
                style={[
                  styles.iconContainer,
                  outOfOrder ? styles.outOfOrderIconBg : isAvailable ? styles.availableIconBg : styles.inUseIconBg,
                ]}
              >
                <MaterialCommunityIcons
                  name={outOfOrder ? OUT_OF_ORDER_ICON : "dumbbell"}
                  size={28}
                  color={outOfOrder ? OUT_OF_ORDER_COLOR : isAvailable ? "#4CAF50" : "#FF5722"}
                />
              </View>
              <View style={styles.cardContent}>
                <Text style={styles.name} numberOfLines={1}>
                  {item.name}
                </Text>
                <View
                  style={[
                    styles.statusBadge,
                    outOfOrder ? styles.outOfOrderBadge : isAvailable ? styles.availableBadge : styles.inUseBadge,
                  ]}
                >
                  <View
                    style={[
                      styles.statusDot,
                      outOfOrder ? styles.outOfOrderDot : isAvailable ? styles.availableDot : styles.inUseDot,
                    ]}
                  />
                  <Text
                    style={[
                      styles.statusText,
                      outOfOrder ? styles.outOfOrderText : isAvailable ? styles.availableText : styles.inUseText,
                    ]}
                  >
                    {outOfOrder ? "Out of order" : isAvailable ? "Available" : "In Use"}
                  </Text>
                </View>
                {exerciseNames.length > 0 && (
                  <View style={styles.exercisesContainer}>
                    {muscleGroupsStr ? (
                      <Text style={styles.muscleGroupText}>
                        {muscleGroupsStr}
                      </Text>
                    ) : null}
                    <Text style={styles.exercisesText} numberOfLines={2}>
                      {exerciseNames.slice(0, 3).join(", ")}
                      {exerciseNames.length > 3 ? "..." : ""}
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
  outOfOrderCard: {
    backgroundColor: "#f5f5f5",
    borderLeftWidth: 4,
    borderLeftColor: OUT_OF_ORDER_COLOR,
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
  outOfOrderIconBg: {
    backgroundColor: "#eeeeee",
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
  outOfOrderBadge: {
    backgroundColor: "#eeeeee",
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
  outOfOrderDot: {
    backgroundColor: OUT_OF_ORDER_COLOR,
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
  outOfOrderText: {
    color: "#616161",
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
