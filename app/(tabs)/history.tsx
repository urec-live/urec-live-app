import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useAuth } from "@/contexts/AuthContext";
import { useCachedResource } from "@/hooks/useCachedResource";
import { cacheKeys, fetchHistory, STALE_MS } from "@/services/cachedResources";
import type { SessionResponse } from "@/services/sessionAPI";
import { DailyWorkout, useWorkout } from "../../contexts/WorkoutContext";
import { useBodyMeasurements } from "@/hooks/useBodyMeasurements";
import WorkoutHistoryCalendar from "@/components/WorkoutHistoryCalendar";
import { briefDuration, calendarDate, dateKey, summarizeWeek, weekHistory, weekLabel, weekStart } from "@/utils/historyCalendar";

function groupSessionsByDate(sessions: SessionResponse[]): DailyWorkout[] {
  const map = new Map<string, DailyWorkout>();

  for (const s of sessions) {
    const date = dateKey(new Date(s.startedAt));
    const exerciseName = s.exerciseName ?? s.machineCode ?? "Unknown";
    const muscleGroup = s.muscleGroup ?? "General";

    if (!map.has(date)) {
      map.set(date, { date, sessions: [], muscleGroups: [] });
    }
    const day = map.get(date)!;
    day.sessions.push({
      exerciseName,
      machineCode: s.machineCode ?? "",
      muscleGroup,
      startTime: new Date(s.startedAt).getTime(),
      endTime: s.endedAt ? new Date(s.endedAt).getTime() : undefined,
      setDetails: s.setDetails?.map((d) => ({ reps: d.reps ?? undefined, weightLbs: d.weightLbs ?? undefined, durationSeconds: d.durationSeconds ?? undefined, distanceMeters: d.distanceMeters ?? undefined })),
    });
    if (!day.muscleGroups.includes(muscleGroup)) {
      day.muscleGroups.push(muscleGroup);
    }
  }

  return Array.from(map.values()).sort((a, b) => b.date.localeCompare(a.date));
}

export default function HistoryScreen() {
  const { workoutHistory: localHistory, flushPendingSessions } = useWorkout();
  const { user } = useAuth();
  const { data: measurements } = useBodyMeasurements(user?.username);
  const calorieWeight = measurements?.weightKg ?? 70;
  const { data, loading, error, refreshing, refresh, revalidate } = useCachedResource(
    user ? cacheKeys.user(user.username, "history") : null,
    async () => {
      // Sessions saved while offline go up first, so they're in the list
      await flushPendingSessions();
      return fetchHistory();
    },
    { staleTime: STALE_MS.user },
  );
  // Tabs stay mounted, so refresh on focus: a finished workout marks the saved copy stale
  useFocusEffect(
    useCallback(() => {
      revalidate();
    }, [revalidate])
  );

  const apiError = error != null;
  const history = useMemo(
    // Offline with nothing saved: fall back to this session's workouts in memory
    () => (data ? groupSessionsByDate(data) : apiError ? localHistory : []),
    [data, apiError, localHistory]
  );

  const [selection, setSelection] = useState<{ month: string; week: string } | null>(null);
  // Start at the latest logged workout; an empty account opens the current month.
  const latestDate = history.reduce((latest, day) => day.date > latest ? day.date : latest, "") || dateKey(new Date());
  const selectedWeek = selection?.week ?? weekStart(latestDate);
  const visibleMonth = selection?.month ?? `${latestDate.slice(0, 7)}-01`;
  const selectedDays = useMemo(() => weekHistory(history, selectedWeek), [history, selectedWeek]);
  const weekly = useMemo(() => summarizeWeek(selectedDays, calorieWeight), [selectedDays, calorieWeight]);

  const onRefresh = () => {
    refresh();
  };

  const formatDate = (dateString: string) => {
    const date = calendarDate(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatDuration = (startTime: number, endTime?: number) => {
    if (endTime == null) return "In Progress";
    const seconds = Math.floor((endTime - startTime) / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  if (loading) {
    return (
      <LinearGradient colors={["#ffffff", "#f5f5f5", "#ffffff"]} style={{ flex: 1 }}>
        <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>Loading history...</Text>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={["#ffffff", "#f5f5f5", "#ffffff"]} style={{ flex: 1 }}>
      <View style={styles.container}>
        <Text style={styles.title}>Workout History</Text>

        {apiError && (
          <View style={styles.offlineBanner}>
            <MaterialCommunityIcons name="wifi-off" size={14} color="#fff" />
            <Text style={styles.offlineBannerText}>Showing local data — offline</Text>
          </View>
        )}

        <FlatList
            data={selectedDays}
            ListHeaderComponent={
              <>
                <WorkoutHistoryCalendar
                  history={history}
                  month={visibleMonth}
                  selectedWeek={selectedWeek}
                  onSelectWeek={week => setSelection({ month: visibleMonth, week })}
                  onChangeMonth={month => setSelection({ month, week: weekStart(month) })}
                  onToday={() => {
                    const today = dateKey(new Date());
                    setSelection({ month: `${today.slice(0, 7)}-01`, week: weekStart(today) });
                  }}
                />
                <Text style={styles.sectionTitle}>Weekly summary</Text>
                <View style={styles.weekOverview}>
                  <Text style={styles.weekRange}>{weekLabel(selectedWeek)}</Text>
                  <View style={styles.weekStats}>
                    <View style={styles.stat}><Text style={styles.statValue}>{weekly.days}</Text><Text style={styles.statLabel}>Workout days</Text></View>
                    <View style={styles.stat}><Text style={styles.statValue}>{weekly.exercises}</Text><Text style={styles.statLabel}>Exercises logged</Text></View>
                    <View style={styles.stat}><Text style={styles.statValue}>{weekly.sets}</Text><Text style={styles.statLabel}>Sets</Text></View>
                  </View>
                  <View style={styles.extraStats}>
                    <View style={styles.stat}>
                      <View style={styles.metricHeading}><MaterialCommunityIcons name="fire" size={21} color="#B57806" /><Text style={styles.statValue}>≈{weekly.estimatedKcal}</Text></View>
                      <Text style={styles.statLabel}>kcal burned · estimated</Text>
                    </View>
                    <View style={styles.stat}>
                      <Text style={styles.statValue}>{weekly.muscleGroups.length}</Text>
                      <Text style={styles.statLabel}>Muscle groups worked</Text>
                      {weekly.muscleGroups.length > 0 && <Text style={styles.muscleNames}>{weekly.muscleGroups.join(", ")}</Text>}
                    </View>
                  </View>
                  <Text style={styles.estimateNote}>Calorie estimate: {calorieWeight.toLocaleString("en-US", { maximumFractionDigits: 1 })} kg {measurements?.weightKg != null ? "saved weight" : "reference weight (add yours in Profile)"}, moderate training.</Text>
                  <View style={styles.weekDuration}><MaterialCommunityIcons name="timer-outline" size={16} color="#216C50" /><Text style={styles.weekDurationText}>{briefDuration(weekly.seconds)} logged duration</Text></View>
                </View>
              </>
            }
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <MaterialCommunityIcons name="calendar-blank-outline" size={36} color="#839088" />
                <Text style={styles.emptyText}>{history.length === 0 ? "No workout history yet" : "No workouts this week"}</Text>
                <Text style={styles.emptySubtext}>{history.length === 0 ? "Complete your first workout to see it here!" : "Select another week to see your logged exercises."}</Text>
              </View>
            }
            keyExtractor={(item) => item.date}
            contentContainerStyle={styles.listContent}
            contentInsetAdjustmentBehavior="automatic"
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor="#4CAF50"
                colors={["#4CAF50"]}
              />
            }
            renderItem={({ item }) => (
              <View style={styles.dayCard}>
                <View style={styles.dayHeader}>
                  <MaterialCommunityIcons name="calendar" size={20} color="#216C50" />
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
                      <MaterialCommunityIcons name="dumbbell" size={16} color="#216C50" />
                      <Text style={styles.exerciseName}>{session.exerciseName}</Text>
                    </View>
                    {!!session.machineCode && <Text style={styles.machineText}>{session.machineCode}</Text>}
                    <Text style={styles.durationText}>
                      Duration: {formatDuration(session.startTime, session.endTime)}
                    </Text>
                    {session.setDetails && session.setDetails.length > 0 && (
                      <View style={{ marginTop: 3, gap: 1 }}>
                        {session.setDetails.map((s, i) => (
                          <Text key={i} style={styles.setsText}>
                            Set {i + 1}
                            {s.reps != null ? `: ${s.reps} reps` : ""}
                            {s.weightLbs != null ? ` · ${s.weightLbs} lbs` : ""}
                            {s.durationSeconds != null ? ` · ${s.durationSeconds} sec` : ""}
                            {s.distanceMeters != null ? ` · ${s.distanceMeters} m` : ""}
                          </Text>
                        ))}
                      </View>
                    )}
                  </View>
                ))}
              </View>
            )}
          />
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16, paddingTop: 54 },
  listContent: { paddingBottom: 24, width: "100%", maxWidth: 680, alignSelf: "center" },
  sectionTitle: { fontSize: 23, fontWeight: "800", color: "#192D23", marginBottom: 12 },
  weekOverview: { backgroundColor: "#FFF", borderRadius: 18, borderWidth: 1, borderColor: "#E1E7E3", padding: 16, marginBottom: 16 },
  weekRange: { fontSize: 17, fontWeight: "700", color: "#192D23", marginBottom: 16 },
  weekStats: { flexDirection: "row", gap: 8, marginBottom: 14 },
  stat: { flex: 1 },
  extraStats: { flexDirection: "row", gap: 16, borderTopWidth: 1, borderTopColor: "#E8EDE9", paddingTop: 14, marginBottom: 10 },
  metricHeading: { flexDirection: "row", alignItems: "center", gap: 4 },
  muscleNames: { fontSize: 12, color: "#216C50", marginTop: 5, lineHeight: 17 },
  estimateNote: { fontSize: 10, color: "#65756C", lineHeight: 15, marginBottom: 12 },
  statValue: { fontSize: 25, fontWeight: "800", color: "#216C50" },
  statLabel: { fontSize: 11, color: "#65756C", marginTop: 3 },
  weekDuration: { flexDirection: "row", alignItems: "center", gap: 6, borderTopWidth: 1, borderTopColor: "#E8EDE9", paddingTop: 12 },
  weekDurationText: { fontSize: 12, color: "#65756C" },
  title: {
    fontSize: 26,
    color: "#1a1a1a",
    fontWeight: "900",
    textAlign: "center",
    marginBottom: 20,
  },
  loadingText: {
    color: "#216C50",
    fontSize: 16,
    marginTop: 10,
  },
  offlineBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#888",
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginBottom: 12,
    alignSelf: "center",
  },
  offlineBannerText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  emptyState: {
    paddingVertical: 24,
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
    backgroundColor: "#ffffff",
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#D9E5DD",
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
    color: "#216C50",
  },
  summaryRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
    marginBottom: 8,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  summaryText: { fontSize: 13, color: "#65756C", flexShrink: 1 },
  sessionCard: {
    backgroundColor: "#F3F8F4",
    borderRadius: 10,
    padding: 12,
    marginTop: 10,
    borderLeftWidth: 4,
    borderLeftColor: "#4CAF50",
    borderWidth: 1,
    borderColor: "#D9E5DD",
  },
  sessionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  exerciseName: {
    flexShrink: 1,
    fontSize: 16,
    fontWeight: "700",
    color: "#216C50",
  },
  machineText: { fontSize: 14, color: "#666", marginBottom: 4 },
  durationText: { fontSize: 12, color: "#216C50", fontWeight: "600" },
  setsText: { fontSize: 12, color: "#666", marginTop: 3 },
});
