import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  getMachinesForExercise,
  Machine,
  Status,
} from "../../../constants/equipment-data";
import { useWorkout } from "../../../contexts/WorkoutContext";

export default function EquipmentAvailability() {
  const { exercise, muscle } = useLocalSearchParams();
  const name = (exercise as string) || "Bench Press";
  const muscleGroup = (muscle as string) || "Chest";
  const router = useRouter();

  const {
    checkIn,
    checkOut,
    isUserCheckedIntoMachine,
    isMachineInUseByOther,
  } = useWorkout();

  const [machines, setMachines] = useState<Machine[]>([]);
  const [selected, setSelected] = useState<Machine | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    setMachines(getMachinesForExercise(name));
  }, [name]);

  const updateStatus = (id: string, newStatus: Status) => {
    const updatedMachines = machines.map((m) =>
      m.id === id ? { ...m, status: newStatus } : m
    );
    setMachines(updatedMachines);
    setModalVisible(false);
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
    // Don't allow opening modal for machines in use by others
    if (machine.status !== "Available" && !isUserCheckedIntoMachine(machine.id)) {
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
            const isOtherUserMachine = isMachineInUseByOther(item.id);
            const isClickable =
              item.status === "Available" || isMyMachine;

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
                    : styles.reserved,
                  !isClickable && styles.disabled,
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
                      : "#FFD700"
                  }
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.machineText}>{item.id}</Text>
                  <Text style={styles.statusText}>
                    {isMyMachine ? "Your Machine" : item.status}
                  </Text>
                </View>
                {isOtherUserMachine && (
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

              {selected?.status === "Available" && (
                <>
                  <Pressable
                    style={styles.button}
                    onPress={() => updateStatus(selected!.id, "Reserved")}
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

              {selected?.status === "In Use" &&
                isUserCheckedIntoMachine(selected!.id) && (
                  <Pressable
                    style={styles.button}
                    onPress={() => handleCheckOut(selected!.id)}
                  >
                    <Text style={styles.buttonText}>End Exercise / Check Out</Text>
                  </Pressable>
                )}

              {selected?.status === "Reserved" && (
                <Pressable
                  style={styles.button}
                  onPress={() => updateStatus(selected!.id, "Available")}
                >
                  <Text style={styles.buttonText}>Cancel Reservation</Text>
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
