import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { exercisesData } from "../../constants/equipment-data";

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
    <LinearGradient colors={["#000", "#1a1a1a", "#000"]} style={{ flex: 1 }}>
      <View style={styles.container}>
        <Text style={styles.title}>Select Muscle Group</Text>

        <FlatList
          data={muscles}
          keyExtractor={(item) => item}
          renderItem={({ item }) => {
            const availableCount = getAvailableExercisesCount(item);
            return (
              <TouchableOpacity
                style={styles.card}
                // ✅ Type-safe dynamic routing to /workout/exercises/[muscle]
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
    color: "#00ff88",
    fontWeight: "900",
    textAlign: "center",
    marginBottom: 20,
  },
  card: {
    backgroundColor: "#111",
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    shadowColor: "#00ff88",
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 5,
  },
  cardText: { color: "#00ff88", fontWeight: "700", fontSize: 18 },
  countText: { color: "#ccc", fontSize: 14 },
});
