import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import {
  FlatList,
  Image,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
// UPDATED: Using path aliases for stable imports
import { ExerciseInfo, exercisesData } from "@/constants/equipment-data";
import { useWorkout } from "@/contexts/WorkoutContext";

export default function MuscleExercises() {
  const { muscle } = useLocalSearchParams();
  const router = useRouter();
  const { todayWorkouts } = useWorkout();
  const group = (muscle as string) || "Chest";
  const exercises = exercisesData[group] || [];

  const sortedExercises = [...exercises].sort((a, b) => {
    const aAvailable = a.machines.filter(
      (m) => m.status === "Available"
    ).length;
    const bAvailable = b.machines.filter(
      (m) => m.status === "Available"
    ).length;
    if (aAvailable === 0 && bAvailable > 0) return 1;
    if (aAvailable > 0 && bAvailable === 0) return -1;
    return 0;
  });

  const renderItem = ({ item }: { item: ExerciseInfo }) => {
    const availableMachines = item.machines.filter(
      (m) => m.status === "Available"
    ).length;
    const totalMachines = item.machines.length;
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
            {isCompleted ? "Completed" : `${availableMachines}/${totalMachines} Available`}
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
    <LinearGradient colors={["#000", "#1a1a1a", "#000"]} style={{ flex: 1 }}>
      <View style={styles.container}>
        <Text style={styles.title}>{group} Exercises</Text>
        <FlatList
          data={sortedExercises}
          keyExtractor={(item) => item.name}
          renderItem={renderItem}
        />
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, paddingTop: 60 },
  title: {
    fontSize: 26,
    color: "#00ff88",
    fontWeight: "900",
    textAlign: "center",
    marginBottom: 20,
    textTransform: "capitalize",
  },
  card: {
    backgroundColor: "#003324",
    borderRadius: 10,
    marginBottom: 15,
    elevation: 5,
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderWidth: 1,
    borderColor: "#00ff88",
  },
  disabledCard: {
    backgroundColor: "#333",
    shadowColor: "#888",
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
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    borderRadius: 8,
  },
  cardContent: {
    flex: 1,
    marginLeft: 15,
  },
  cardText: {
    color: "#00ff88",
    fontWeight: "700",
    fontSize: 18,
  },
  completedText: {
    color: "#888",
  },
  availabilityText: {
    color: "#ccc",
    fontSize: 14,
    marginTop: 5,
  },
  infoButton: {
    padding: 10,
  },
  completedCard: {
    backgroundColor: "#222",
    borderColor: "#666",
  },
});