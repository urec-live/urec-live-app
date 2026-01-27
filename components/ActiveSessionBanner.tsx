import { useAuth } from "@/contexts/AuthContext";
import { useWorkout } from "@/contexts/WorkoutContext";
import { machineAPI, ActiveEquipmentSession } from "@/services/machineAPI";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function ActiveSessionBanner() {
  const router = useRouter();
  const { isGuest, isSignedIn, loading: authLoading } = useAuth();
  const { currentSession, checkOut } = useWorkout();
  const [activeSession, setActiveSession] = useState<ActiveEquipmentSession | null>(null);
  const [ending, setEnding] = useState(false);

  const refresh = async () => {
    if (isGuest || !isSignedIn || authLoading) {
      setActiveSession(null);
      return;
    }

    try {
      const session = await machineAPI.getMyActiveSession();
      setActiveSession(session);
    } catch {
      setActiveSession(null);
    }
  };

  useEffect(() => {
    refresh();
  }, [currentSession, authLoading, isSignedIn, isGuest]);

  if (!activeSession) return null;

  const formatStartedAt = (iso: string) => {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) {
      return iso;
    }
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const handleEnd = () => {
    if (ending) return;
    Alert.alert(
      "End Session",
      "End your active equipment session?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "End",
          style: "destructive",
          onPress: async () => {
            setEnding(true);
            try {
              await machineAPI.checkOut(activeSession.equipment.code);
              if (currentSession?.machineId === activeSession.equipment.code) {
                await checkOut();
              }
            } finally {
              setEnding(false);
              refresh();
            }
          },
        },
      ]
    );
  };

  const handleResume = async () => {
    const equipmentCode = activeSession.equipment.code;
    if (currentSession?.machineId === equipmentCode) {
      router.push({
        pathname: "/workout/equipment/[exercise]",
        params: {
          exercise: currentSession.exerciseName,
          muscle: currentSession.muscleGroup,
        },
      });
      return;
    }

    try {
      const exercises = await machineAPI.getExercisesByEquipmentCode(equipmentCode);
      if (exercises.length > 0) {
        router.push({
          pathname: "/workout/equipment/[exercise]",
          params: {
            exercise: exercises[0].name,
            muscle: exercises[0].muscleGroup,
          },
        });
        return;
      }
    } catch {
      // Fall back to machine detail when we cannot resolve an exercise.
    }

    router.push({
      pathname: "/machine/[id]",
      params: { id: String(activeSession.equipment.id) },
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.textBlock}>
        <View style={styles.titleRow}>
          <MaterialCommunityIcons name="timer" size={16} color="#1b5e20" />
          <Text style={styles.title}>Active Session</Text>
        </View>
        <Text style={styles.subtitle}>
          {activeSession.equipment.name} (started {formatStartedAt(activeSession.startedAt)})
        </Text>
      </View>
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.resumeButton}
          onPress={handleResume}
        >
          <Text style={styles.resumeText}>Resume</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.endButton} onPress={handleEnd}>
          <Text style={styles.endText}>End</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 10,
    marginTop: 4,
    marginBottom: 6,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1b5e20",
    backgroundColor: "#e8f5e9",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  textBlock: {
    flex: 1,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 2,
  },
  title: {
    color: "#1b5e20",
    fontWeight: "800",
    textTransform: "uppercase",
    fontSize: 12,
    letterSpacing: 0.6,
  },
  subtitle: {
    color: "#1a1a1a",
    fontWeight: "700",
    fontSize: 13,
  },
  actions: {
    flexDirection: "row",
    gap: 8,
  },
  resumeButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: "#1b5e20",
  },
  resumeText: {
    color: "#ffffff",
    fontWeight: "800",
    fontSize: 12,
    textTransform: "uppercase",
  },
  endButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: "#ffebee",
    borderWidth: 1,
    borderColor: "#d32f2f",
  },
  endText: {
    color: "#d32f2f",
    fontWeight: "800",
    fontSize: 12,
    textTransform: "uppercase",
  },
});
