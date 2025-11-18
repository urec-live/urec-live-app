import {
  getMachinesForExercise,
  Machine,
  Status,
} from "@/constants/equipment-data";
import { useWorkout } from "@/contexts/WorkoutContext";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function EquipmentAvailability() {
  const { exercise, muscle } = useLocalSearchParams();
  const name = (exercise as string) || "Bench Press";
  const muscleGroup = (muscle as string) || "Chest";
  const router = useRouter();

  const {
    checkIn,
    checkOut,
    reserveMachine,
    cancelReservation,
    hasActiveEngagement,
    reservedMachineId,
    isUserCheckedIntoMachine,
    isMachineInUseByOther,
  } = useWorkout();

  const [machines, setMachines] = useState<Machine[]>([]);
  const [selected, setSelected] = useState<Machine | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    setMachines(getMachinesForExercise(name));
  }, [name]);

  // NEW/UPDATED handlers
  const updateStatus = (id: string, newStatus: Status) => {
    const updatedMachines = machines.map((m) =>
      m.id === id ? { ...m, status: newStatus } : m
    );
    setMachines(updatedMachines);
    setModalVisible(false);
  };
  
  const handleReserve = (machineId: string) => {
    reserveMachine(machineId); // Update context
    updateStatus(machineId, "Reserved"); // Update local state for visual effect
  };

  const handleCancelReservation = (machineId: string) => {
    // FIX: Corrected logic to prevent infinite recursion
    cancelReservation(); // Update context to clear reservedMachineId
    updateStatus(machineId, "Available"); // Update local state for visual effect and close modal
  };

  const handleCheckIn = (machineId: string) => {
    checkIn(name, machineId, muscleGroup);
    updateStatus(machineId, "In Use");
  };

  const handleCheckOut = (machineId: string) => {
    checkOut();
    updateStatus(machineId, "Available");
    // Navigate back to exercises page
    router.back();
  };

  const openModal = (machine: Machine) => {
    const isMyReservation = machine.id === reservedMachineId;
    const hasOtherActiveEngagement =
      hasActiveEngagement() && !isUserCheckedIntoMachine(machine.id) && !isMyReservation;

    // Prevent opening modal if another machine is actively engaged (in use or reserved by user)
    if (isMachineInUseByOther(machine.id) || hasOtherActiveEngagement) {
      return;
    }
    
    setSelected(machine);
    setModalVisible(true);
  };


  return (
    <LinearGradient colors={["#000", "#1a1a1a", "#000"]} style={{ flex: 1 }}>
      <View style={styles.container}>
        <Text style={styles.title}>{name} Machines</Text>

        <FlatList
          data={machines}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const isMyMachine = isUserCheckedIntoMachine(item.id);
            const isMyReservation = item.id === reservedMachineId; 
            const isOtherUserMachine = isMachineInUseByOther(item.id);
            
            // This flag determines if the user is prevented from taking action on this machine.
            const hasOtherActiveEngagement = hasActiveEngagement() && !isMyMachine && !isMyReservation;
            
            const isClickable = item.status === "Available" || isMyMachine || isMyReservation;
            
            // FIX: Condition for visual disabling covers machines in use by others 
            // OR machines off-limits due to current user's active engagement.
            const shouldBeVisuallyDisabled = isOtherUserMachine || (hasOtherActiveEngagement && !isClickable); 

            return (
              <TouchableOpacity
                style={[
                  styles.card,
                  item.status === "Available"
                    ? styles.available
                    : item.status === "In Use"
                    ? isMyMachine
                      ? styles.myMachine
                      : styles.inUse
                    : item.status === "Reserved" && isMyReservation 
                      ? styles.reserved
                      : styles.reserved,
                  shouldBeVisuallyDisabled && styles.disabled, // <-- APPLIED visual disable
                ]}
                onPress={() => openModal(item)}
                disabled={!isClickable} 
              >
                <MaterialCommunityIcons
                  name="weight-lifter"
                  size={32}
                  color={
                    item.status === "Available"
                      ? "#00FF7F"
                      : isMyMachine
                      ? "#00FF7F"
                      : isMyReservation
                      ? "#FFA500"
                      : "#FFD700"
                  }
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.machineText}>{item.id}</Text>
                  <Text style={styles.statusText}>
                    {isMyMachine ? "Your Machine" : isMyReservation ? "Your Reservation" : item.status}
                  </Text>
                </View>
                {(isOtherUserMachine || (item.status === "Reserved" && !isMyReservation)) && (
                  <MaterialCommunityIcons name="lock" size={24} color="#FF4500" />
                )}
              </TouchableOpacity>
            );
          }}
        />

        {/* Modal */}
        <Modal visible={modalVisible} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <Text style={styles.modalTitle}>{selected?.id}</Text>
              <Text style={styles.modalSubtitle}>
                Current Status: {selected?.status}
              </Text>

              {/* Logic for an AVAILABLE machine */}
              {selected?.status === "Available" && !hasActiveEngagement() && ( 
                <>
                  <Pressable
                    style={styles.button}
                    onPress={() => handleReserve(selected!.id)} 
                  >
                    <Text style={styles.buttonText}>Reserve</Text>
                  </Pressable>
                  <Pressable
                    style={styles.button}
                    onPress={() => handleCheckIn(selected!.id)}
                  >
                    <Text style={styles.buttonText}>Check In</Text>
                  </Pressable>
                </>
              )}

              {/* Logic for MY RESERVED machine */}
              {selected?.status === "Reserved" && selected.id === reservedMachineId && ( 
                <>
                  <Pressable
                    style={styles.button}
                    onPress={() => handleCheckIn(selected!.id)}
                  >
                    <Text style={styles.buttonText}>Check In</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.button, styles.cancelButton]}
                    onPress={() => handleCancelReservation(selected!.id)} 
                  >
                    <Text style={styles.cancelText}>Cancel Reservation</Text>
                  </Pressable>
                </>
              )}
              
              {/* Logic for an AVAILABLE machine, but user is checked into *another* machine */}
              {selected?.status === "Available" && hasActiveEngagement() && !isUserCheckedIntoMachine(selected!.id) && (
                  <Text style={styles.modalSubtitle}>
                    You are already using or have reserved equipment.
                  </Text>
              )}


              {/* Logic for MY CHECKED-IN machine */}
              {selected?.status === "In Use" &&
                isUserCheckedIntoMachine(selected!.id) && (
                  <Pressable
                    style={styles.button}
                    onPress={() => handleCheckOut(selected!.id)}
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
    color: "#00ff88",
    fontWeight: "900",
    textAlign: "center",
    marginBottom: 20,
    textTransform: "capitalize",
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#003324",
    borderRadius: 10,
    padding: 15,
    marginBottom: 12,
    elevation: 5,
    gap: 15,
  },
  available: { borderColor: "#00ff88", borderWidth: 2 },
  inUse: { borderColor: "#ff6b00", borderWidth: 2 },
  reserved: { borderColor: "#ff0066", borderWidth: 2 },
  myMachine: { borderColor: "#00ff88", borderWidth: 3, backgroundColor: "#009c67" },
  disabled: { opacity: 0.5 },
  machineText: { color: "#00ff88", fontWeight: "700", fontSize: 18 },
  statusText: { color: "#ccc", fontSize: 14 },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    backgroundColor: "#001a14",
    padding: 25,
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    alignItems: "center",
    borderTopWidth: 3,
    borderColor: "#00ff88",
  },
  modalTitle: { color: "#00ff88", fontSize: 24, fontWeight: "900", marginBottom: 10 },
  modalSubtitle: { color: "#ccc", fontSize: 16, marginBottom: 20 },
  button: {
    backgroundColor: "#009c67",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 25,
    marginVertical: 6,
    borderWidth: 2,
    borderColor: "#00ff88",
  },
  buttonText: { color: "#00ff88", fontWeight: "700", fontSize: 16 },
  cancelButton: { backgroundColor: "#001a14", borderWidth: 2, borderColor: "#00ff88" },
  cancelText: { color: "#00ff88", fontWeight: "700", fontSize: 16 },
});