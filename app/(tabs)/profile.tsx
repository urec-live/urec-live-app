import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useAuth } from "../../contexts/AuthContext";
import { useWorkout } from "../../contexts/WorkoutContext";
import { usePlan } from "../../contexts/PlanContext";
import StatsCard from "../../components/StatsCard";
import StreakDisplay from "../../components/StreakDisplay";
import WeeklyChart from "../../components/WeeklyChart";
import PRList from "../../components/PRList";
import {
  sessionAPI,
  SessionStatsResponse,
  PersonalRecord,
} from "@/services/sessionAPI";

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

function formatVolume(lbs: number): string {
  if (lbs >= 1000000) return `${(lbs / 1000000).toFixed(1)}M`;
  if (lbs >= 1000) return `${(lbs / 1000).toFixed(1)}K`;
  return String(Math.round(lbs));
}

export default function Profile() {
  const { signOut, user } = useAuth();
  const { resetWorkout } = useWorkout();
  const { activePlan } = usePlan();
  const router = useRouter();

  const [stats, setStats] = useState<SessionStatsResponse | null>(null);
  const [prs, setPrs] = useState<PersonalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [chartMode, setChartMode] = useState<"sessions" | "volume">("sessions");

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      const load = async () => {
        try {
          const [statsData, prsData] = await Promise.all([
            sessionAPI.getMyStats(),
            sessionAPI.getMyPRs(),
          ]);
          if (!cancelled) {
            setStats(statsData);
            setPrs(prsData);
          }
        } catch {
          // silently handle
        } finally {
          if (!cancelled) setLoading(false);
        }
      };
      setLoading(true);
      load();
      return () => { cancelled = true; };
    }, [])
  );

  const handleLogoutPress = () => {
    if (Platform.OS === "web") {
      if (window.confirm("Are you sure you want to log out?")) {
        resetWorkout();
        signOut();
        router.replace("/(auth)/login");
      }
      return;
    }
    Alert.alert(
      "Logout",
      "Are you sure you want to log out?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Logout",
          onPress: () => {
            resetWorkout();
            signOut();
            router.replace("/(auth)/login");
          },
          style: "destructive",
        },
      ]
    );
  };

  return (
    <LinearGradient colors={["#ffffff", "#f5f5f5", "#ffffff"]} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* User Info */}
        <View style={styles.userSection}>
          <MaterialCommunityIcons name="account-circle" size={64} color="#4CAF50" />
          <Text style={styles.username}>{user?.username || "User"}</Text>
          <Text style={styles.email}>{user?.email || ""}</Text>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4CAF50" />
          </View>
        ) : stats ? (
          <>
            {/* Streak */}
            <View style={styles.section}>
              <StreakDisplay
                currentStreak={stats.currentStreak}
                longestStreak={stats.longestStreak}
              />
            </View>

            {/* Quick Stats */}
            <View style={styles.statsRow}>
              <StatsCard
                icon="dumbbell"
                label="Workouts"
                value={stats.totalSessions}
              />
              <StatsCard
                icon="clock-outline"
                label="Total Time"
                value={formatDuration(stats.totalDurationSeconds)}
              />
              <StatsCard
                icon="weight"
                label="Volume"
                value={formatVolume(stats.totalVolumeLbs)}
                subtitle="lbs"
              />
            </View>

            {/* Weekly Chart with toggle */}
            <View style={styles.section}>
              <View style={styles.chartToggle}>
                <Pressable
                  style={[styles.toggleBtn, chartMode === "sessions" && styles.toggleBtnActive]}
                  onPress={() => setChartMode("sessions")}
                >
                  <Text style={[styles.toggleText, chartMode === "sessions" && styles.toggleTextActive]}>
                    Sessions
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.toggleBtn, chartMode === "volume" && styles.toggleBtnActive]}
                  onPress={() => setChartMode("volume")}
                >
                  <Text style={[styles.toggleText, chartMode === "volume" && styles.toggleTextActive]}>
                    Volume
                  </Text>
                </Pressable>
              </View>
              <WeeklyChart
                sessionsPerWeek={stats.sessionsPerWeek}
                volumePerWeek={stats.volumePerWeek}
                mode={chartMode}
              />
            </View>

            {/* Muscle Group Breakdown */}
            {stats.muscleGroupBreakdown && Object.keys(stats.muscleGroupBreakdown).length > 0 && (
              <View style={styles.section}>
                <View style={styles.breakdownContainer}>
                  <Text style={styles.breakdownTitle}>Muscle Groups</Text>
                  {Object.entries(stats.muscleGroupBreakdown).map(([group, count], idx, arr) => {
                    const maxCount = Math.max(...Object.values(stats.muscleGroupBreakdown));
                    const pct = maxCount > 0 ? (count / maxCount) * 100 : 0;
                    return (
                      <View
                        key={group}
                        style={[styles.breakdownRow, idx < arr.length - 1 && styles.breakdownRowBorder]}
                      >
                        <Text style={styles.breakdownLabel}>{group}</Text>
                        <View style={styles.breakdownBarContainer}>
                          <View style={[styles.breakdownBar, { width: `${pct}%` }]} />
                        </View>
                        <Text style={styles.breakdownCount}>{count}</Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Personal Records */}
            <View style={styles.section}>
              <PRList records={prs} limit={5} />
            </View>
          </>
        ) : null}

        {/* Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Settings</Text>
          <Pressable
            style={styles.settingsRow}
            onPress={() => router.push("/settings/plan" as any)}
          >
            <View style={styles.settingsLeft}>
              <MaterialCommunityIcons name="calendar-clock" size={24} color="#4CAF50" />
              <View>
                <Text style={styles.settingsLabel}>Workout Plan</Text>
                <Text style={styles.settingsDescription}>
                  {activePlan ? activePlan.name : "Set your weekly workout schedule"}
                </Text>
              </View>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={24} color="#ccc" />
          </Pressable>
        </View>

        {/* Logout */}
        <View style={styles.section}>
          <Pressable style={styles.logoutButton} onPress={handleLogoutPress}>
            <MaterialCommunityIcons name="logout" size={20} color="#fff" />
            <Text style={styles.logoutButtonText}>Logout</Text>
          </Pressable>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 30,
    paddingBottom: 40,
  },
  userSection: {
    alignItems: "center",
    marginBottom: 20,
  },
  username: {
    fontSize: 22,
    fontWeight: "900",
    color: "#1a1a1a",
    marginTop: 8,
  },
  email: {
    fontSize: 14,
    color: "#888",
    marginTop: 2,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: "center",
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#999",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  chartToggle: {
    flexDirection: "row",
    marginBottom: 8,
    gap: 8,
  },
  toggleBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "#f0f0f0",
  },
  toggleBtnActive: {
    backgroundColor: "#4CAF50",
  },
  toggleText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#888",
  },
  toggleTextActive: {
    color: "#fff",
  },
  breakdownContainer: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  breakdownTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 12,
  },
  breakdownRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
  },
  breakdownRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  breakdownLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1a1a1a",
    width: 90,
  },
  breakdownBarContainer: {
    flex: 1,
    height: 8,
    backgroundColor: "#f0f0f0",
    borderRadius: 4,
    marginHorizontal: 10,
    overflow: "hidden",
  },
  breakdownBar: {
    height: 8,
    backgroundColor: "#4CAF50",
    borderRadius: 4,
  },
  breakdownCount: {
    fontSize: 14,
    fontWeight: "700",
    color: "#4CAF50",
    width: 30,
    textAlign: "right",
  },
  settingsRow: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  settingsLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  settingsLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1a1a1a",
  },
  settingsDescription: {
    fontSize: 13,
    color: "#888",
    marginTop: 2,
  },
  logoutButton: {
    backgroundColor: "#ff4444",
    borderRadius: 10,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderWidth: 2,
    borderColor: "#ff6666",
  },
  logoutButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
});
