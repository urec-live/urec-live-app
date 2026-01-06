import { MachineDto, machineAPI } from "@/services/machineAPI";
import { useWorkout } from "@/contexts/WorkoutContext";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
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

  const { checkIn, checkOut } = useWorkout();

  const [machines, setMachines] = useState<MachineDto[]>([]);
  const [selected, setSelected] = useState<MachineDto | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [myEngagement, setMyEngagement] = useState<MachineDto | null>(null);
  const [busyCode, setBusyCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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
      } catch (error) {
        console.error('Error loading machines:', error);
        setMachines([]);
      } finally {
        setLoading(false);
      }
    };
    load();

    // Subscribe to WebSocket updates
    const unsubscribe = websocketService.subscribe((updatedMachine) => {
      console.log('[Workout Equipment] Received machine update:', updatedMachine);
      // Only update if the machine belongs to this exercise
      if (updatedMachine.exercise?.toLowerCase() === name.toLowerCase()) {
        setMachines(prev => 
          prev.map(m => m.id === updatedMachine.id ? updatedMachine : m)
        );
      }
    });

    return () => {
      unsubscribe();
    };
  }, [name]);

  const refresh = async () => {
    try {
      setRefreshing(true);
      const [ms, me] = await Promise.all([
        machineAPI.getByExercise(name),
        machineAPI.getMyEngagement().catch(() => null),
      ]);
      setMachines(ms);
      setMyEngagement(me);
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

  const handleCheckOut = async (code: string) => {
    setBusyCode(code);
    try {
      await machineAPI.checkOut(code);
      checkOut();
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


  return (
    <LinearGradient colors={["#ffffff", "#f5f5f5", "#ffffff"]} style={{ flex: 1 }}>
      <View style={styles.container}>
        <Text style={styles.title}>{name} Machines</Text>
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
          contentContainerStyle={{ paddingRight: 8 }}
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
                  <Text style={styles.statusText}>
                    {item.heldByMe && item.status === "IN_USE"
                      ? "Your Machine"
                      : statusLabel}
                  </Text>
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
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: "#4CAF50",
    fontSize: 16,
    marginTop: 10,
  },
});
