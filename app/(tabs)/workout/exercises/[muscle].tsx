import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  FlatList,
  ActivityIndicator,
  Image,
  Linking,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useWorkout } from "@/contexts/WorkoutContext";
import { machineAPI, Exercise } from "@/services/machineAPI";
import websocketService from "@/services/websocketService";

export default function MuscleExercises() {
  const { muscle } = useLocalSearchParams();
  const router = useRouter();
  const { todayWorkouts } = useWorkout();
  const group = (muscle as string) || "Chest";
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [availabilityByExercise, setAvailabilityByExercise] = useState<
    Record<string, { available: number; total: number }>
  >({});
  const [refreshing, setRefreshing] = useState(false);

  const sortedExercises = useMemo(() => {
    return [...exercises].sort((a, b) => {
      const aAvailable = availabilityByExercise[a.name]?.available ?? 0;
      const bAvailable = availabilityByExercise[b.name]?.available ?? 0;
      if (aAvailable === 0 && bAvailable > 0) return 1;
      if (aAvailable > 0 && bAvailable === 0) return -1;
      return 0;
    });
  }, [exercises, availabilityByExercise]);

  const loadExercises = async () => {
    try {
      setError(null);
      console.log('[loadExercises] Fetching exercises for muscle group:', group);
      const exerciseList = await machineAPI.getExercisesByMuscleGroup(group);
      console.log('[loadExercises] Received exercises:', exerciseList);
      setExercises(exerciseList);
    } catch (err) {
      console.error('[loadExercises] Failed to fetch exercises:', err);
      setError('Failed to load exercises');
    } finally {
      setLoading(false);
    }
  };

  const loadAvailability = async () => {
    if (!exercises || !Array.isArray(exercises) || exercises.length === 0) {
      console.log('[loadAvailability] Skipping - no exercises to load availability for');
      return;
    }
    
    console.log('[loadAvailability] Loading availability for', exercises.length, 'exercises');
    const entries = await Promise.all(
      exercises.map(async (ex) => {
        try {
          console.log('[loadAvailability] Fetching machines for exercise:', ex.name);
          const machines = await machineAPI.getByExercise(ex.name);
          console.log('[loadAvailability] Found', machines.length, 'machines for', ex.name);
          const total = machines.length;
          const available = machines.filter((m) => m.status.toUpperCase() === "AVAILABLE").length;
          return [ex.name, { available, total }] as const;
        } catch (err) {
          console.error('[loadAvailability] Error fetching machines for', ex.name, ':', err);
          return [ex.name, { available: 0, total: 0 }] as const;
        }
      })
    );
    console.log('[loadAvailability] Setting availability:', Object.fromEntries(entries));
    setAvailabilityByExercise(Object.fromEntries(entries));
  };

  useEffect(() => {
    loadExercises();
  }, [group]);

  useEffect(() => {
    if (exercises.length > 0) {
      loadAvailability();

      // Subscribe to WebSocket updates
      const unsubscribe = websocketService.subscribe((updatedMachine) => {
        console.log('[Exercise List] Received machine update:', updatedMachine);
        // Reload availability when any machine is updated
        loadAvailability();
      });

      return () => {
        unsubscribe();
      };
    }
  }, [exercises]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadExercises();
      await loadAvailability();
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <LinearGradient colors={["#ffffff", "#f5f5f5", "#ffffff"]} style={{ flex: 1 }}>
        <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={{ marginTop: 10, color: '#666' }}>Loading exercises...</Text>
        </View>
      </LinearGradient>
    );
  }

  if (error) {
    return (
      <LinearGradient colors={["#ffffff", "#f5f5f5", "#ffffff"]} style={{ flex: 1 }}>
        <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
          <MaterialCommunityIcons name="alert-circle" size={48} color="#f44336" />
          <Text style={{ marginTop: 10, color: '#f44336', fontSize: 16 }}>{error}</Text>
          <TouchableOpacity 
            style={{ marginTop: 20, backgroundColor: '#4CAF50', padding: 12, borderRadius: 8 }}
            onPress={() => {
              setLoading(true);
              loadExercises();
            }}
          >
            <Text style={{ color: '#fff', fontWeight: '600' }}>Retry</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    );
  }

  const renderItem = ({ item }: { item: Exercise }) => {
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
          {item.gifUrl && (
            <Image source={{ uri: item.gifUrl }} style={styles.cardImage} />
          )}
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
      </TouchableOpacity>
    );
  };

  return (
    <LinearGradient colors={["#ffffff", "#f5f5f5", "#ffffff"]} style={{ flex: 1 }}>
      <View style={styles.container}>
        <Text style={styles.title}>{group} Exercises</Text>
        <FlatList
          data={sortedExercises}
          keyExtractor={(item) => item?.id?.toString() || item?.name || Math.random().toString()}
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
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 10,
    padding: 15,
    marginBottom: 12,
    elevation: 3,
    gap: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  disabledCard: {
    backgroundColor: "#e0e0e0",
    borderColor: "#bdbdbd",
  },
  cardImage: {
    width: 70,
    height: 70,
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
  },
  cardText: {
    color: "#1a1a1a",
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