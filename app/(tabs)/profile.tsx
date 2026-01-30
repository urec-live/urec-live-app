import React from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Colors } from "@/constants/theme";
import { useAuth } from "../../contexts/AuthContext";
import { DayKey, DAY_KEYS, useSplit } from "../../contexts/SplitContext";
import { analyticsAPI, SessionUsageSummary, UserStats } from "../../services/analyticsAPI";
import { userAPI } from "../../services/userAPI";

export default function Profile() {
  const { signOut, endGuest, isGuest, user, isSignedIn, loading: authLoading } = useAuth();
  const router = useRouter();
  const {
    mode,
    manualSplit,
    autoSplit,
    isRestDay,
    todayGroups,
    splitOptions,
    setMode,
    updateDaySplit,
  } = useSplit();
  const [editingDay, setEditingDay] = React.useState<DayKey | null>(null);
  const [draftGroups, setDraftGroups] = React.useState<string[]>([]);
  const [userStats, setUserStats] = React.useState<UserStats | null>(null);
  const [usageSummary, setUsageSummary] = React.useState<SessionUsageSummary | null>(null);
  const [overallSummary, setOverallSummary] = React.useState<SessionUsageSummary | null>(null);
  const [usageLoading, setUsageLoading] = React.useState(false);
  const retryRef = React.useRef(0);
  const displayName = isGuest ? null : user?.username ?? null;

  const formatDuration = (seconds: number) => {
    if (seconds <= 0) return "0m";
    const mins = Math.floor(seconds / 60);
    const hrs = Math.floor(mins / 60);
    const remMins = mins % 60;
    if (hrs > 0) return `${hrs}h ${remMins}m`;
    return `${remMins}m`;
  };

  const formatPeakHour = (hour?: number | null) => {
    if (hour === null || hour === undefined) return "N/A";
    const suffix = hour >= 12 ? "PM" : "AM";
    const display = hour % 12 === 0 ? 12 : hour % 12;
    return `${display} ${suffix}`;
  };

  React.useEffect(() => {
    if (authLoading || !isSignedIn || isGuest || !user) {
      setUsageSummary(null);
      setOverallSummary(null);
      setUserStats(null);
      return;
    }

    const loadUsage = async () => {
      try {
        setUsageLoading(true);
        const token = await AsyncStorage.getItem("accessToken");
        if (!token) {
          setUsageLoading(false);
          return;
        }
        const [mine, overall, stats] = await Promise.all([
          analyticsAPI.getMyUsage(7),
          analyticsAPI.getOverallUsage(7),
          analyticsAPI.getMyStats()
        ]);
        setUsageSummary(mine);
        setOverallSummary(overall);
        setUserStats(stats);
      } catch (error: any) {
        if (error?.response?.status === 401 && retryRef.current < 1) {
          retryRef.current += 1;
          setTimeout(loadUsage, 500);
          return;
        }
        console.error("Failed to load usage summary:", error);
        setUsageSummary(null);
        setOverallSummary(null);
      } finally {
        setUsageLoading(false);
      }
    };

    loadUsage();
  }, [authLoading, isSignedIn, isGuest, user, user?.username]);


  const handleDeleteAccountPress = () => {
    Alert.alert(
      "Delete Account",
      "Are you sure? This action cannot be undone. All your history will be lost.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem("accessToken");
              if (!token) return;
              await userAPI.deleteAccount();
              await signOut();
            } catch (error) {
              Alert.alert("Error", "Failed to delete account");
            }
          }
        }
      ]
    );
  };

  const handleLogoutPress = () => {
    Alert.alert(
      isGuest ? "Exit Guest Mode" : "Logout",
      isGuest
        ? "Return to login to use a full account."
        : "Are you sure you want to log out?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: isGuest ? "Exit" : "Logout",
          onPress: () => {
            if (isGuest) {
              endGuest();
            } else {
              signOut();
            }
          },
          style: "destructive",
        },
      ]
    );
  };

  const dayLabels: Record<DayKey, string> = {
    Mon: "Monday",
    Tue: "Tuesday",
    Wed: "Wednesday",
    Thu: "Thursday",
    Fri: "Friday",
    Sat: "Saturday",
    Sun: "Sunday",
  };

  const openEditor = (day: DayKey) => {
    setEditingDay(day);
    setDraftGroups(mode === "manual" ? manualSplit[day] || [] : []);
  };

  const toggleGroup = (group: string) => {
    setDraftGroups((prev) =>
      prev.includes(group) ? prev.filter((g) => g !== group) : [...prev, group]
    );
  };

  const saveDay = async () => {
    if (!editingDay) return;
    await updateDaySplit(editingDay, draftGroups);
    setEditingDay(null);
  };

  const activeSplit = mode === "manual" ? manualSplit : autoSplit;

  return (
    <View style={{ flex: 1, backgroundColor: Colors.light.backgroundSecondary }}>
      <ScrollView contentContainerStyle={styles.container}>
        <MaterialCommunityIcons name="account-circle" size={80} color={Colors.light.primary} />
        <Text style={styles.title}>{displayName || "My Profile"}</Text>

        {!isGuest && (
          <View style={styles.statsCard}>
            <View style={styles.statsHeader}>
              <Text style={styles.statsTitle}>Personal Insights</Text>
              <MaterialCommunityIcons name="fire" size={24} color={userStats?.currentStreak ? "#FF5722" : "#ccc"} />
            </View>

            {usageLoading ? (
              <Text style={styles.statsSubtle}>Crunching numbers...</Text>
            ) : userStats ? (
              <View>
                <View style={styles.statsRow}>
                  <View style={[styles.statsItem, { backgroundColor: '#FFF3E0', borderColor: '#FFE0B2' }]}>
                    <Text style={[styles.statsValue, { color: '#E65100' }]}>{userStats.currentStreak} Days</Text>
                    <Text style={styles.statsLabel}>Current Streak</Text>
                  </View>
                  <View style={styles.statsItem}>
                    <Text style={styles.statsValue}>{userStats.totalWorkoutsThisWeek}</Text>
                    <Text style={styles.statsLabel}>Workouts This Week</Text>
                  </View>
                  <View style={styles.statsItem}>
                    <Text style={styles.statsValue}>{userStats.totalHoursThisWeek}h</Text>
                    <Text style={styles.statsLabel}>Time Spent</Text>
                  </View>
                </View>

                <Text style={[styles.statsSectionLabel, { marginTop: 15 }]}>Weekly Muscle Split</Text>
                <View style={styles.splitRow}>
                  {Object.entries(userStats.weeklySplit).length > 0 ? (
                    Object.entries(userStats.weeklySplit)
                      .sort(([, a], [, b]) => b - a)
                      .map(([group, count]) => (
                        <View key={group} style={styles.splitTag}>
                          <Text style={styles.splitTagText}>{group}: {count}</Text>
                        </View>
                      ))
                  ) : (
                    <Text style={styles.statsSubtle}>No specific muscle groups yet.</Text>
                  )}
                </View>
              </View>
            ) : (
              <Text style={styles.statsSubtle}>No stats available.</Text>
            )}
          </View>
        )}

        {!isGuest && (
          <View style={[styles.statsCard, { marginTop: 20 }]}>
            <View style={styles.statsHeader}>
              <Text style={styles.statsTitle}>Usage Stats (7 days)</Text>
              <MaterialCommunityIcons name="chart-line" size={20} color="#4CAF50" />
            </View>
            {usageLoading ? (
              <Text style={styles.statsSubtle}>Loading stats...</Text>
            ) : usageSummary ? (
              <>
                <Text style={styles.statsSectionLabel}>You</Text>
                <View style={styles.statsRow}>
                  <View style={styles.statsItem}>
                    <Text style={styles.statsValue}>{usageSummary.totalSessions}</Text>
                    <Text style={styles.statsLabel}>Sessions</Text>
                  </View>
                  <View style={styles.statsItem}>
                    <Text style={styles.statsValue}>
                      {formatDuration(usageSummary.averageDurationSeconds)}
                    </Text>
                    <Text style={styles.statsLabel}>Avg</Text>
                  </View>
                  <View style={styles.statsItem}>
                    <Text style={styles.statsValue}>{formatPeakHour(usageSummary.peakStartHour)}</Text>
                    <Text style={styles.statsLabel}>Peak</Text>
                  </View>
                </View>
                {overallSummary && (
                  <>
                    <Text style={styles.statsSectionLabel}>Overall</Text>
                    <View style={styles.statsRow}>
                      <View style={styles.statsItem}>
                        <Text style={styles.statsValue}>{overallSummary.totalSessions}</Text>
                        <Text style={styles.statsLabel}>Sessions</Text>
                      </View>
                      <View style={styles.statsItem}>
                        <Text style={styles.statsValue}>
                          {formatDuration(overallSummary.averageDurationSeconds)}
                        </Text>
                        <Text style={styles.statsLabel}>Avg</Text>
                      </View>
                      <View style={styles.statsItem}>
                        <Text style={styles.statsValue}>
                          {formatPeakHour(overallSummary.peakStartHour)}
                        </Text>
                        <Text style={styles.statsLabel}>Peak</Text>
                      </View>
                    </View>
                  </>
                )}
              </>
            ) : (
              <Text style={styles.statsSubtle}>No usage data yet.</Text>
            )}
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Weekly Split</Text>
          <Text style={styles.sectionSubtitle}>
            {mode === "manual"
              ? "Set your own plan for each day."
              : "Auto-suggested from the last 4 weeks of workouts."}
          </Text>

          <View style={styles.modeToggle}>
            <Pressable
              style={[styles.modeButton, mode === "manual" && styles.modeButtonActive]}
              onPress={() => setMode("manual")}
            >
              <Text style={[styles.modeButtonText, mode === "manual" && styles.modeButtonTextActive]}>
                Manual
              </Text>
            </Pressable>
            <Pressable
              style={[styles.modeButton, mode === "auto" && styles.modeButtonActive]}
              onPress={() => setMode("auto")}
            >
              <Text style={[styles.modeButtonText, mode === "auto" && styles.modeButtonTextActive]}>
                Auto
              </Text>
            </Pressable>
          </View>

          <View style={styles.todayCard}>
            <Text style={styles.todayTitle}>Today&apos;s Focus</Text>
            {isRestDay ? (
              <Text style={styles.todayText}>
                Hey looks like it&apos;s your rest day. Consider relaxing today, recovery is as
                important as working out, otherwise you could burn out and achieve diminishing returns
                :)
              </Text>
            ) : (
              <Text style={styles.todayText}>{todayGroups.join(", ")}</Text>
            )}
          </View>

          <View style={styles.dayList}>
            {DAY_KEYS.map((day) => (
              <Pressable
                key={day}
                style={styles.dayRow}
                onPress={() => mode === "manual" && openEditor(day)}
              >
                <View>
                  <Text style={styles.dayLabel}>{dayLabels[day]}</Text>
                  <Text style={styles.dayValue}>
                    {activeSplit[day]?.length ? activeSplit[day].join(", ") : "Rest day"}
                  </Text>
                </View>
                {mode === "manual" && (
                  <MaterialCommunityIcons name="pencil" size={18} color="#4CAF50" />
                )}
              </Pressable>
            ))}
          </View>
        </View>

        {!isGuest && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Account Settings</Text>
            <View style={styles.settingsList}>
              <Pressable
                style={styles.settingRow}
                onPress={() => router.push("/modal/change-password")}
              >
                <View style={styles.settingContent}>
                  <MaterialCommunityIcons name="lock-reset" size={24} color="#666" />
                  <Text style={styles.settingLabel}>Change Password</Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={24} color="#ccc" />
              </Pressable>

              <View style={styles.separator} />

              <View style={styles.settingRow}>
                <View style={styles.settingContent}>
                  <MaterialCommunityIcons
                    name={user?.pushNotificationsEnabled ? "bell-ring" : "bell-off"}
                    size={24}
                    color="#666"
                  />
                  <Text style={styles.settingLabel}>Push Notifications</Text>
                </View>
                <Pressable
                  onPress={async () => {
                    try {
                      const newValue = !user?.pushNotificationsEnabled;
                      // Optimistic update
                      // You might want to update context here, but simplified:
                      await userAPI.updateSettings({ pushNotificationsEnabled: newValue });
                      // Refresh user to get definitive state
                      if (useAuth().refreshUser) {
                        await useAuth().refreshUser();
                      }
                    } catch (e) {
                      Alert.alert("Error", "Failed to update notification settings");
                    }
                  }}
                  style={[
                    styles.toggleSwitch,
                    user?.pushNotificationsEnabled && styles.toggleSwitchActive
                  ]}
                >
                  <View style={[
                    styles.toggleKnob,
                    user?.pushNotificationsEnabled && styles.toggleKnobActive
                  ]} />
                </Pressable>
              </View>

              <View style={styles.separator} />

              <Pressable
                style={styles.settingRow}
                onPress={() => router.push("/modal/update-email")}
              >
                <View style={styles.settingContent}>
                  <MaterialCommunityIcons name="email-edit" size={24} color="#666" />
                  <Text style={styles.settingLabel}>Update Email</Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={24} color="#ccc" />
              </Pressable>

              <View style={styles.separator} />

              <Pressable
                style={styles.settingRow}
                onPress={() => router.push("/admin" as any)}
              >
                <View style={styles.settingContent}>
                  <MaterialCommunityIcons name="shield-account" size={24} color="#4CAF50" />
                  <Text style={[styles.settingLabel, { color: "#4CAF50" }]}>Admin Dashboard</Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={24} color="#ccc" />
              </Pressable>
            </View>
          </View>
        )}

        {!isGuest && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Danger Zone</Text>
            <View style={[styles.settingsList, { borderColor: '#ff4444' }]}>
              <Pressable
                style={styles.settingRow}
                onPress={handleDeleteAccountPress}
              >
                <View style={styles.settingContent}>
                  <MaterialCommunityIcons name="delete-forever" size={24} color="#ff4444" />
                  <Text style={[styles.settingLabel, { color: "#ff4444" }]}>Delete Account</Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={24} color="#ccc" />
              </Pressable>
            </View>
          </View>
        )}

        <Pressable style={styles.logoutButton} onPress={handleLogoutPress}>
          <MaterialCommunityIcons name="logout" size={20} color="#fff" />
          <Text style={styles.logoutButtonText}>{isGuest ? "Exit Guest" : "Logout"}</Text>
        </Pressable>
      </ScrollView >

      <Modal visible={!!editingDay} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {editingDay ? dayLabels[editingDay] : "Edit Day"}
            </Text>
            <Text style={styles.modalSubtitle}>Pick muscle groups for this day.</Text>

            <View style={styles.chipGrid}>
              {splitOptions.map((group) => {
                const selected = draftGroups.includes(group);
                return (
                  <Pressable
                    key={group}
                    style={[styles.chip, selected && styles.chipSelected]}
                    onPress={() => toggleGroup(group)}
                  >
                    <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                      {group}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.modalActions}>
              <Pressable style={styles.secondaryButton} onPress={() => setEditingDay(null)}>
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.primaryButton} onPress={saveDay}>
                <Text style={styles.primaryButtonText}>Save</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 25,
    paddingTop: 40,
    paddingBottom: 80,
    alignItems: "center",
  },
  title: {
    fontSize: 26,
    fontWeight: "900",
    color: Colors.light.text,
    marginTop: 20,
    marginBottom: 10,
    letterSpacing: -0.5,
  },
  statsCard: {
    width: "100%",
    backgroundColor: Colors.light.surface,
    borderRadius: 16,
    padding: 20,
    marginTop: 16,
    shadowColor: Colors.light.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: "transparent",
  },
  statsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: Colors.light.text,
    letterSpacing: -0.5,
  },
  statsSubtle: {
    color: Colors.light.icon,
  },
  statsSectionLabel: {
    marginTop: 8,
    marginBottom: 8,
    color: Colors.light.primary,
    fontWeight: "700",
    textTransform: "uppercase",
    fontSize: 12,
    letterSpacing: 0.6,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  statsItem: {
    flex: 1,
    padding: 12,
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: 12,
    borderWidth: 0,
    alignItems: "center",
  },
  statsValue: {
    fontSize: 18,
    fontWeight: "900",
    color: Colors.light.text,
  },
  statsLabel: {
    marginTop: 4,
    fontSize: 12,
    color: Colors.light.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  section: {
    width: "100%",
    backgroundColor: Colors.light.surface,
    borderRadius: 16,
    padding: 20,
    marginTop: 20,
    shadowColor: Colors.light.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: "transparent",
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: Colors.light.text,
    letterSpacing: -0.5,
  },
  sectionSubtitle: {
    color: Colors.light.textSecondary,
    marginTop: 6,
  },
  modeToggle: {
    flexDirection: "row",
    marginTop: 16,
    backgroundColor: "#f5f5f5",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    overflow: "hidden",
  },
  modeButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
  },
  modeButtonActive: {
    backgroundColor: "#4CAF50",
  },
  modeButtonText: {
    color: "#4CAF50",
    fontWeight: "700",
  },
  modeButtonTextActive: {
    color: "#ffffff",
  },
  todayCard: {
    marginTop: 16,
    padding: 14,
    borderRadius: 12,
    backgroundColor: "#f5f5f5",
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  todayTitle: {
    color: "#1a1a1a",
    fontWeight: "800",
    marginBottom: 6,
  },
  todayText: {
    color: "#666",
    lineHeight: 20,
  },
  dayList: {
    marginTop: 16,
    gap: 10,
  },
  dayRow: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  dayLabel: {
    color: "#1a1a1a",
    fontWeight: "700",
    marginBottom: 4,
  },
  dayValue: {
    color: "#666",
  },
  logoutButton: {
    backgroundColor: "#ff4444",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 30,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 2,
    borderColor: "#ff6666",
    marginTop: 30,
  },
  logoutButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    borderTopWidth: 1,
    borderColor: "#e0e0e0",
  },
  modalTitle: {
    color: "#1a1a1a",
    fontSize: 22,
    fontWeight: "800",
  },
  modalSubtitle: {
    color: "#666",
    marginTop: 6,
    marginBottom: 12,
  },
  chipGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    backgroundColor: "#f5f5f5",
  },
  chipSelected: {
    backgroundColor: "#4CAF50",
  },
  chipText: {
    color: "#4CAF50",
    fontWeight: "600",
  },
  chipTextSelected: {
    color: "#ffffff",
    fontWeight: "700",
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
    gap: 12,
  },
  secondaryButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    alignItems: "center",
  },
  secondaryButtonText: {
    color: "#4CAF50",
    fontWeight: "700",
  },
  primaryButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "#4CAF50",
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#ffffff",
    fontWeight: "800",
  },
  settingsList: {
    marginTop: 15,
    backgroundColor: "#f9f9f9",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    overflow: "hidden",
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: "#fff",
  },
  settingContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  settingLabel: {
    fontSize: 16,
    color: "#333",
    fontWeight: "600",
  },
  separator: {
    height: 1,
    backgroundColor: "#e0e0e0",
    marginLeft: 52, // Align with text
  },
  toggleSwitch: {
    width: 44,
    height: 24,
    borderRadius: 999,
    backgroundColor: "#ccc",
    justifyContent: "center",
    padding: 2,
  },
  toggleSwitchActive: {
    backgroundColor: "#4CAF50",
  },
  toggleKnob: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#fff",
  },
  toggleKnobActive: {
    alignSelf: "flex-end",
  },
  splitRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8
  },
  splitTag: {
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#C8E6C9'
  },
  splitTagText: {
    color: '#2E7D32',
    fontWeight: '600',
    fontSize: 12
  }
});
