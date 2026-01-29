import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { machineAPI, Machine, Exercise, EquipmentWaitTimeEstimate } from "@/services/machineAPI";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useWorkout } from "@/contexts/WorkoutContext";

export default function MachineDetails() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { currentSession } = useWorkout();
  const [machine, setMachine] = useState<Machine | null>(null);
  const [status, setStatus] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [recommendations, setRecommendations] = useState<EquipmentWaitTimeEstimate[]>([]);

  useEffect(() => {
    loadMachine();
  }, [id]);

  const loadMachine = async () => {
    try {
      setLoading(true);
      const data = await machineAPI.getMachineById(Number(id));
      setMachine(data);
      setStatus(data.status);

      // Load exercises and recommendations
      try {
        const [examData, recData] = await Promise.all([
          machineAPI.getExercisesByEquipmentId(Number(id)),
          machineAPI.getRecommendations(Number(id))
        ]);
        setExercises(examData);
        setRecommendations(recData);
      } catch (err) {
        console.error("Error loading details:", err);
      }
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
  const hasActiveSession = Boolean(currentSession);

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>

      <Text style={styles.title}>{machine.name}</Text>
      <Text style={[styles.status, { color: getStatusColor(status) }]}>
        {status.toUpperCase()}
      </Text>

      <TouchableOpacity
        style={styles.scanButton}
        onPress={() => {
          if (hasActiveSession && currentSession) {
            router.push({
              pathname: "/workout/equipment/[exercise]",
              params: {
                exercise: currentSession.exerciseName,
                muscle: currentSession.muscleGroup,
              },
            });
            return;
          }
          router.push("/scan");
        }}
      >
        <Text style={styles.scanButtonText}>
          {hasActiveSession ? "Return to Session" : "Scan QR to Check In"}
        </Text>
      </TouchableOpacity>

      {exercises.length > 0 && (
        <View style={styles.exercisesContainer}>
          <Text style={styles.muscleGroupTitle}>MUSCLE GROUPS</Text>
          <Text style={styles.muscleGroupText}>
            {[...new Set(exercises.map(e => e.muscleGroup))].join(", ")}
          </Text>

          <Text style={styles.relatedExercisesTitle}>EXERCISES</Text>
          <Text style={styles.relatedExercisesText}>
            {exercises.map(e => e.name).join(", ")}
          </Text>
        </View>
      )}

      {recommendations.length > 0 && statusLower !== "available" && (
        <View style={styles.recContainer}>
          <Text style={styles.recTitle}>Try These Instead (Same Muscle Group)</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.recList}>
            {recommendations.map((rec) => (
              <TouchableOpacity
                key={rec.equipmentId}
                style={styles.recCard}
                onPress={() => router.push(`/machine/${rec.equipmentId}`)}
              >
                <View style={[styles.recBadge, { backgroundColor: !rec.inUse ? '#E8F5E9' : '#FFEBEE' }]}>
                  <Text style={[styles.recBadgeText, { color: !rec.inUse ? '#2E7D32' : '#C62828' }]}>
                    {!rec.inUse ? 'OPEN' : `${Math.ceil((rec.estimatedWaitSeconds || 0) / 60)}m Wait`}
                  </Text>
                </View>
                <Text style={styles.recName} numberOfLines={2}>{rec.name}</Text>
                <MaterialCommunityIcons name="arrow-right-circle" size={24} color="#4CAF50" style={{ marginTop: 'auto', alignSelf: 'flex-end' }} />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

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
  recContainer: {
    marginTop: 10,
    marginBottom: 30,
  },
  recTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#666",
    marginBottom: 10,
    textTransform: "uppercase",
  },
  recList: {
    flexDirection: "row",
    overflow: "visible",
  },
  recCard: {
    width: 140,
    height: 120,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    marginRight: 10,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    justifyContent: 'space-between'
  },
  recBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 6
  },
  recBadgeText: {
    fontSize: 10,
    fontWeight: "800",
  },
  recName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 4,
  }
});
