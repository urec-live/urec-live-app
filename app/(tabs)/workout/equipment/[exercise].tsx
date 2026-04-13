import { MachineDto, FloorPlanResponse, machineAPI } from "@/services/machineAPI";
import { sessionAPI, SessionResponse } from "@/services/sessionAPI";
import { useWorkout } from "@/contexts/WorkoutContext";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import MapModal from "../../../../components/MapModal";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
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

  const [machines, setMachines] = useState<MachineDto[]>([]);
  const [selected, setSelected] = useState<MachineDto | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [busyCode, setBusyCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // History modal state
  const [historyVisible, setHistoryVisible] = useState(false);
  const [recentSessions, setRecentSessions] = useState<SessionResponse[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Map modal state
  const [floors, setFloors] = useState<FloorPlanResponse[]>([]);
  const [mapModalVisible, setMapModalVisible] = useState(false);
  const [locateTarget, setLocateTarget] = useState<MachineDto | null>(null);

  // Workout details modal state
  const [workoutDetailsVisible, setWorkoutDetailsVisible] = useState(false);
  const [pendingStopCode, setPendingStopCode] = useState<string | null>(null);
  const [setsInput, setSetsInput] = useState("");
  const [repsInput, setRepsInput] = useState("");
  const [weightInput, setWeightInput] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const ms = await machineAPI.getByExercise(name);
        setMachines(ms);

        // Fetch floor plans for locate feature
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
      } catch {
        setMachines([]);
      } finally {
        setLoading(false);
      }
    };
    load();

    const unsubscribe = websocketService.subscribe((updatedMachine) => {
      if (updatedMachine.exercise?.toLowerCase() === name.toLowerCase()) {
        setMachines(prev =>
          prev.map(m => m.id === updatedMachine.id ? updatedMachine : m)
        );
      }
    });

    return () => { unsubscribe(); };
  }, [name]);

  const refresh = async () => {
    try {
      setRefreshing(true);
      const ms = await machineAPI.getByExercise(name);
      setMachines(ms);
    } finally {
      setRefreshing(false);
    }
  };

  const handleCheckIn = async (code: string) => {
    setBusyCode(code);
    try {
      await machineAPI.checkIn(code);
      checkIn(name, code, muscleGroup);
      await refresh();
      setModalVisible(false);
    } finally {
      setBusyCode(null);
    }
  };

  const handleCheckOut = async (code: string, details?: { setDetails?: { reps?: number; weightLbs?: number }[] }) => {
    setBusyCode(code);
    try {
      await machineAPI.checkOut(code);
      checkOut(details);
      await refresh();
      router.back();
    } finally {
      setBusyCode(null);
    }
  };

  // Direct start — bypasses modal (testing convenience)
  const handleStartDirect = async (code: string) => {
    await handleCheckIn(code);
  };

  // Open workout details sheet before stopping
  const handleStopPress = (code: string) => {
    setPendingStopCode(code);
    setSetsInput("");
    setRepsInput("");
    setWeightInput("");
    setWorkoutDetailsVisible(true);
  };

  const handleStopConfirm = async () => {
    if (!pendingStopCode) return;
    const numSets = setsInput ? parseInt(setsInput, 10) : 0;
    const setDetails = numSets > 0
      ? Array.from({ length: numSets }, () => ({
          reps: repsInput ? parseInt(repsInput, 10) : undefined,
          weightLbs: weightInput ? parseFloat(weightInput) : undefined,
        }))
      : undefined;
    setWorkoutDetailsVisible(false);
    await handleCheckOut(pendingStopCode, setDetails ? { setDetails } : undefined);
    setPendingStopCode(null);
  };

  const openHistory = async () => {
    setHistoryVisible(true);
    setHistoryLoading(true);
    try {
      const page = await sessionAPI.getMyHistory(0, 50);
      const filtered = page.content
        .filter((s) => s.exerciseName?.toLowerCase() === name.toLowerCase())
        .slice(0, 3);
      setRecentSessions(filtered);
    } catch {
      setRecentSessions([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const openModal = (machine: MachineDto) => {
    const userHoldingOther = currentSession && currentSession.machineId !== machine.code;
    const statusUpper = machine.status.toUpperCase();
    const lockedByOther = !machine.heldByMe && (statusUpper === "IN_USE" || statusUpper === "IN USE");
    if (lockedByOther || userHoldingOther) return;
    setSelected(machine);
    setModalVisible(true);
  };

  const openLocateModal = (machine: MachineDto) => {
    setLocateTarget(machine);
    setMapModalVisible(true);
  };

  return (
    <LinearGradient colors={["#ffffff", "#f5f5f5", "#ffffff"]} style={{ flex: 1 }}>
      <View style={styles.container}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>{name} Machines</Text>
          <TouchableOpacity style={styles.historyButton} onPress={openHistory}>
            <MaterialCommunityIcons name="history" size={18} color="#4CAF50" />
            <Text style={styles.historyButtonText}>History</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.scanButton} onPress={() => router.push("/scan")}>
          <Text style={styles.scanButtonText}>Scan QR to Check In</Text>
        </TouchableOpacity>

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
              const isMyEngagement = currentSession?.machineId === item.code;
              const userHoldingOther = currentSession && !isMyEngagement;
              const statusUpper = item.status.toUpperCase();
              const lockedByOther = !item.heldByMe && (statusUpper === "IN_USE" || statusUpper === "IN USE");
              const isClickable = !lockedByOther && !userHoldingOther;
              const shouldBeVisuallyDisabled = !isClickable;

              const statusLabel = statusUpper === "AVAILABLE" ? "Available" : "In Use";
              const isAvailableForMe = statusUpper === "AVAILABLE" && !currentSession;
              const isMyMachine = item.heldByMe && (statusUpper === "IN_USE" || statusUpper === "IN USE");

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
                    <Text style={styles.statusText}>
                      {isMyMachine ? "Your Machine" : statusLabel}
                    </Text>
                  </View>

                  {/* Locate on map button */}
                  {floors.some((f) =>
                    f.equipment.some((eq) => eq.id === item.id)
                  ) && (
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
                    </TouchableOpacity>
                  )}

                  {/* Manual Start button */}
                  {isAvailableForMe && (
                    <TouchableOpacity
                      style={styles.startButton}
                      onPress={() => handleStartDirect(item.code)}
                      disabled={busyCode === item.code}
                    >
                      {busyCode === item.code
                        ? <ActivityIndicator size="small" color="#fff" />
                        : <Text style={styles.startButtonText}>Start</Text>
                      }
                    </TouchableOpacity>
                  )}

                  {/* Manual Stop button */}
                  {isMyMachine && (
                    <TouchableOpacity
                      style={styles.stopButton}
                      onPress={() => handleStopPress(item.code)}
                      disabled={busyCode === item.code}
                    >
                      {busyCode === item.code
                        ? <ActivityIndicator size="small" color="#fff" />
                        : <Text style={styles.stopButtonText}>Stop</Text>
                      }
                    </TouchableOpacity>
                  )}

                  {lockedByOther && (
                    <MaterialCommunityIcons name="lock" size={24} color="#FF4500" />
                  )}
                </TouchableOpacity>
              );
            }}
          />
        )}

        {/* Check In / Check Out Modal (via card tap) */}
        <Modal visible={modalVisible} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <Text style={styles.modalTitle}>{selected?.id}</Text>
              <Text style={styles.modalSubtitle}>
                Current Status: {selected?.status}
              </Text>

              {selected?.status === "AVAILABLE" && !currentSession && (
                <Pressable
                  style={styles.button}
                  onPress={() => handleCheckIn(selected!.code)}
                  disabled={busyCode === selected?.code}
                >
                  <Text style={styles.buttonText}>Check In</Text>
                </Pressable>
              )}

              {selected?.status === "AVAILABLE" && currentSession && currentSession.machineId !== selected?.code && (
                <Text style={styles.modalSubtitle}>
                  You are already using equipment.
                </Text>
              )}

              {selected?.status === "IN_USE" && selected?.heldByMe && (
                <Pressable
                  style={styles.button}
                  onPress={() => {
                    setModalVisible(false);
                    handleStopPress(selected!.code);
                  }}
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

        {/* Workout Details Modal (shown before stopping) */}
        <Modal visible={workoutDetailsVisible} transparent animationType="slide">
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={{ flex: 1 }}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContainer}>
                <Text style={styles.modalTitle}>Log Workout</Text>
                <Text style={styles.modalSubtitle}>Optional — fill in what you did</Text>

                <ScrollView style={{ width: "100%" }} showsVerticalScrollIndicator={false}>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Sets</Text>
                    <TextInput
                      style={styles.input}
                      keyboardType="numeric"
                      placeholder="e.g. 3"
                      placeholderTextColor="#aaa"
                      value={setsInput}
                      onChangeText={setSetsInput}
                      maxLength={3}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Reps per set</Text>
                    <TextInput
                      style={styles.input}
                      keyboardType="numeric"
                      placeholder="e.g. 10"
                      placeholderTextColor="#aaa"
                      value={repsInput}
                      onChangeText={setRepsInput}
                      maxLength={3}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Weight (lbs)</Text>
                    <TextInput
                      style={styles.input}
                      keyboardType="decimal-pad"
                      placeholder="e.g. 45"
                      placeholderTextColor="#aaa"
                      value={weightInput}
                      onChangeText={setWeightInput}
                      maxLength={6}
                    />
                  </View>
                </ScrollView>

                <Pressable style={styles.button} onPress={handleStopConfirm}>
                  <Text style={styles.buttonText}>Save & Stop</Text>
                </Pressable>

                <Pressable
                  style={[styles.button, styles.cancelButton]}
                  onPress={handleStopConfirm}
                >
                  <Text style={styles.cancelText}>Skip & Stop</Text>
                </Pressable>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
        {/* History Modal */}
        <Modal visible={historyVisible} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <Text style={styles.modalTitle}>Recent Sessions</Text>
              <Text style={styles.modalSubtitle}>{name} — last 3 sessions</Text>

              {historyLoading ? (
                <ActivityIndicator size="large" color="#4CAF50" style={{ marginVertical: 20 }} />
              ) : recentSessions.length === 0 ? (
                <Text style={styles.emptyHistory}>No past sessions for this exercise yet.</Text>
              ) : (
                recentSessions.map((s) => {
                  const date = new Date(s.startedAt);
                  const dateStr = date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
                  const timeStr = date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
                  const mins = Math.floor(s.durationSeconds / 60);
                  const secs = s.durationSeconds % 60;
                  const durStr = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
                  const sets = s.setDetails?.length ?? 0;

                  return (
                    <View key={s.id} style={styles.historyCard}>
                      <View style={styles.historyCardRow}>
                        <MaterialCommunityIcons name="calendar" size={16} color="#4CAF50" />
                        <Text style={styles.historyDate}>{dateStr} · {timeStr}</Text>
                      </View>
                      <View style={styles.historyCardRow}>
                        <MaterialCommunityIcons name="clock-outline" size={16} color="#666" />
                        <Text style={styles.historyMeta}>{durStr}</Text>
                        {s.machineName ? (
                          <>
                            <Text style={styles.historyDot}>·</Text>
                            <MaterialCommunityIcons name="dumbbell" size={16} color="#666" />
                            <Text style={styles.historyMeta}>{s.machineName}</Text>
                          </>
                        ) : null}
                      </View>
                      {sets > 0 && (
                        <View style={{ gap: 2, marginTop: 2 }}>
                          {s.setDetails!.map((d) => (
                            <View key={d.setNumber} style={styles.historyCardRow}>
                              <MaterialCommunityIcons name="repeat" size={16} color="#666" />
                              <Text style={styles.historyMeta}>
                                Set {d.setNumber}
                                {d.reps != null ? `: ${d.reps} reps` : ""}
                                {d.weightLbs != null ? ` · ${d.weightLbs} lbs` : ""}
                              </Text>
                            </View>
                          ))}
                        </View>
                      )}
                    </View>
                  );
                })
              )}

              <Pressable
                style={[styles.button, styles.cancelButton, { marginTop: 16 }]}
                onPress={() => setHistoryVisible(false)}
              >
                <Text style={styles.cancelText}>Close</Text>
              </Pressable>
            </View>
          </View>
        </Modal>

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
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, paddingTop: 60 },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    gap: 10,
  },
  title: {
    fontSize: 26,
    color: "#1a1a1a",
    fontWeight: "900",
    textAlign: "center",
    textTransform: "capitalize",
    flexShrink: 1,
  },
  historyButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#E8F5E9",
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: "#4CAF50",
  },
  historyButtonText: { color: "#4CAF50", fontWeight: "700", fontSize: 13 },
  historyCard: {
    width: "100%",
    backgroundColor: "#f9f9f9",
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    gap: 6,
  },
  historyCardRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  historyDate: { color: "#1a1a1a", fontWeight: "700", fontSize: 13 },
  historyMeta: { color: "#555", fontSize: 13 },
  historyDot: { color: "#bbb", fontSize: 13 },
  emptyHistory: { color: "#999", fontSize: 15, textAlign: "center", marginVertical: 20 },
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

  // Start / Stop inline buttons
  startButton: {
    backgroundColor: "#4CAF50",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    minWidth: 64,
    alignItems: "center",
  },
  startButtonText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  stopButton: {
    backgroundColor: "#FF5722",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    minWidth: 64,
    alignItems: "center",
  },
  stopButtonText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  locateBtn: {
    backgroundColor: "#e8f5e9",
    borderRadius: 12,
    padding: 8,
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
    width: "100%",
    alignItems: "center",
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

  // Workout details inputs
  inputGroup: {
    width: "100%",
    marginBottom: 16,
  },
  inputLabel: {
    color: "#333",
    fontWeight: "600",
    fontSize: 14,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1.5,
    borderColor: "#ccc",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    fontSize: 16,
    color: "#1a1a1a",
    backgroundColor: "#fafafa",
  },
});
