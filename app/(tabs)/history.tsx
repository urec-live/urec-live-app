import { MaterialCommunityIcons } from "@expo/vector-icons";
import { FlatList, StyleSheet, Text, View, StatusBar } from "react-native";
import { useWorkout } from "../../contexts/WorkoutContext";
import { Colors } from "@/constants/theme";
import { LinearGradient } from "expo-linear-gradient";

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
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <Text style={styles.headerTitle}>History</Text>
        </View>
      </View>

      <View style={styles.content}>
        {workoutHistory.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
              <MaterialCommunityIcons name="history" size={48} color={Colors.dark.textSecondary} />
            </View>
            <Text style={styles.emptyText}>No workout history yet</Text>
            <Text style={styles.emptySubtext}>
              Complete your first workout to see it here!
            </Text>
          </View>
        ) : (
          <FlatList
            data={workoutHistory}
            keyExtractor={(item) => item.date}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <LinearGradient
                colors={[Colors.dark.surface, 'rgba(10, 14, 39, 0.6)']}
                style={styles.dayCard}
              >
                <View style={styles.dayHeader}>
                  <View style={styles.dateRow}>
                    <MaterialCommunityIcons
                      name="calendar-month"
                      size={20}
                      color={Colors.dark.primary}
                    />
                    <Text style={styles.dateText}>{formatDate(item.date)}</Text>
                  </View>
                </View>

                <View style={styles.summaryRow}>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                      {item.sessions.length} EXERCISES
                    </Text>
                  </View>
                  <Text style={styles.summaryText}>
                    {item.muscleGroups.join(" · ")}
                  </Text>
                </View>

                <View style={styles.sessionList}>
                  {item.sessions.map((session, index) => (
                    <View key={index} style={styles.sessionCard}>
                      <View style={styles.sessionHeader}>
                        <Text style={styles.exerciseName}>
                          {session.exerciseName}
                        </Text>
                        <Text style={styles.durationText}>
                          {formatDuration(session.startTime, session.endTime)}
                        </Text>
                      </View>
                      <Text style={styles.machineText}>{session.machineId}</Text>
                    </View>
                  ))}
                </View>
              </LinearGradient>
            )}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
    paddingTop: 60,
  },
  header: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: Colors.dark.text,
    letterSpacing: -0.5,
  },
  content: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
    marginTop: 100,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyText: {
    fontSize: 20,
    color: Colors.dark.text,
    fontWeight: "700",
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
  dayCard: {
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  dayHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateText: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.dark.text,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  badge: {
    backgroundColor: 'rgba(0, 245, 255, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(0, 245, 255, 0.2)',
  },
  badgeText: {
    color: Colors.dark.primary,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  summaryText: {
    fontSize: 12,
    color: Colors.dark.textSecondary,
    fontWeight: "600",
    textTransform: 'uppercase',
  },
  sessionList: {
    gap: 8,
  },
  sessionCard: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 12,
    padding: 12,
  },
  sessionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  exerciseName: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.dark.text,
  },
  machineText: {
    fontSize: 12,
    color: Colors.dark.textSecondary,
  },
  durationText: {
    fontSize: 12,
    color: Colors.dark.accentAmber,
    fontWeight: "700",
    fontFamily: "monospace", // JetBrains Mono feel
  },
});
