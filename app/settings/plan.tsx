import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { usePlan } from "@/contexts/PlanContext";
import { planAPI, DayPlanDto, DayPlanItemDto } from "@/services/planAPI";
import { machineAPI } from "@/services/machineAPI";

const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

interface DayConfig {
  label: string;
  items: { muscleGroup: string; targetCount: number }[];
}

type WeekPlan = Record<number, DayConfig>; // 1-7

export default function PlanEditor() {
  const router = useRouter();
  const { activePlan, refreshActivePlan, refreshTodayPlan } = usePlan();
  const [planName, setPlanName] = useState("My Plan");
  const [weekPlan, setWeekPlan] = useState<WeekPlan>({});
  const [muscleGroups, setMuscleGroups] = useState<string[]>([]);
  const [expandedDay, setExpandedDay] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load muscle groups and existing plan
  useEffect(() => {
    const load = async () => {
      try {
        const groups = await machineAPI.getMuscleGroups();
        setMuscleGroups(groups);
      } catch {
        // Fallback muscle groups
        setMuscleGroups([
          "Chest", "Back", "Shoulders", "Biceps", "Triceps",
          "Quads", "Hamstrings", "Glutes", "Calves", "Abs", "Cardio",
        ]);
      }

      if (activePlan) {
        setPlanName(activePlan.name);
        const existing: WeekPlan = {};
        for (const day of activePlan.days) {
          existing[day.dayOfWeek] = {
            label: day.label || "",
            items: day.items.map((i) => ({
              muscleGroup: i.muscleGroup,
              targetCount: i.targetCount,
            })),
          };
        }
        setWeekPlan(existing);
      }
      setLoading(false);
    };
    load();
  }, [activePlan]);

  const toggleDay = (dow: number) => {
    setExpandedDay(expandedDay === dow ? null : dow);
  };

  const addMuscleToDay = (dow: number, muscleGroup: string) => {
    setWeekPlan((prev) => {
      const day = prev[dow] || { label: "", items: [] };
      // Don't add duplicate
      if (day.items.some((i) => i.muscleGroup === muscleGroup)) return prev;
      return {
        ...prev,
        [dow]: {
          ...day,
          items: [...day.items, { muscleGroup, targetCount: 1 }],
        },
      };
    });
  };

  const removeMuscleFromDay = (dow: number, muscleGroup: string) => {
    setWeekPlan((prev) => {
      const day = prev[dow];
      if (!day) return prev;
      const items = day.items.filter((i) => i.muscleGroup !== muscleGroup);
      if (items.length === 0) {
        const next = { ...prev };
        delete next[dow];
        return next;
      }
      return { ...prev, [dow]: { ...day, items } };
    });
  };

  const updateTargetCount = (dow: number, muscleGroup: string, count: number) => {
    if (count < 1) count = 1;
    if (count > 10) count = 10;
    setWeekPlan((prev) => {
      const day = prev[dow];
      if (!day) return prev;
      return {
        ...prev,
        [dow]: {
          ...day,
          items: day.items.map((i) =>
            i.muscleGroup === muscleGroup ? { ...i, targetCount: count } : i
          ),
        },
      };
    });
  };

  const updateDayLabel = (dow: number, label: string) => {
    setWeekPlan((prev) => {
      const day = prev[dow] || { label: "", items: [] };
      return { ...prev, [dow]: { ...day, label } };
    });
  };

  const handleSave = async () => {
    const days: DayPlanDto[] = Object.entries(weekPlan).map(([dow, config]) => ({
      dayOfWeek: parseInt(dow),
      label: config.label || null,
      items: config.items.map((item, idx) => ({
        muscleGroup: item.muscleGroup,
        targetCount: item.targetCount,
        sortOrder: idx,
      })),
    }));

    setSaving(true);
    try {
      if (activePlan) {
        await planAPI.updatePlan(activePlan.id, { name: planName, days });
      } else {
        await planAPI.createPlan({ name: planName, days });
      }
      await refreshActivePlan();
      await refreshTodayPlan();
      router.back();
    } catch (err) {
      const msg = "Failed to save plan. Please try again.";
      if (Platform.OS === "web") {
        alert(msg);
      } else {
        Alert.alert("Error", msg);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!activePlan) return;

    const doDelete = async () => {
      try {
        await planAPI.deletePlan(activePlan.id);
        await refreshActivePlan();
        await refreshTodayPlan();
        router.back();
      } catch {
        const msg = "Failed to delete plan.";
        if (Platform.OS === "web") {
          alert(msg);
        } else {
          Alert.alert("Error", msg);
        }
      }
    };

    if (Platform.OS === "web") {
      if (window.confirm("Delete this workout plan?")) doDelete();
    } else {
      Alert.alert("Delete Plan", "Delete this workout plan?", [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", onPress: doDelete, style: "destructive" },
      ]);
    }
  };

  if (loading) {
    return (
      <LinearGradient colors={["#ffffff", "#f5f5f5", "#ffffff"]} style={{ flex: 1 }}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={["#ffffff", "#f5f5f5", "#ffffff"]} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <MaterialCommunityIcons name="arrow-left" size={24} color="#1a1a1a" />
          </Pressable>
          <Text style={styles.title}>Workout Plan</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Plan Name */}
        <View style={styles.nameSection}>
          <Text style={styles.label}>Plan Name</Text>
          <TextInput
            style={styles.nameInput}
            value={planName}
            onChangeText={setPlanName}
            placeholder="e.g., PPL Split, Bro Split"
            placeholderTextColor="#bbb"
          />
        </View>

        {/* Week Grid */}
        <Text style={styles.label}>Weekly Schedule</Text>
        {DAY_NAMES.map((dayName, idx) => {
          const dow = idx + 1;
          const dayConfig = weekPlan[dow];
          const isExpanded = expandedDay === dow;
          const hasItems = dayConfig && dayConfig.items.length > 0;

          return (
            <View key={dow} style={styles.dayCard}>
              <Pressable style={styles.dayHeader} onPress={() => toggleDay(dow)}>
                <View style={styles.dayHeaderLeft}>
                  <MaterialCommunityIcons
                    name={hasItems ? "checkbox-marked-circle" : "checkbox-blank-circle-outline"}
                    size={22}
                    color={hasItems ? "#4CAF50" : "#ccc"}
                  />
                  <Text style={[styles.dayName, !hasItems && styles.dayNameInactive]}>
                    {dayName}
                  </Text>
                </View>
                {hasItems && (
                  <Text style={styles.dayBadge}>
                    {dayConfig.items.length} group{dayConfig.items.length !== 1 ? "s" : ""}
                  </Text>
                )}
                <MaterialCommunityIcons
                  name={isExpanded ? "chevron-up" : "chevron-down"}
                  size={22}
                  color="#999"
                />
              </Pressable>

              {isExpanded && (
                <View style={styles.dayExpanded}>
                  {/* Day label */}
                  <TextInput
                    style={styles.dayLabelInput}
                    value={dayConfig?.label || ""}
                    onChangeText={(text) => updateDayLabel(dow, text)}
                    placeholder="Day label (e.g., Push Day)"
                    placeholderTextColor="#bbb"
                  />

                  {/* Current items */}
                  {dayConfig?.items.map((item) => (
                    <View key={item.muscleGroup} style={styles.itemRow}>
                      <Text style={styles.itemMuscle}>{item.muscleGroup}</Text>
                      <View style={styles.countControl}>
                        <Pressable
                          style={styles.countBtn}
                          onPress={() =>
                            updateTargetCount(dow, item.muscleGroup, item.targetCount - 1)
                          }
                        >
                          <Text style={styles.countBtnText}>-</Text>
                        </Pressable>
                        <Text style={styles.countValue}>{item.targetCount}</Text>
                        <Pressable
                          style={styles.countBtn}
                          onPress={() =>
                            updateTargetCount(dow, item.muscleGroup, item.targetCount + 1)
                          }
                        >
                          <Text style={styles.countBtnText}>+</Text>
                        </Pressable>
                      </View>
                      <Pressable onPress={() => removeMuscleFromDay(dow, item.muscleGroup)}>
                        <MaterialCommunityIcons name="close-circle" size={22} color="#ff4444" />
                      </Pressable>
                    </View>
                  ))}

                  {/* Add muscle group */}
                  <Text style={styles.addLabel}>Add Muscle Group</Text>
                  <View style={styles.muscleChips}>
                    {muscleGroups
                      .filter(
                        (mg) => !dayConfig?.items.some((i) => i.muscleGroup === mg)
                      )
                      .map((mg) => (
                        <Pressable
                          key={mg}
                          style={styles.chip}
                          onPress={() => addMuscleToDay(dow, mg)}
                        >
                          <Text style={styles.chipText}>+ {mg}</Text>
                        </Pressable>
                      ))}
                  </View>
                </View>
              )}
            </View>
          );
        })}

        {/* Save / Delete */}
        <Pressable
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <MaterialCommunityIcons name="content-save" size={20} color="#fff" />
              <Text style={styles.saveButtonText}>
                {activePlan ? "Update Plan" : "Save Plan"}
              </Text>
            </>
          )}
        </Pressable>

        {activePlan && (
          <Pressable style={styles.deleteButton} onPress={handleDelete}>
            <MaterialCommunityIcons name="delete-outline" size={20} color="#ff4444" />
            <Text style={styles.deleteButtonText}>Delete Plan</Text>
          </Pressable>
        )}
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 22,
    fontWeight: "900",
    color: "#1a1a1a",
  },
  nameSection: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "700",
    color: "#999",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  nameInput: {
    backgroundColor: "#fff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    padding: 14,
    fontSize: 16,
    fontWeight: "600",
    color: "#1a1a1a",
  },
  dayCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    marginBottom: 8,
    overflow: "hidden",
  },
  dayHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
  },
  dayHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  dayName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1a1a1a",
  },
  dayNameInactive: {
    color: "#999",
  },
  dayBadge: {
    fontSize: 12,
    fontWeight: "600",
    color: "#4CAF50",
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginRight: 8,
  },
  dayExpanded: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  dayLabelInput: {
    backgroundColor: "#f8f8f8",
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    color: "#1a1a1a",
    marginTop: 10,
    marginBottom: 10,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  itemMuscle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1a1a1a",
    flex: 1,
  },
  countControl: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginRight: 12,
  },
  countBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
  },
  countBtnText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#4CAF50",
  },
  countValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1a1a1a",
    width: 20,
    textAlign: "center",
  },
  addLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#999",
    marginTop: 10,
    marginBottom: 6,
  },
  muscleChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  chip: {
    backgroundColor: "#E8F5E9",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#4CAF50",
  },
  saveButton: {
    backgroundColor: "#4CAF50",
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 20,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    marginTop: 10,
  },
  deleteButtonText: {
    color: "#ff4444",
    fontWeight: "600",
    fontSize: 15,
  },
});
