import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  FlatList,
  ActivityIndicator,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useWorkout } from "@/contexts/WorkoutContext";
import { useCachedResource, useCachedResources } from "@/hooks/useCachedResource";
import { cacheKeys, STALE_MS } from "@/services/cachedResources";
import { machineAPI, Exercise, MachineDto } from "@/services/machineAPI";

export default function MuscleExercises() {
  const { muscle } = useLocalSearchParams();
  const router = useRouter();
  const { todayWorkouts } = useWorkout();
  const group = (muscle as string) || "Chest";
  const [refreshing, setRefreshing] = useState(false);

  const {
    data,
    loading,
    error,
    refresh: refreshExercises,
  } = useCachedResource<Exercise[]>(
    cacheKeys.exercisesFor(group),
    () => machineAPI.getExercisesByMuscleGroup(group),
    { staleTime: STALE_MS.catalog },
  );
  const exercises = useMemo(() => (Array.isArray(data) ? data : []), [data]);

  // Each exercise's machines, saved under the key its machine picker opens with. Live updates
  // patch them, so the counts change without refetching anything.
  const machineRequests = useMemo(
    () =>
      exercises.map((ex) => ({
        key: cacheKeys.machinesFor(ex.name),
        fetcher: () => machineAPI.getByExercise(ex.name),
      })),
    [exercises],
  );
  const { data: machinesByKey, refresh: refreshMachines } = useCachedResources<MachineDto[]>(machineRequests, {
    live: true,
    staleTime: STALE_MS.live,
  });

  const availabilityByExercise = useMemo(() => {
    const result: Record<string, { available: number; total: number } | undefined> = {};
    for (const ex of exercises) {
      const machines = machinesByKey[cacheKeys.machinesFor(ex.name)];
      result[ex.name] = machines && {
        total: machines.length,
        available: machines.filter((m) => m.status.toUpperCase() === "AVAILABLE").length,
      };
    }
    return result;
  }, [exercises, machinesByKey]);

  const sortedExercises = useMemo(() => {
    return [...exercises].sort((a, b) => {
      const aAvailable = availabilityByExercise[a.name]?.available ?? 0;
      const bAvailable = availabilityByExercise[b.name]?.available ?? 0;
      if (aAvailable === 0 && bAvailable > 0) return 1;
      if (aAvailable > 0 && bAvailable === 0) return -1;
      return 0;
    });
  }, [exercises, availabilityByExercise]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([refreshExercises(), refreshMachines()]);
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

  if (error && !data) {
    return (
      <LinearGradient colors={["#ffffff", "#f5f5f5", "#ffffff"]} style={{ flex: 1 }}>
        <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
          <MaterialCommunityIcons name="alert-circle" size={48} color="#f44336" />
          <Text style={{ marginTop: 10, color: '#f44336', fontSize: 16 }}>Failed to load exercises</Text>
          <TouchableOpacity 
            style={{ marginTop: 20, backgroundColor: '#4CAF50', padding: 12, borderRadius: 8 }}
            onPress={refreshExercises}
          >
            <Text style={{ color: '#fff', fontWeight: '600' }}>Retry</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    );
  }

  const renderItem = ({ item }: { item: Exercise }) => {
    const availability = availabilityByExercise[item.name];
    const availableMachines = availability?.available ?? 0;
    const totalMachines = availability?.total ?? 0;
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
              : !availability
              ? "Loading availability…"
              : totalMachines === 0
              ? "No machines"
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