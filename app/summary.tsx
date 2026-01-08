import { useLocalSearchParams, useRouter } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function WorkoutSummary() {
  const router = useRouter();
  const { user, machines, duration } = useLocalSearchParams();

  // Mock data (in case no params passed)
  const completedMachines = machines ? JSON.parse(machines as string) : ["Bench Press", "Leg Press"];
  const totalDuration = duration || "45 mins";

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Workout Complete 🏆</Text>

      <Text style={styles.subtitle}>Great job, {user || "Athlete"}!</Text>

      <View style={styles.statsContainer}>
        <Text style={styles.statTitle}>Total Duration</Text>
        <Text style={styles.statValue}>{totalDuration}</Text>

        <Text style={[styles.statTitle, { marginTop: 25 }]}>Machines Used</Text>
        {completedMachines.map((m: string, i: number) => (
        <Text key={i} style={styles.listItem}>• {m}</Text>
        ))}

      </View>

      <TouchableOpacity
        style={[styles.button, styles.goldButton]}
        onPress={() => router.push("/(tabs)")}
        activeOpacity={0.8}
      >
        <Text style={styles.buttonText}>FINISH WORKOUT</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
    padding: 25,
  },
  title: {
    color: "#00ff88",
    fontSize: 32,
    fontWeight: "900",
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  subtitle: {
    color: "#f2f2f2",
    fontSize: 16,
    marginBottom: 30,
  },
  statsContainer: {
    backgroundColor: "#111",
    padding: 20,
    borderRadius: 15,
    width: "90%",
    marginBottom: 40,
    shadowColor: "#00ff88",
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 5,
  },
  statTitle: {
    color: "#00ff88",
    fontSize: 18,
    fontWeight: "700",
  },
  statValue: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "800",
    marginTop: 5,
  },
  listItem: {
    color: "#ddd",
    fontSize: 16,
    marginTop: 8,
    marginLeft: 5,
  },
  button: {
    width: "70%",
    paddingVertical: 15,
    borderRadius: 35,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#00ff88",
    shadowOpacity: 0.7,
    shadowRadius: 12,
    elevation: 8,
  },
  goldButton: {
    backgroundColor: "#009c67",
  },
  buttonText: {
    color: "#000",
    fontWeight: "800",
    fontSize: 16,
    letterSpacing: 1,
  },
});
