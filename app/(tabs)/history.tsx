import { MaterialCommunityIcons } from "@expo/vector-icons";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { useWorkout } from "../../contexts/WorkoutContext";
import { Colors } from "@/constants/theme";

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
    <View style={{ flex: 1, backgroundColor: Colors.light.backgroundSecondary }}>
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
            contentContainerStyle={{ paddingRight: 8 }}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <View style={styles.dayCard}>
                <View style={styles.dayHeader}>
                  <MaterialCommunityIcons
                    name="calendar"
                    size={20}
                    color={Colors.light.primary}
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
                        color={Colors.light.primary}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, paddingTop: 60 },
  title: {
    fontSize: 26,
    color: Colors.light.text,
    fontWeight: "900",
    textAlign: "center",
    marginBottom: 20,
    letterSpacing: -0.5,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 20,
    color: Colors.light.textSecondary,
    fontWeight: "700",
    marginTop: 20,
    textAlign: "center",
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.light.icon,
    marginTop: 10,
    textAlign: "center",
    lineHeight: 20,
  },
  dayCard: {
    backgroundColor: Colors.light.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    // Soft shadow instead of border
    shadowColor: Colors.light.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: "transparent",
  },
  dayHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  dateText: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.light.text,
  },
  summaryRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.secondary,
  },
  summaryText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    fontWeight: "500",
  },
  sessionCard: {
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
    borderLeftWidth: 4,
    borderLeftColor: Colors.light.primary,
  },
  sessionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.light.text,
  },
  machineText: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    marginBottom: 4,
  },
  durationText: {
    fontSize: 12,
    color: Colors.light.primary,
    fontWeight: "600",
  },
});
