import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Image,
  Linking,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
// UPDATED: Using path aliases for stable imports
import { ExerciseInfo, exercisesData } from "@/constants/equipment-data";
import { useWorkout } from "@/contexts/WorkoutContext";
import { machineAPI } from "@/services/machineAPI";
import websocketService from "@/services/websocketService";

export default function MuscleExercises() {
  const { muscle } = useLocalSearchParams();
  const router = useRouter();
  const { todayWorkouts } = useWorkout();
  const group = (muscle as string) || "Chest";
  const exercises = useMemo(() => exercisesData[group] || [], [group]);

  const [availabilityByExercise, setAvailabilityByExercise] = useState<
    Record<string, { available: number; total: number }>
  >({});
  const [refreshing, setRefreshing] = useState(false);

  const loadAvailability = async () => {
    const entries = await Promise.all(
      exercises.map(async (ex) => {
        try {
          const machines = await machineAPI.getByExercise(ex.name);
          const total = machines.length;
          const available = machines.filter((m) => m.status.toUpperCase() === "AVAILABLE").length;
          return [ex.name, { available, total }] as const;
        } catch {
          return [ex.name, { available: 0, total: 0 }] as const;
        }
      })
    );
    setAvailabilityByExercise(Object.fromEntries(entries));
  };

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      await loadAvailability();
    };
    load();

    // Subscribe to WebSocket updates
    const unsubscribe = websocketService.subscribe((updatedMachine) => {
      console.log('[Exercise List] Received machine update:', updatedMachine);
      // Reload availability when any machine is updated
      loadAvailability();
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [group, exercises]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadAvailability();
    } finally {
      setRefreshing(false);
    }
  };

  const sortedExercises = useMemo(() => {
    return [...exercises].sort((a, b) => {
      const aAvailable = availabilityByExercise[a.name]?.available ?? 0;
      const bAvailable = availabilityByExercise[b.name]?.available ?? 0;
      if (aAvailable === 0 && bAvailable > 0) return 1;
      if (aAvailable > 0 && bAvailable === 0) return -1;
      return 0;
    });
  }, [exercises, availabilityByExercise]);

  const renderItem = ({ item }: { item: ExerciseInfo }) => {
    const availableMachines = availabilityByExercise[item.name]?.available ?? 0;
    const totalMachines = availabilityByExercise[item.name]?.total ?? 0;
    const isAvailable = availableMachines > 0;
    const isCompleted = todayWorkouts.some(session => session.exerciseName === item.name);

    return (
      <TouchableOpacity
        style={[styles.card, !isAvailable && styles.disabledCard, isCompleted && styles.completedCard]}
        disabled={!isAvailable || isCompleted}
        onPress={() =>
          router.push({
            // Path is already correct to remain in the tabs stack
            pathname: "/workout/equipment/[exercise]",
            params: { exercise: item.name, muscle: group },
          })
        }
      >
        <View style={styles.imageContainer}>
          <Image source={item.image} style={styles.cardImage} />
          {isCompleted && (
            <View style={styles.checkOverlay}>
              <MaterialCommunityIcons name="check-circle" size={30} color="#00ff88" />
            </View>
          )}
        </View>
        <View style={styles.cardContent}>
          <Text style={[styles.cardText, isCompleted && styles.completedText]}>{item.name}</Text>
          <Text style={[styles.availabilityText, isCompleted && styles.completedText]}>
            {isCompleted
              ? "Completed"
              : totalMachines === 0
              ? "Loading availability…"
              : `${availableMachines}/${totalMachines} Available`}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.infoButton}
          onPress={() => Linking.openURL(item.youtubeUrl)}
        >
          <MaterialCommunityIcons name="information" size={24} color="#00ff88" />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <LinearGradient colors={["#ffffff", "#f5f5f5", "#ffffff"]} style={{ flex: 1 }}>
      <View style={styles.container}>
        <Text style={styles.title}>{group} Exercises</Text>
        <FlatList
          data={sortedExercises}
          keyExtractor={(item) => item.name}
          renderItem={renderItem}
          contentContainerStyle={{ paddingRight: 8 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#4CAF50"
              colors={["#4CAF50", "#66BB6A", "#81C784"]}
              progressBackgroundColor="#ffffff"
              title="Pull to refresh"
              titleColor="#4CAF50"
            />
          }
        />
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
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 10,
    marginBottom: 15,
    elevation: 3,
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderWidth: 1,
    borderColor: "#4CAF50",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  disabledCard: {
    backgroundColor: "#e0e0e0",
    borderColor: "#bdbdbd",
  },
  cardImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  imageContainer: {
    position: "relative",
  },
  checkOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(76, 175, 80, 0.3)",
    borderRadius: 8,
  },
  cardContent: {
    flex: 1,
    marginLeft: 15,
  },
  cardText: {
    color: "#4CAF50",
    fontWeight: "700",
    fontSize: 18,
  },
  completedText: {
    color: "#999",
  },
  availabilityText: {
    color: "#666",
    fontSize: 14,
    marginTop: 5,
  },
  infoButton: {
    padding: 10,
  },
  completedCard: {
    backgroundColor: "#f5f5f5",
    borderColor: "#bdbdbd",
  },
});