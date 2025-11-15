import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { useWorkout } from "../contexts/WorkoutContext";

export default function DailyWorkoutSummary() {
  const { todayWorkouts } = useWorkout();
  const [modalVisible, setModalVisible] = useState(false);

  // Count unique muscle groups
  const muscleGroups = new Set(todayWorkouts.map((w) => w.muscleGroup));
  const exerciseCount = todayWorkouts.length;
  const muscleGroupCount = muscleGroups.size;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const formatDuration = (startTime: number, endTime?: number) => {
    if (!endTime) return "In Progress";
    const seconds = Math.floor((endTime - startTime) / 1000);
    return formatTime(seconds);
  };

  if (exerciseCount === 0) return null;

  return (
    <>
      <TouchableOpacity
        style={styles.container}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.8}
      >
        <MaterialCommunityIcons name="trophy" size={18} color="#00ff88" />
        <Text style={styles.text}>
          {exerciseCount} exercise{exerciseCount !== 1 ? "s" : ""} • {muscleGroupCount}{" "}
          muscle group{muscleGroupCount !== 1 ? "s" : ""}
        </Text>
        <MaterialCommunityIcons name="chevron-down" size={18} color="#00ff88" />
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleRow}>
                <MaterialCommunityIcons name="trophy" size={24} color="#00ff88" />
                <Text style={styles.modalTitle}>Today&apos;s Workouts</Text>
              </View>
              <Pressable onPress={() => setModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={24} color="#00ff88" />
              </Pressable>
            </View>

            <View style={styles.modalSummary}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>{exerciseCount}</Text>
                <Text style={styles.summaryLabel}>
                  Exercise{exerciseCount !== 1 ? "s" : ""}
                </Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>{muscleGroupCount}</Text>
                <Text style={styles.summaryLabel}>
                  Muscle Group{muscleGroupCount !== 1 ? "s" : ""}
                </Text>
              </View>
            </View>

            <ScrollView style={styles.workoutList}>
              {todayWorkouts.map((workout, index) => (
                <View key={index} style={styles.workoutCard}>
                  <View style={styles.workoutHeader}>
                    <MaterialCommunityIcons
                      name="dumbbell"
                      size={20}
                      color="#00ff88"
                    />
                    <Text style={styles.exerciseName}>{workout.exerciseName}</Text>
                  </View>
                  <View style={styles.workoutDetails}>
                    <View style={styles.detailRow}>
                      <MaterialCommunityIcons
                        name="weight-lifter"
                        size={16}
                        color="#ccc"
                      />
                      <Text style={styles.detailText}>{workout.machineId}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <MaterialCommunityIcons
                        name="arm-flex"
                        size={16}
                        color="#ccc"
                      />
                      <Text style={styles.detailText}>{workout.muscleGroup}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <MaterialCommunityIcons name="timer" size={16} color="#00ff88" />
                      <Text style={styles.durationText}>
                        {formatDuration(workout.startTime, workout.endTime)}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </ScrollView>

            <Pressable
              style={styles.closeButton}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "rgba(0, 156, 103, 0.95)",
    borderRadius: 15,
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 2,
    borderColor: "#00ff88",
    margin: 10,
  },
  text: {
    fontSize: 14,
    fontWeight: "700",
    color: "#00ff88",
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "center",
    padding: 20,
  },
  modalContainer: {
    backgroundColor: "#001a14",
    borderRadius: 20,
    padding: 20,
    maxHeight: "80%",
    borderWidth: 2,
    borderColor: "#00ff88",
    elevation: 5,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
  },
  modalTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: "#00ff88",
  },
  modalSummary: {
    flexDirection: "row",
    justifyContent: "space-around",
    padding: 15,
    backgroundColor: "#005035",
    borderRadius: 15,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#00ff88",
  },
  summaryItem: {
    alignItems: "center",
    flex: 1,
  },
  summaryValue: {
    fontSize: 28,
    fontWeight: "900",
    color: "#00ff88",
    marginBottom: 5,
  },
  summaryLabel: {
    fontSize: 12,
    color: "#ccc",
    textAlign: "center",
  },
  divider: {
    width: 1,
    backgroundColor: "#333",
    marginHorizontal: 15,
  },
  workoutList: {
    maxHeight: 300,
  },
  workoutCard: {
    backgroundColor: "#003324",
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#00ff88",
    borderWidth: 1,
    borderColor: "#00ff88",
  },
  workoutHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  exerciseName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#00ff88",
  },
  workoutDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    color: "#ccc",
  },
  durationText: {
    fontSize: 14,
    color: "#00ff88",
    fontWeight: "600",
  },
  closeButton: {
    backgroundColor: "#009c67",
    borderWidth: 2,
    borderColor: "#00ff88",
    borderRadius: 12,
    padding: 15,
    alignItems: "center",
    marginTop: 15,
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#00ff88",
  },
});
