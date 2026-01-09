import React from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useAuth } from "../../contexts/AuthContext";
import { DayKey, DAY_KEYS, useSplit } from "../../contexts/SplitContext";

export default function Profile() {
  const { signOut } = useAuth();
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

  const handleLogoutPress = () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to log out?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Logout",
          onPress: () => {
            signOut();
            router.replace("/(auth)/login");
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
    <LinearGradient colors={["#ffffff", "#f5f5f5", "#ffffff"]} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.container}>
        <MaterialCommunityIcons name="account-circle" size={80} color="#4CAF50" />
        <Text style={styles.title}>My Profile</Text>

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

        <Pressable style={styles.logoutButton} onPress={handleLogoutPress}>
          <MaterialCommunityIcons name="logout" size={20} color="#fff" />
          <Text style={styles.logoutButtonText}>Logout</Text>
        </Pressable>
      </ScrollView>

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
    </LinearGradient>
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
    color: "#1a1a1a",
    marginTop: 20,
    marginBottom: 10,
  },
  section: {
    width: "100%",
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    padding: 18,
    marginTop: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1a1a1a",
  },
  sectionSubtitle: {
    color: "#666",
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
});
