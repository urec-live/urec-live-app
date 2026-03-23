import { useWorkout } from "@/contexts/WorkoutContext";
import { machineAPI } from "@/services/machineAPI";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

interface SetRow {
  reps: string;
  weightLbs: string;
}

export default function ActiveExerciseTracker() {
  const { currentSession, exerciseStartTime, restStartTime, startRest, endRest, checkOut } =
    useWorkout();
  const router = useRouter();

  const [exerciseElapsed, setExerciseElapsed] = useState(0);
  const [restElapsed, setRestElapsed] = useState(0);
  const [setRows, setSetRows] = useState<SetRow[]>([{ reps: "", weightLbs: "" }]);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (!exerciseStartTime) return;
    const interval = setInterval(() => {
      setExerciseElapsed(Math.floor((Date.now() - exerciseStartTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [exerciseStartTime]);

  useEffect(() => {
    if (!restStartTime) {
      setRestElapsed(0);
      return;
    }
    const interval = setInterval(() => {
      setRestElapsed(Math.floor((Date.now() - restStartTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [restStartTime]);

  if (!currentSession) return null;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const updateRow = (index: number, field: keyof SetRow, value: string) => {
    setSetRows(prev => prev.map((row, i) => i === index ? { ...row, [field]: value } : row));
  };

  const addSet = () => {
    setSetRows(prev => [...prev, { reps: "", weightLbs: "" }]);
    // Scroll to bottom after new row renders
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
  };

  const hasDetails = setRows.some(r => r.reps.trim() !== "" || r.weightLbs.trim() !== "");

  const doEnd = async () => {
    const targetMuscleGroup = currentSession.muscleGroup;
    const setDetails = setRows
      .map(r => ({
        reps: r.reps.trim() ? parseInt(r.reps, 10) : undefined,
        weightLbs: r.weightLbs.trim() ? parseFloat(r.weightLbs) : undefined,
      }))
      .filter(s => s.reps !== undefined || s.weightLbs !== undefined);

    try {
      await machineAPI.checkOut(currentSession.machineId);
    } catch {
      // If checkout fails (offline/conflict), keep local flow usable.
    }
    checkOut(setDetails.length > 0 ? { setDetails } : undefined);
    setTimeout(() => {
      router.replace(`/workout/exercises/${targetMuscleGroup}`);
    }, 0);
  };

  const handleEndWorkout = async () => {
    if (Platform.OS === "web") {
      if (!hasDetails) {
        const skipDetails = window.confirm(
          "No workout details entered (reps/weight). End without saving them?"
        );
        if (!skipDetails) return;
      }
      if (window.confirm("End Workout — Are you sure?")) await doEnd();
    } else {
      if (!hasDetails) {
        Alert.alert(
          "No Workout Details",
          "You haven't entered reps or weight for any set. End without saving them?",
          [
            { text: "Go Back", style: "cancel" },
            {
              text: "End Anyway",
              style: "destructive",
              onPress: () =>
                Alert.alert("End Workout", "Are you sure?", [
                  { text: "Cancel", style: "cancel" },
                  { text: "End", onPress: doEnd },
                ]),
            },
          ]
        );
      } else {
        Alert.alert("End Workout", "Are you sure you want to end this workout?", [
          { text: "Cancel", style: "cancel" },
          { text: "End", onPress: doEnd },
        ]);
      }
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <MaterialCommunityIcons name="dumbbell" size={20} color="#00ff88" />
        <Text style={styles.exerciseName}>{currentSession.exerciseName}</Text>
      </View>

      <View style={styles.timers}>
        <View style={styles.timerSection}>
          <Text style={styles.timerLabel}>Exercise Time</Text>
          <Text style={styles.timerValue}>{formatTime(exerciseElapsed)}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.timerSection}>
          <Text style={styles.timerLabel}>Rest Time</Text>
          <Text style={styles.timerValue}>{formatTime(restElapsed)}</Text>
        </View>
      </View>

      {/* Per-set rows */}
      <View style={styles.setsContainer}>
        {/* Column headers */}
        <View style={styles.setHeaderRow}>
          <Text style={[styles.colHeader, styles.colSet]} />
          <Text style={[styles.colHeader, styles.colReps]}>Reps</Text>
          <Text style={[styles.colHeader, styles.colWeight]}>Weight (lbs)</Text>
        </View>

        <ScrollView
          ref={scrollRef}
          style={styles.setScroll}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled
        >
          {setRows.map((row, index) => (
            <View key={index} style={styles.setRow}>
              <Text style={styles.setLabel}>Set {index + 1}</Text>
              <TextInput
                style={[styles.setInput, styles.colReps]}
                value={row.reps}
                onChangeText={v => updateRow(index, "reps", v)}
                keyboardType="numeric"
                placeholder="—"
                placeholderTextColor="#444"
                maxLength={3}
              />
              <TextInput
                style={[styles.setInput, styles.colWeight]}
                value={row.weightLbs}
                onChangeText={v => updateRow(index, "weightLbs", v)}
                keyboardType="decimal-pad"
                placeholder="—"
                placeholderTextColor="#444"
                maxLength={6}
              />
            </View>
          ))}
        </ScrollView>

        {/* Add set button */}
        <TouchableOpacity style={styles.addSetButton} onPress={addSet}>
          <MaterialCommunityIcons name="plus" size={16} color="#00ff88" />
          <Text style={styles.addSetText}>Add Set</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.buttons}>
        {!restStartTime ? (
          <TouchableOpacity style={styles.restButton} onPress={startRest}>
            <MaterialCommunityIcons name="pause" size={16} color="#000" />
            <Text style={styles.buttonText}>Start Rest</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.resumeButton} onPress={endRest}>
            <MaterialCommunityIcons name="play" size={16} color="#000" />
            <Text style={styles.buttonText}>End Rest</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.endButton} onPress={handleEndWorkout}>
          <MaterialCommunityIcons name="stop" size={16} color="#fff" />
          <Text style={styles.endButtonText}>End Workout</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#001a14",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 15,
    borderTopWidth: 3,
    borderColor: "#00ff88",
    elevation: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 8,
  },
  exerciseName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#00ff88",
  },
  timers: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 12,
  },
  timerSection: {
    alignItems: "center",
    flex: 1,
  },
  timerLabel: {
    fontSize: 12,
    color: "#ccc",
    marginBottom: 4,
  },
  timerValue: {
    fontSize: 24,
    fontWeight: "900",
    color: "#00ff88",
  },
  divider: {
    width: 1,
    backgroundColor: "#333",
    marginHorizontal: 10,
  },

  // Sets section
  setsContainer: {
    backgroundColor: "#002a1e",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#004d38",
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 4,
  },
  setHeaderRow: {
    flexDirection: "row",
    marginBottom: 4,
  },
  colHeader: {
    fontSize: 10,
    color: "#888",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    fontWeight: "600",
    textAlign: "center",
  },
  setScroll: {
    maxHeight: 140,
  },
  setRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 5,
    borderTopWidth: 1,
    borderTopColor: "#004d38",
  },
  setLabel: {
    color: "#888",
    fontSize: 12,
    fontWeight: "600",
    width: 44,
  },
  setInput: {
    color: "#00ff88",
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
    paddingVertical: 2,
    borderBottomWidth: 1,
    borderBottomColor: "#004d38",
  },
  // Column widths shared between header and rows
  colSet: { width: 44 },
  colReps: { flex: 1, marginHorizontal: 4 },
  colWeight: { flex: 1.5, marginHorizontal: 4 },

  addSetButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    gap: 4,
    borderTopWidth: 1,
    borderTopColor: "#004d38",
    marginTop: 2,
  },
  addSetText: {
    color: "#00ff88",
    fontSize: 13,
    fontWeight: "700",
  },

  buttons: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
  },
  restButton: {
    flexDirection: "row",
    backgroundColor: "#009c67",
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: "center",
    gap: 6,
    borderWidth: 2,
    borderColor: "#00ff88",
  },
  resumeButton: {
    flexDirection: "row",
    backgroundColor: "#00ff88",
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: "center",
    gap: 6,
    borderWidth: 2,
    borderColor: "#00ff88",
  },
  buttonText: {
    color: "#001a14",
    fontWeight: "900",
    fontSize: 14,
  },
  endButton: {
    flexDirection: "row",
    backgroundColor: "#ff4444",
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: "center",
    gap: 6,
    borderWidth: 2,
    borderColor: "#ff6666",
  },
  endButtonText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 14,
  },
});
