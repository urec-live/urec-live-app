import { MachineDto, machineAPI } from "@/services/machineAPI";
import { useWorkout } from "@/contexts/WorkoutContext";
import { useAuth } from "@/contexts/AuthContext";
import { useOffline } from "@/contexts/OfflineContext";
import { analyticsAPI } from "@/services/analyticsAPI";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import websocketService from "@/services/websocketService";

export default function EquipmentAvailability() {
  const { exercise, muscle } = useLocalSearchParams();
  const name = (exercise as string) || "Bench Press";
  const muscleGroup = (muscle as string) || "Chest";
  const router = useRouter();

  const { checkIn, checkOut, currentSession } = useWorkout();
  const { addToQueue } = useOffline();
  const { isGuest, isSignedIn, loading: authLoading } = useAuth();

  const [machines, setMachines] = useState<MachineDto[]>([]);
  const [selected, setSelected] = useState<MachineDto | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [myEngagement, setMyEngagement] = useState<MachineDto | null>(null);
  const [busyCode, setBusyCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [utilizationByEquipmentId, setUtilizationByEquipmentId] = useState<Record<number, number>>({});
  const [waitTimeByEquipmentId, setWaitTimeByEquipmentId] = useState<Record<number, number | null>>({});
  const [utilizationUpdatedAt, setUtilizationUpdatedAt] = useState<number | null>(null);
  const machinesRef = useRef<MachineDto[]>([]);
  const realtimeRefreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refreshRollingUtilization = async () => {
    if (isGuest || !isSignedIn || authLoading) {
      setUtilizationByEquipmentId({});
      setUtilizationUpdatedAt(null);
      return;
    }

    try {
      const utilization = await analyticsAPI.getRollingUtilization(15);
      const map: Record<number, number> = {};
      utilization.forEach((item) => {
        map[item.equipmentId] = item.utilizationPercent;
      });
      setUtilizationByEquipmentId(map);
      setUtilizationUpdatedAt(Date.now());
    } catch (error) {
      console.error("Failed to load rolling utilization:", error);
      setUtilizationByEquipmentId({});
      setUtilizationUpdatedAt(null);
    }
  };

  const refreshWaitTimes = async (machinesList: MachineDto[]) => {
    if (isGuest || !isSignedIn || authLoading) {
      setWaitTimeByEquipmentId({});
      return;
    }

    const inUseMachines = machinesList.filter(
      (machine) => machine.status.toUpperCase() !== "AVAILABLE"
    );

    if (!inUseMachines.length) {
      setWaitTimeByEquipmentId({});
      return;
    }

    try {
      const entries = await Promise.all(
        inUseMachines.map(async (machine) => {
          try {
            const estimate = await analyticsAPI.getWaitTimeEstimate(machine.code);
            return [machine.id, estimate.estimatedWaitSeconds ?? null] as const;
          } catch (error) {
            console.error(`Failed to load wait time for ${machine.code}:`, error);
            return [machine.id, null] as const;
          }
        })
      );
      const map: Record<number, number | null> = {};
      entries.forEach(([id, seconds]) => {
        map[id] = seconds;
      });
      setWaitTimeByEquipmentId(map);
    } catch (error) {
      console.error("Failed to load wait times:", error);
      setWaitTimeByEquipmentId({});
    }
  };

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        console.log('Fetching machines for exercise:', name);
        const [ms, me] = await Promise.all([
          machineAPI.getByExercise(name),
          machineAPI.getMyEngagement().catch(() => null),
        ]);
        console.log('Machines received:', ms);
        setMachines(ms);
        setMyEngagement(me);
        await refreshWaitTimes(ms);
        await refreshRollingUtilization();
      } catch (error) {
        console.error('Error loading machines:', error);
        setMachines([]);
      } finally {
        setLoading(false);
      }
    };
    load();

    // Ensure WebSocket is connected for real-time updates
    websocketService.connect();

    // Subscribe to WebSocket updates
    const unsubscribe = websocketService.subscribe((update) => {
      console.log('[Workout Equipment] Received equipment status update:', update);
      setMachines(prev =>
        prev.map(m => m.id === update.equipmentId ? { ...m, status: update.status } : m)
      );
      if (realtimeRefreshTimeoutRef.current) {
        clearTimeout(realtimeRefreshTimeoutRef.current);
      }
      realtimeRefreshTimeoutRef.current = setTimeout(async () => {
        realtimeRefreshTimeoutRef.current = null;
        await refreshRollingUtilization();
        await refreshWaitTimes(machinesRef.current);
      }, 400);
    });
    const unsubscribeConnection = websocketService.subscribeConnection(() => {
      console.log("[Workout Equipment] WebSocket reconnected, refreshing.");
      refresh();
    });

    return () => {
      unsubscribe();
      unsubscribeConnection();
      if (realtimeRefreshTimeoutRef.current) {
        clearTimeout(realtimeRefreshTimeoutRef.current);
      }
    };
  }, [name]);

  useEffect(() => {
    machinesRef.current = machines;
  }, [machines]);

  const refresh = async () => {
    try {
      setRefreshing(true);
      const [ms, me] = await Promise.all([
        machineAPI.getByExercise(name),
        machineAPI.getMyEngagement().catch(() => null),
      ]);
      setMachines(ms);
      setMyEngagement(me);
      await refreshWaitTimes(ms);
      await refreshRollingUtilization();
    } finally {
      setRefreshing(false);
    }
  };

  const handleCheckIn = async (code: string) => {
    setBusyCode(code);
    try {
      await machineAPI.checkIn(code);
      await checkIn(name, code, muscleGroup);
      await refresh();
      setModalVisible(false);
    } finally {
      setBusyCode(null);
    }
  };

  const handleCheckOut = async (code: string) => {
    setBusyCode(code);
    try {
      try {
        await machineAPI.checkOut(code);
      } catch (error) {
        await addToQueue({
          url: `/api/equipment/${code}/checkout`,
          method: 'POST',
          body: {}
        });
      }
      await checkOut();
      await refresh();
      router.back();
    } finally {
      setBusyCode(null);
    }
  };

  const openModal = (machine: MachineDto) => {
    const userHoldingOther = myEngagement && myEngagement.code !== machine.code;
    const statusUpper = machine.status.toUpperCase();
    const lockedByOther = !machine.heldByMe && (statusUpper === "IN_USE" || statusUpper === "IN USE");
    if (lockedByOther || userHoldingOther) return;
    setSelected(machine);
    setModalVisible(true);
  };

  const sessionMatchesExercise = currentSession?.exerciseName === name;
  const hasActiveSession = Boolean(currentSession);
  const activeMachineLabel = myEngagement?.name ?? currentSession?.exerciseName ?? "this equipment";
  const showInsights = !isGuest && isSignedIn && !authLoading;

  const formatWaitTime = (seconds: number | null | undefined) => {
    if (!seconds || seconds <= 0) {
      return null;
    }
    const minutes = Math.max(1, Math.ceil(seconds / 60));
    return `Wait ~${minutes}m`;
  };

  const getBusyLabel = (utilization?: number) => {
    if (utilization == null || Number.isNaN(utilization)) {
      return null;
    }
    if (utilization < 33) {
      return { label: "Low", style: styles.busyLow, textStyle: styles.busyTextLow };
    }
    if (utilization < 66) {
      return { label: "Med", style: styles.busyMedium, textStyle: styles.busyTextMedium };
    }
    return { label: "High", style: styles.busyHigh, textStyle: styles.busyTextHigh };
  };

  return (
    <LinearGradient colors={["#ffffff", "#f5f5f5", "#ffffff"]} style={{ flex: 1 }}>
      <View style={styles.container}>
        <Text style={styles.title}>{name} Machines</Text>
        {hasActiveSession ? (
          <View style={styles.sessionBanner}>
            <Text style={styles.sessionBannerTitle}>Session Active</Text>
            <Text style={styles.sessionBannerSubtitle}>
              {sessionMatchesExercise
                ? `You're already checked in on ${activeMachineLabel}.`
                : `End your current session to check in here.`}
            </Text>
            {currentSession && (
              <TouchableOpacity
                style={styles.sessionBannerAction}
                onPress={() =>
                  router.push({
                    pathname: "/workout/equipment/[exercise]",
                    params: {
                      exercise: currentSession.exerciseName,
                      muscle: currentSession.muscleGroup,
                    },
                  })
                }
              >
                <Text style={styles.sessionBannerActionText}>Return to Session</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <TouchableOpacity style={styles.scanButton} onPress={() => router.push("/scan")}>
            <Text style={styles.scanButtonText}>Scan QR to Check In</Text>
          </TouchableOpacity>
        )}

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#00ff88" />
            <Text style={styles.loadingText}>Loading machines...</Text>
          </View>
        ) : (
          <FlatList
            data={machines}
            keyExtractor={(item) => item.code}
            style={{ flex: 1 }}
            contentContainerStyle={{ margin: 4, flexGrow: 1 }}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={refresh}
                tintColor="#4CAF50"
                colors={["#4CAF50", "#66BB6A", "#81C784"]}
                progressBackgroundColor="#ffffff"
                title="Pull to refresh"
                titleColor="#4CAF50"
              />
            }
            renderItem={({ item }) => {
              const isMyEngagement = myEngagement?.code === item.code;
              const userHoldingOther = myEngagement && !isMyEngagement;
              const statusUpper = item.status.toUpperCase();
              const lockedByOther = !item.heldByMe && (statusUpper === "IN_USE" || statusUpper === "IN USE");
              const isClickable = !lockedByOther && !userHoldingOther;
              const shouldBeVisuallyDisabled = !isClickable;

              const statusLabel =
                statusUpper === "AVAILABLE" ? "Available" : "In Use";

              return (
                <TouchableOpacity
                  style={[
                    styles.card,
                    statusUpper === "AVAILABLE"
                      ? styles.available
                      : item.heldByMe
                        ? styles.myMachine
                        : styles.inUse,
                    shouldBeVisuallyDisabled && styles.disabled,
                  ]}
                  onPress={() => openModal(item)}
                  disabled={!isClickable}
                >
                  <MaterialCommunityIcons
                    name="weight-lifter"
                    size={32}
                    color={
                      item.status === "AVAILABLE"
                        ? "#4CAF50"
                        : item.heldByMe
                          ? "#4CAF50"
                          : "#FF5722"
                    }
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.machineText}>{item.name}</Text>
                    <View style={styles.statusRow}>
                      <Text style={styles.statusText}>
                        {item.heldByMe && item.status === "IN_USE"
                          ? "Your Machine"
                          : statusLabel}
                      </Text>
                      {showInsights && (() => {
                        const busyInfo = getBusyLabel(utilizationByEquipmentId[item.id]);
                        if (!busyInfo) {
                          return null;
                        }
                        return (
                          <View style={[styles.busyBadge, busyInfo.style]}>
                            <Text style={[styles.busyText, busyInfo.textStyle]}>
                              Busy: {busyInfo.label}
                            </Text>
                          </View>
                        );
                      })()}
                      {showInsights && (() => {
                        const waitTimeLabel = isClickable ? null : formatWaitTime(waitTimeByEquipmentId[item.id]);
                        if (!waitTimeLabel) {
                          return null;
                        }
                        return <Text style={styles.waitTimeText}>{waitTimeLabel}</Text>;
                      })()}
                    </View>
                  </View>
                  {lockedByOther && (
                    <MaterialCommunityIcons name="lock" size={24} color="#FF4500" />
                  )}
                </TouchableOpacity>
              );
            }}
          />
        )}

        {/* Modal */}
        <Modal visible={modalVisible} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <Text style={styles.modalTitle}>{selected?.id}</Text>
              <Text style={styles.modalSubtitle}>
                Current Status: {selected?.status}
              </Text>

              {/* Logic for an AVAILABLE machine */}
              {selected?.status === "AVAILABLE" && !myEngagement && (
                <>
                  <Pressable
                    style={styles.button}
                    onPress={() => handleCheckIn(selected!.code)}
                    disabled={busyCode === selected?.code}
                  >
                    <Text style={styles.buttonText}>Check In</Text>
                  </Pressable>
                </>
              )}

              {/* Logic for an AVAILABLE machine, but user is checked into *another* machine */}
              {selected?.status === "AVAILABLE" && myEngagement && myEngagement.code !== selected?.code && (
                <Text style={styles.modalSubtitle}>
                  You are already using equipment.
                </Text>
              )}


              {/* Logic for MY CHECKED-IN machine */}
              {selected?.status === "IN_USE" && selected?.heldByMe && (
                <Pressable
                  style={styles.button}
                  onPress={() => handleCheckOut(selected!.code)}
                  disabled={busyCode === selected?.code}
                >
                  <Text style={styles.buttonText}>End Exercise / Check Out</Text>
                </Pressable>
              )}

              <Pressable
                style={[styles.button, styles.cancelButton]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelText}>Close</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, paddingTop: 60 },
  title: {
    fontSize: 26,
    color: "#1a1a1a",
    fontWeight: "900",
    textAlign: "center",
    marginBottom: 20,
    textTransform: "capitalize",
  },
  scanButton: {
    backgroundColor: "#4CAF50",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderWidth: 2,
    borderColor: "#2e7d32",
    marginBottom: 16,
    alignItems: "center",
  },
  scanButtonText: { color: "#ffffff", fontWeight: "900" },
  sessionBanner: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#c8e6c9",
    backgroundColor: "#f1f8f4",
    padding: 12,
    marginBottom: 16,
    alignItems: "center",
  },
  sessionBannerTitle: {
    color: "#1b5e20",
    fontWeight: "800",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  sessionBannerSubtitle: {
    color: "#2e7d32",
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
  },
  sessionBannerAction: {
    marginTop: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#2e7d32",
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  sessionBannerActionText: {
    color: "#2e7d32",
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 10,
    padding: 15,
    marginBottom: 12,
    elevation: 3,
    gap: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  available: { borderColor: "#4CAF50", borderWidth: 2 },
  inUse: { borderColor: "#FF5722", borderWidth: 2 },
  reserved: { borderColor: "#F44336", borderWidth: 2 },
  myMachine: { borderColor: "#4CAF50", borderWidth: 3, backgroundColor: "#E8F5E9" },
  disabled: { opacity: 0.5 },
  machineText: { color: "#4CAF50", fontWeight: "700", fontSize: 18 },
  statusText: { color: "#666", fontSize: 14 },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 4,
  },
  busyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  busyLow: { backgroundColor: "#eff7f2" },
  busyMedium: { backgroundColor: "#fff6e8" },
  busyHigh: { backgroundColor: "#fff0f0" },
  busyText: {
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  busyTextLow: { color: "#2e7d32" },
  busyTextMedium: { color: "#ef6c00" },
  busyTextHigh: { color: "#c62828" },
  waitTimeText: {
    fontSize: 10,
    color: "#6b6b6b",
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.2,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    backgroundColor: "#ffffff",
    padding: 25,
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    alignItems: "center",
    borderTopWidth: 3,
    borderColor: "#4CAF50",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  modalTitle: { color: "#4CAF50", fontSize: 24, fontWeight: "900", marginBottom: 10 },
  modalSubtitle: { color: "#666", fontSize: 16, marginBottom: 20 },
  button: {
    backgroundColor: "#4CAF50",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 25,
    marginVertical: 6,
    borderWidth: 2,
    borderColor: "#2e7d32",
  },
  buttonText: { color: "#ffffff", fontWeight: "700", fontSize: 16 },
  cancelButton: { backgroundColor: "#ffffff", borderWidth: 2, borderColor: "#bdbdbd" },
  cancelText: { color: "#666", fontWeight: "700", fontSize: 16 },
  loadingContainer: {
    justifyContent: "center",
    alignItems: "center",
    minHeight: 200,
  },
  loadingText: {
    color: "#4CAF50",
    fontSize: 16,
    marginTop: 10,
  },
});
