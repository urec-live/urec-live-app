import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { useWorkout } from "../../contexts/WorkoutContext";

export default function HistoryScreen() {
  const { workoutHistory } = useWorkout();

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatDuration = (startTime: number, endTime?: number) => {
    if (!endTime) return "In Progress";
    const seconds = Math.floor((endTime - startTime) / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  return (
    <LinearGradient colors={["#000", "#1a1a1a", "#000"]} style={{ flex: 1 }}>
      <View style={styles.container}>
        <Text style={styles.title}>Workout History</Text>

        {workoutHistory.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="history" size={64} color="#555" />
            <Text style={styles.emptyText}>No workout history yet</Text>
            <Text style={styles.emptySubtext}>
              Complete your first workout to see it here!
            </Text>
          </View>
        ) : (
          <FlatList
            data={workoutHistory}
            keyExtractor={(item) => item.date}
            renderItem={({ item }) => (
              <View style={styles.dayCard}>
                <View style={styles.dayHeader}>
                  <MaterialCommunityIcons
                    name="calendar"
                    size={20}
                    color="#00ff88"
                  />
                  <Text style={styles.dateText}>{formatDate(item.date)}</Text>
                </View>

                <View style={styles.summaryRow}>
                  <Text style={styles.summaryText}>
                    {item.sessions.length} exercise
                    {item.sessions.length !== 1 ? "s" : ""}
                  </Text>
                  <Text style={styles.summaryText}>•</Text>
                  <Text style={styles.summaryText}>
                    {item.muscleGroups.join(", ")}
                  </Text>
                </View>

                {item.sessions.map((session, index) => (
                  <View key={index} style={styles.sessionCard}>
                    <View style={styles.sessionHeader}>
                      <MaterialCommunityIcons
                        name="dumbbell"
                        size={16}
                        color="#00FF7F"
                      />
                      <Text style={styles.exerciseName}>
                        {session.exerciseName}
                      </Text>
                    </View>
                    <Text style={styles.machineText}>{session.machineId}</Text>
                    <Text style={styles.durationText}>
                      Duration: {formatDuration(session.startTime, session.endTime)}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          />
        )}
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
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 20,
    color: "#777",
    fontWeight: "700",
    marginTop: 20,
    textAlign: "center",
  },
  emptySubtext: {
    fontSize: 14,
    color: "#555",
    marginTop: 10,
    textAlign: "center",
  },
  dayCard: {
    backgroundColor: "#003324",
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    borderWidth: 2,
    borderColor: "#00ff88",
  },
  dayHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  dateText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#00ff88",
  },
  summaryRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 15,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
  },
  summaryText: {
    fontSize: 14,
    color: "#ccc",
  },
  sessionCard: {
    backgroundColor: "#009c67",
    borderRadius: 10,
    padding: 12,
    marginTop: 10,
    borderLeftWidth: 4,
    borderLeftColor: "#00ff88",
    borderWidth: 1,
    borderColor: "#00ff88",
  },
  sessionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#00ff88",
  },
  machineText: {
    fontSize: 14,
    color: "#aaa",
    marginBottom: 4,
  },
  durationText: {
    fontSize: 12,
    color: "#00ff88",
    fontWeight: "600",
  },
});
