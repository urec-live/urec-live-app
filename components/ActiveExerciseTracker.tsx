import { useWorkout } from "@/contexts/WorkoutContext";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function ActiveExerciseTracker() {
  const { currentSession, exerciseStartTime, restStartTime, startRest, endRest, checkOut } =
    useWorkout();
  const router = useRouter();

  const [exerciseElapsed, setExerciseElapsed] = useState(0);
  const [restElapsed, setRestElapsed] = useState(0);

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
        <TouchableOpacity style={styles.endButton} onPress={() => {
          Alert.alert(
            "End Workout",
            "Are you sure you want to end this workout?",
            [
              { text: "Cancel", style: "cancel" },
              { 
                text: "End", 
                onPress: () => { 
                  // 1. CAPTURE parameter before state change
                  const targetMuscleGroup = currentSession.muscleGroup;
                  
                  // 2. Perform synchronous state cleanup
                  checkOut(); 
                  
                  // 3. DEFERRED NAVIGATION: Use router.replace to navigate cleanly to the specific list screen
                  setTimeout(() => {
                    router.replace(`/workout/exercises/${targetMuscleGroup}`); 
                  }, 0);
                } 
              }
            ]
          );
        }}>
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