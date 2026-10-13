import { HELP_STATUS_DISPLAY } from "@/constants/helpRequests";
import { useHelpRequest } from "@/contexts/HelpRequestContext";
import { useWorkout } from "@/contexts/WorkoutContext";
import { machineAPI } from "@/services/machineAPI";
import { WatchService } from "@/services/watchService";
import { toHelpRequestError } from "@/utils/helpRequestErrors";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { usePathname, useRouter } from "expo-router";
import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";

interface SetRow {
  reps: string;
  weightLbs: string;
}

export default function ActiveExerciseTracker() {
  const { currentSession, exerciseStartTime, restStartTime, startRest, endRest, checkOut } =
    useWorkout();
  const router = useRouter();
  const pathname = usePathname();
  const { activeRequest, callStaff } = useHelpRequest();
  const [callingStaff, setCallingStaff] = useState(false);
  const [helpError, setHelpError] = useState<string | null>(null);

  // --- Restored State ---
  const [exerciseElapsed, setExerciseElapsed] = useState(0);
  const [restElapsed, setRestElapsed] = useState(0);
  const [setRows, setSetRows] = useState<SetRow[]>([{ reps: "", weightLbs: "" }]);
  const scrollRef = useRef<ScrollView>(null);

  // --- Logic: Self-Correcting Anchor Timers ---
  useEffect(() => {
    if (!exerciseStartTime) return;
    const interval = setInterval(() => {
      const now = Date.now();
      setExerciseElapsed(Math.floor((now - exerciseStartTime) / 1000));
      setRestElapsed(restStartTime ? Math.floor((now - restStartTime) / 1000) : 0);
    }, 200);
    return () => clearInterval(interval);
  }, [exerciseStartTime, restStartTime]);

  // --- Logic: Watch Synchronization ---
  useEffect(() => {
    if (!currentSession) return;
    const unsubscribeWatch = WatchService.subscribeToWatch(
      (reps, weight) => {
        // Restored: Logic to handle incoming sets from Watch
        setSetRows(prev => {
          const last = prev[prev.length - 1];
          if (last && last.reps === "" && last.weightLbs === "") {
            const newPrev = [...prev];
            newPrev[newPrev.length - 1] = { reps: reps.toString(), weightLbs: weight.toString() };
            return newPrev;
          }
          return [...prev, { reps: reps.toString(), weightLbs: weight.toString() }];
        });
        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
      },
      (msg) => {
        if (msg.status === 'END') {
          doEnd();
        } else if (msg.status === 'PAUSE') {
          startRest(msg.restStartTime);
        } else if (msg.status === 'START') {
          endRest();
        }
      }
    );
    return () => unsubscribeWatch();
  }, [currentSession, startRest, endRest]);

  // --- Logic: Set Management ---
  const updateRow = (index: number, field: keyof SetRow, value: string) => {
    setSetRows(prev => prev.map((row, i) => i === index ? { ...row, [field]: value } : row));
  };

  const addSet = () => {
    setSetRows(prev => [...prev, { reps: "", weightLbs: "" }]);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
  };

  // --- Logic: Checkout & End Workout ---
  const doEnd = async () => {
    if (!currentSession) return;

    // Notify Watch
    WatchService.syncWorkout(currentSession.exerciseName, currentSession.machineId, "END", {
      exerciseStartTime: exerciseStartTime || Date.now(),
    });

    const setDetails = setRows
      .map(r => ({
        reps: r.reps.trim() ? parseInt(r.reps, 10) : undefined,
        weightLbs: r.weightLbs.trim() ? parseFloat(r.weightLbs) : undefined,
      }))
      .filter(s => s.reps !== undefined || s.weightLbs !== undefined);

    try {
      await machineAPI.checkOut(currentSession.machineId);
    } catch (e) {
      console.log("Checkout network error, continuing local flow");
    }

    const targetMuscleGroup = currentSession.muscleGroup;
    checkOut(setDetails.length > 0 ? { setDetails } : undefined);
    setSetRows([{ reps: "", weightLbs: "" }]);
    
    setTimeout(() => {
      router.replace(`/workout/exercises/${targetMuscleGroup}`);
    }, 0);
  };

  const handleToggleRest = () => {
    if (!currentSession) return;
    const now = Date.now();
    if (!restStartTime) {
      startRest(now);
      WatchService.syncWorkout(currentSession.exerciseName, currentSession.machineId, "PAUSE", {
        exerciseStartTime: exerciseStartTime!,
        restStartTime: now,
      });
    } else {
      endRest();
      WatchService.syncWorkout(currentSession.exerciseName, currentSession.machineId, "START", {
        exerciseStartTime: exerciseStartTime!,
        restStartTime: 0,
      });
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  if (!currentSession) return null;
  // Stays mounted (so entered sets survive) but out of the way on the help request and demo screens
  if (pathname === "/help-request" || pathname === "/demo-player") return null;

  const handleHelp = async () => {
    if (activeRequest) {
      router.push("/help-request");
      return;
    }
    setCallingStaff(true);
    setHelpError(null);
    try {
      // machineId holds the QR code; the server ignores an exercise name that is really the code
      await callStaff({ equipmentCode: currentSession.machineId, exerciseName: currentSession.exerciseName });
      router.push("/help-request");
    } catch (e) {
      const { message, alreadyOpen } = toHelpRequestError(e, "call");
      if (alreadyOpen) router.push("/help-request");
      else setHelpError(message);
    } finally {
      setCallingStaff(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <MaterialCommunityIcons name="dumbbell" size={20} color="#00ff88" />
        <Text style={styles.exerciseName}>{currentSession.exerciseName}</Text>
        <TouchableOpacity
          style={styles.helpPill}
          onPress={handleHelp}
          disabled={callingStaff}
          accessibilityRole="button"
          accessibilityLabel={activeRequest ? "View your help request" : "Call staff for help"}
        >
          <MaterialCommunityIcons name="face-agent" size={14} color="#001a14" />
          <Text style={styles.helpPillText}>
            {activeRequest ? `Help: ${HELP_STATUS_DISPLAY[activeRequest.status].label}` : "Call staff"}
          </Text>
        </TouchableOpacity>
      </View>
      {helpError && <Text style={styles.helpError}>{helpError}</Text>}

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

      {/* Restored: Set Input Table */}
      <View style={styles.setsContainer}>
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
              />
              <TextInput
                style={[styles.setInput, styles.colWeight]}
                value={row.weightLbs}
                onChangeText={v => updateRow(index, "weightLbs", v)}
                keyboardType="decimal-pad"
                placeholder="—"
                placeholderTextColor="#444"
              />
            </View>
          ))}
        </ScrollView>

        <TouchableOpacity style={styles.addSetButton} onPress={addSet}>
          <MaterialCommunityIcons name="plus" size={16} color="#00ff88" />
          <Text style={styles.addSetText}>Add Set</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.buttons}>
        <TouchableOpacity 
          style={!restStartTime ? styles.restButton : styles.resumeButton} 
          onPress={handleToggleRest}
        >
          <MaterialCommunityIcons name={!restStartTime ? "pause" : "play"} size={16} color="#000" />
          <Text style={styles.buttonText}>{!restStartTime ? "Start Rest" : "End Rest"}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.endButton} onPress={() => {
            Alert.alert("End Workout", "Are you sure?", [
                { text: "Cancel", style: "cancel" },
                { text: "End", onPress: doEnd }
            ]);
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
    position: "absolute", bottom: 0, left: 0, right: 0,
    backgroundColor: "#001a14", borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 15, borderTopWidth: 3, borderColor: "#00ff88", elevation: 8,
  },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 12, gap: 8 },
  exerciseName: { flex: 1, fontSize: 18, fontWeight: "700", color: "#00ff88" },
  helpPill: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#00ff88", borderRadius: 14, paddingVertical: 4, paddingHorizontal: 10 },
  helpPillText: { color: "#001a14", fontWeight: "800", fontSize: 12 },
  helpError: { color: "#ff8a80", fontSize: 12, marginTop: -6, marginBottom: 8 },
  timers: { flexDirection: "row", justifyContent: "space-around", marginBottom: 12 },
  timerSection: { alignItems: "center", flex: 1 },
  timerLabel: { fontSize: 12, color: "#ccc" },
  timerValue: { fontSize: 24, fontWeight: "900", color: "#00ff88" },
  divider: { width: 1, backgroundColor: "#333", marginHorizontal: 10 },
  setsContainer: {
    backgroundColor: "#002a1e", borderRadius: 12, borderWidth: 1, borderColor: "#004d38",
    marginBottom: 12, paddingHorizontal: 12, paddingTop: 8, paddingBottom: 4,
  },
  setHeaderRow: { flexDirection: "row", marginBottom: 4 },
  colHeader: { fontSize: 10, color: "#888", fontWeight: "600", textAlign: "center" },
  setScroll: { maxHeight: 140 },
  setRow: { flexDirection: "row", alignItems: "center", paddingVertical: 5, borderTopWidth: 1, borderTopColor: "#004d38" },
  setLabel: { color: "#888", fontSize: 12, width: 44 },
  setInput: { color: "#00ff88", fontSize: 16, fontWeight: "700", textAlign: "center", flex: 1 },
  colSet: { width: 44 }, colReps: { flex: 1 }, colWeight: { flex: 1.5 },
  addSetButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 8, borderTopWidth: 1, borderTopColor: "#004d38" },
  addSetText: { color: "#00ff88", fontSize: 13, fontWeight: "700" },
  buttons: { flexDirection: "row", justifyContent: "center", gap: 10 },
  restButton: { flexDirection: "row", backgroundColor: "#009c67", padding: 10, borderRadius: 10, alignItems: "center", gap: 6 },
  resumeButton: { flexDirection: "row", backgroundColor: "#00ff88", padding: 10, borderRadius: 10, alignItems: "center", gap: 6 },
  buttonText: { color: "#001a14", fontWeight: "900" },
  endButton: { flexDirection: "row", backgroundColor: "#ff4444", padding: 10, borderRadius: 10, alignItems: "center", gap: 6 },
  endButtonText: { color: "#fff", fontWeight: "900" },
});