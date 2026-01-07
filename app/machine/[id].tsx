import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { machineAPI, Machine } from "@/services/machineAPI";
import { getMachineExercises } from "@/constants/equipment-data";

export default function MachineDetails() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [machine, setMachine] = useState<Machine | null>(null);
  const [status, setStatus] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    loadMachine();
  }, [id]);

  const loadMachine = async () => {
    try {
      setLoading(true);
      const data = await machineAPI.getMachineById(Number(id));
      setMachine(data);
      setStatus(data.status);
    } catch (error) {
      console.error("Error loading machine:", error);
      Alert.alert("Error", "Failed to load machine details");
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action: string) => {
    if (!machine) return;

    let newStatus = "";
    if (action === "checkin") newStatus = "In Use";
    if (action === "end") newStatus = "Available";

    try {
      setUpdating(true);
      const updated = await machineAPI.updateMachineStatus(machine.id, newStatus);
      setStatus(updated.status);
      setMachine(updated);
      Alert.alert("Success", `Machine status updated to ${newStatus}`);
    } catch (error) {
      console.error("Error updating machine:", error);
      Alert.alert("Error", "Failed to update machine status");
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Loading machine details...</Text>
      </View>
    );
  }

  if (!machine) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.errorText}>Machine not found</Text>
        <TouchableOpacity style={styles.button} onPress={() => router.back()}>
          <Text style={styles.buttonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const statusLower = status.toLowerCase();

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>

      <Text style={styles.title}>{machine.name}</Text>
      <Text style={[styles.status, { color: getStatusColor(status) }]}>
        {status.toUpperCase()}
      </Text>

      <TouchableOpacity style={styles.scanButton} onPress={() => router.push("/scan")}>
        <Text style={styles.scanButtonText}>Scan QR to Check In</Text>
      </TouchableOpacity>

      {machine.exercise && (() => {
        const machineExercises = getMachineExercises(machine.exercise);
        return machineExercises ? (
          <View style={styles.exercisesContainer}>
            <Text style={styles.muscleGroupTitle}>MUSCLE GROUP</Text>
            <Text style={styles.muscleGroupText}>{machineExercises.muscleGroup}</Text>
            
            <Text style={styles.relatedExercisesTitle}>RELATED EXERCISES</Text>
            <Text style={styles.relatedExercisesText}>
              {machineExercises.exercises.join(", ")}
            </Text>
          </View>
        ) : null;
      })()}

      <View style={styles.buttons}>
        {statusLower === "in use" && (
          <TouchableOpacity
            style={[styles.button, styles.goldButton, updating && styles.buttonDisabled]}
            onPress={() => handleAction("end")}
            disabled={updating}
          >
            {updating ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Text style={styles.buttonText}>END SESSION</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const getStatusColor = (status: string) => {
  const statusLower = status.toLowerCase();
  switch (statusLower) {
    case "available":
      return "#4CAF50";
    case "in use":
      return "#FF5722";
    default:
      return "#999";
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    padding: 25,
  },
  backButton: {
    marginBottom: 20,
  },
  backText: {
    color: "#4CAF50",
    fontWeight: "700",
    fontSize: 16,
  },
  title: {
    color: "#1a1a1a",
    fontSize: 28,
    fontWeight: "900",
    textAlign: "center",
    marginBottom: 10,
  },
  status: {
    textAlign: "center",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 40,
  },
  buttons: {
    alignItems: "center",
  },
  button: {
    width: "70%",
    paddingVertical: 15,
    borderRadius: 35,
    marginBottom: 15,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  goldButton: {
    backgroundColor: "#4CAF50",
  },
  buttonText: {
    color: "#ffffff",
    fontWeight: "800",
    fontSize: 16,
    letterSpacing: 1,
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
  errorText: {
    color: "#FF3B30",
    fontSize: 18,
    marginBottom: 20,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  exercise: {
    color: "#666",
    fontSize: 16,
    textAlign: "center",
    marginBottom: 30,
  },
  exercisesContainer: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 20,
    marginBottom: 30,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  muscleGroupTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#666",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  muscleGroupText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#4CAF50",
    marginBottom: 16,
  },
  relatedExercisesTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#666",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  relatedExercisesText: {
    fontSize: 14,
    color: "#1a1a1a",
    lineHeight: 20,
  },
  scanButton: {
    backgroundColor: "#4CAF50",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderWidth: 2,
    borderColor: "#2e7d32",
    marginBottom: 20,
    alignItems: "center",
  },
  scanButtonText: {
    color: "#ffffff",
    fontWeight: "900",
    fontSize: 14,
  },
});
