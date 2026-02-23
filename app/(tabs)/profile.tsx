import React from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View, StatusBar } from "react-native";
import { Colors } from "@/constants/theme";
import { useAuth } from "../../contexts/AuthContext";
import { DayKey, DAY_KEYS, useSplit } from "../../contexts/SplitContext";
import { analyticsAPI, SessionUsageSummary, UserStats } from "../../services/analyticsAPI";
import { userAPI } from "../../services/userAPI";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";

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
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <LinearGradient
            colors={[Colors.dark.primary, Colors.dark.secondary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.avatarBorder}
          >
            <View style={styles.avatarInner}>
              <MaterialCommunityIcons name="account" size={48} color={Colors.dark.text} />
            </View>
          </LinearGradient>
          <Text style={styles.title}>{displayName || "Guest User"}</Text>
          <Text style={styles.subtitle}>{isGuest ? "Guest Mode" : "Premium Member"}</Text>
        </View>

        {!isGuest && (
          <View style={styles.statsCardWrapper}>
            <LinearGradient
              colors={[Colors.dark.surface, 'rgba(30, 41, 59, 0.4)']}
              style={styles.statsCard}
            >
              <View style={styles.statsHeader}>
                <Text style={styles.statsTitle}>PERSONAL INSIGHTS</Text>
                <MaterialCommunityIcons name="fire" size={24} color={userStats?.currentStreak ? Colors.dark.accentAmber : Colors.dark.icon} />
              </View>

              {usageLoading ? (
                <Text style={styles.statsSubtle}>Crunching numbers...</Text>
              ) : userStats ? (
                <View>
                  <View style={styles.statsRow}>
                    <View style={[styles.statsItem, { borderColor: Colors.dark.accentAmber }]}>
                      <Text style={[styles.statsValue, { color: Colors.dark.accentAmber }]}>{userStats.currentStreak}</Text>
                      <Text style={styles.statsLabel}>Streak Days</Text>
                    </View>
                    <View style={styles.statsItem}>
                      <Text style={styles.statsValue}>{userStats.totalWorkoutsThisWeek}</Text>
                      <Text style={styles.statsLabel}>Workouts</Text>
                    </View>
                    <View style={styles.statsItem}>
                      <Text style={styles.statsValue}>{userStats.totalHoursThisWeek}h</Text>
                      <Text style={styles.statsLabel}>Time</Text>
                    </View>
                  </View>

                  <Text style={[styles.statsSectionLabel, { marginTop: 16 }]}>Weekly Focus</Text>
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
                      <Text style={styles.statsSubtle}>No data yet.</Text>
                    )}
                  </View>
                </View>
              ) : (
                <Text style={styles.statsSubtle}>No stats available.</Text>
              )}
            </LinearGradient>
          </View>
        )}

        {/* Weekly Split Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>WEEKLY SPLIT</Text>

          <View style={styles.modeToggle}>
            <Pressable
              style={[styles.modeButton, mode === "manual" && styles.modeButtonActive]}
              onPress={() => setMode("manual")}
            >
              <Text style={[styles.modeButtonText, mode === "manual" && styles.modeButtonTextActive]}>
                MANUAL
              </Text>
            </Pressable>
            <Pressable
              style={[styles.modeButton, mode === "auto" && styles.modeButtonActive]}
              onPress={() => setMode("auto")}
            >
              <Text style={[styles.modeButtonText, mode === "auto" && styles.modeButtonTextActive]}>
                AUTO
              </Text>
            </Pressable>
          </View>

          <LinearGradient
            colors={[Colors.dark.secondary, Colors.dark.surface]}
            style={styles.todayCard}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          >
            <Text style={styles.todayTitle}>TODAY&apos;S FOCUS</Text>
            {isRestDay ? (
              <Text style={styles.todayText}>Rest day. Take it easy.</Text>
            ) : (
              <Text style={styles.todayText}>{todayGroups.join(" · ")}</Text>
            )}
          </LinearGradient>

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
                  <MaterialCommunityIcons name="pencil" size={16} color={Colors.dark.primary} />
                )}
              </Pressable>
            ))}
          </View>
        </View>

        {!isGuest && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>SETTINGS</Text>
            <View style={styles.settingsList}>
              <Pressable
                style={styles.settingRow}
                onPress={() => router.push("/modal/change-password")}
              >
                <View style={styles.settingContent}>
                  <MaterialCommunityIcons name="lock-reset" size={24} color={Colors.dark.textSecondary} />
                  <Text style={styles.settingLabel}>Change Password</Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={24} color="#666" />
              </Pressable>

              <View style={styles.separator} />

              <View style={styles.settingRow}>
                <View style={styles.settingContent}>
                  <MaterialCommunityIcons name="bell-ring" size={24} color={Colors.dark.textSecondary} />
                  <Text style={styles.settingLabel}>Push Notifications</Text>
                </View>
                <Pressable
                  onPress={async () => {
                    try {
                      const newValue = !user?.pushNotificationsEnabled;
                      await userAPI.updateSettings({ pushNotificationsEnabled: newValue });
                      if (useAuth().refreshUser) await useAuth().refreshUser();
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
                  <MaterialCommunityIcons name="email-edit" size={24} color={Colors.dark.textSecondary} />
                  <Text style={styles.settingLabel}>Update Email</Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={24} color="#666" />
              </Pressable>

              <View style={styles.separator} />

              <Pressable
                style={styles.settingRow}
                onPress={() => router.push("/admin" as any)}
              >
                <View style={styles.settingContent}>
                  <MaterialCommunityIcons name="shield-account" size={24} color={Colors.dark.primary} />
                  <Text style={[styles.settingLabel, { color: Colors.dark.primary }]}>Admin Dashboard</Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={24} color="#666" />
              </Pressable>
            </View>
          </View>
        )}

        {!isGuest && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: Colors.dark.accentRed }]}>DANGER ZONE</Text>
            <View style={[styles.settingsList, { borderColor: Colors.dark.accentRed }]}>
              <Pressable
                style={styles.settingRow}
                onPress={handleDeleteAccountPress}
              >
                <View style={styles.settingContent}>
                  <MaterialCommunityIcons name="delete-forever" size={24} color={Colors.dark.accentRed} />
                  <Text style={[styles.settingLabel, { color: Colors.dark.accentRed }]}>Delete Account</Text>
                </View>
              </Pressable>
            </View>
          </View>
        )}

        <Pressable style={styles.logoutButton} onPress={handleLogoutPress}>
          <MaterialCommunityIcons name="logout" size={20} color="#fff" />
          <Text style={styles.logoutButtonText}>{isGuest ? "Exit Guest" : "Logout"}</Text>
        </Pressable>
      </ScrollView >

      <Modal visible={!!editingDay} transparent animationType="fade">
        <BlurView intensity={20} tint="dark" style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {editingDay ? dayLabels[editingDay] : "Edit Day"}
            </Text>
            <Text style={styles.modalSubtitle}>Select muscle groups</Text>

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
        </BlurView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 80,
    alignItems: "center",
  },

  // Header
  profileHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarBorder: {
    width: 88,
    height: 88,
    borderRadius: 44,
    padding: 2,
    marginBottom: 12,
  },
  avatarInner: {
    flex: 1,
    backgroundColor: Colors.dark.background,
    borderRadius: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: "900",
    color: Colors.dark.text,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
    marginTop: 4,
  },

  // Stats
  statsCardWrapper: {
    width: "100%",
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 24,
  },
  statsCard: {
    padding: 20,
    minHeight: 180,
  },
  statsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  statsTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 1,
  },
  statsSubtle: {
    color: Colors.dark.textSecondary,
    fontSize: 12,
  },
  statsSectionLabel: {
    fontSize: 10,
    color: Colors.dark.primary,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 8,
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
  },
  statsItem: {
    flex: 1,
    padding: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: "center",
  },
  statsValue: {
    fontSize: 18,
    fontWeight: "900",
    color: Colors.dark.text,
  },
  statsLabel: {
    marginTop: 4,
    fontSize: 10,
    color: Colors.dark.textSecondary,
    textTransform: "uppercase",
    fontWeight: '600',
  },
  splitRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  splitTag: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  splitTagText: {
    color: Colors.dark.textSecondary,
    fontSize: 11,
    fontWeight: "600",
  },

  // Sections
  section: {
    width: "100%",
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: Colors.dark.textSecondary,
    marginBottom: 12,
    letterSpacing: 1,
    paddingLeft: 4,
  },

  // Weekly Split
  modeToggle: {
    flexDirection: "row",
    backgroundColor: Colors.dark.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: "hidden",
    marginBottom: 12,
  },
  modeButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
  },
  modeButtonActive: {
    backgroundColor: Colors.dark.primary, // active bg
  },
  modeButtonText: {
    color: Colors.dark.textSecondary,
    fontWeight: "700",
    fontSize: 12,
    letterSpacing: 0.5,
  },
  modeButtonTextActive: {
    color: '#000', // black on neon
  },

  todayCard: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
  },
  todayTitle: {
    color: Colors.dark.text,
    fontWeight: "800",
    fontSize: 12,
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  todayText: {
    color: Colors.dark.textSecondary,
    fontSize: 14,
  },
  dayList: {
    gap: 8,
  },
  dayRow: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 12,
    padding: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  dayLabel: {
    color: Colors.dark.text,
    fontWeight: "700",
    fontSize: 14,
    marginBottom: 2,
  },
  dayValue: {
    color: Colors.dark.textSecondary,
    fontSize: 12,
  },

  // Settings
  settingsList: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    overflow: "hidden",
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: 'transparent', // inherited
  },
  settingContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  settingLabel: {
    fontSize: 14,
    color: Colors.dark.text,
    fontWeight: "600",
  },
  separator: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginLeft: 52,
  },
  toggleSwitch: {
    width: 44,
    height: 24,
    borderRadius: 999,
    backgroundColor: '#333',
    justifyContent: "center",
    padding: 2,
  },
  toggleSwitchActive: {
    backgroundColor: Colors.dark.primary,
  },
  toggleKnob: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFF',
  },
  toggleKnobActive: {
    alignSelf: "flex-end",
  },

  // Logout
  logoutButton: {
    backgroundColor: Colors.dark.accentRed,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 30,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 20,
    shadowColor: Colors.dark.accentRed,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  logoutButtonText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 14,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#1E293B',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.5,
    shadowRadius: 30,
    elevation: 10,
  },
  modalTitle: {
    color: Colors.dark.text,
    fontSize: 20,
    fontWeight: "800",
  },
  modalSubtitle: {
    color: Colors.dark.textSecondary,
    marginTop: 4,
    marginBottom: 20,
  },
  chipGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  chipSelected: {
    backgroundColor: Colors.dark.primary,
    borderColor: Colors.dark.primary,
  },
  chipText: {
    color: Colors.dark.textSecondary,
    fontWeight: "600",
    fontSize: 12,
  },
  chipTextSelected: {
    color: '#000',
    fontWeight: "800",
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 24,
    gap: 12,
  },
  secondaryButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: "center",
  },
  secondaryButtonText: {
    color: Colors.dark.text,
    fontWeight: "700",
  },
  primaryButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: Colors.dark.primary,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#000",
    fontWeight: "800",
  },
});
