import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
// UPDATED: Using the path alias '@/' for stable imports
import { exercisesData } from "@/constants/equipment-data";

const muscles = [
  "Chest", "Shoulders", "Triceps", "Back", "Biceps",
  "Quads", "Hamstrings", "Calves", "Glutes",
  "Forearms", "Abs", "Core",
];

export default function StrengthWorkout() {
  const router = useRouter();

  const getAvailableExercisesCount = (muscle: string) => {
    const exercises = exercisesData[muscle] || [];
    return exercises.filter(exercise =>
      exercise.machines.some(machine => machine.status === "Available")
    ).length;
  };

  return (
    <LinearGradient colors={["#ffffff", "#f5f5f5", "#ffffff"]} style={{ flex: 1 }}>
      <View style={styles.container}>
        <Text style={styles.title}>SELECT MUSCLE GROUP</Text>

        <FlatList
          data={muscles}
          keyExtractor={(item) => item}          contentContainerStyle={{ paddingRight: 8 }}          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const availableCount = getAvailableExercisesCount(item);
            return (
              <TouchableOpacity
                style={styles.card}
                // Now navigating within the tabs stack
                onPress={() =>
                  router.push({
                    pathname: "/workout/exercises/[muscle]",
                    params: { muscle: item },
                  })
                }
              >
                <Text style={styles.cardText}>{item}</Text>
                <Text style={styles.countText}>{availableCount} exercises available</Text>
              </TouchableOpacity>
            );
          }}
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
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  cardText: { color: "#4CAF50", fontWeight: "700", fontSize: 18 },
  countText: { color: "#666", fontSize: 14 },
});