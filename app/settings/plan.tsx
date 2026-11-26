import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { usePlan } from "@/contexts/PlanContext";
import { planAPI, DayPlanDto, DayPlanItemDto } from "@/services/planAPI";
import PlanExercisePicker from "@/components/PlanExercisePicker";
import { Exercise } from "@/services/exerciseAPI";

const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

interface DayConfig {
  label: string;
  items: DayPlanItemDto[];
}

type WeekPlan = Record<number, DayConfig>; // 1-7

export default function PlanEditor() {
  const router = useRouter();
  const { activePlan, loading: planLoading, refreshActivePlan, refreshTodayPlan } = usePlan();
  const [planName, setPlanName] = useState("My Plan");
  const [weekPlan, setWeekPlan] = useState<WeekPlan>({});
  const [pickerDay, setPickerDay] = useState<number | null>(null);
  const [error, setError] = useState("");
  const initialized = useRef(false);
  const [expandedDay, setExpandedDay] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [planPublic, setPlanPublic] = useState(false);

  useEffect(() => {
    if (planLoading || initialized.current) return;
    initialized.current = true;
    if (activePlan) {
      setPlanName(activePlan.name);
      setPlanPublic(activePlan.visibility === "PUBLIC");
      setWeekPlan(Object.fromEntries(activePlan.days.map(day => [
        day.dayOfWeek, { label: day.label || "", items: day.items.map(item => ({ ...item })) },
      ])));
    }
    setLoading(false);
  }, [activePlan, planLoading]);

  const addExercises = (exercises: Exercise[]) => {
    if (pickerDay === null) return;
    setWeekPlan(prev => {
      const day = prev[pickerDay] || { label: "", items: [] };
      const additions = exercises.filter(e => !day.items.some(i => i.exerciseId === e.id));
      return { ...prev, [pickerDay]: { ...day, items: [...day.items, ...additions.map(e => ({
        exerciseId: e.id, exerciseName: e.name, equipmentType: e.equipmentType,
        muscleGroup: e.muscleGroup, targetCount: 1,
      }))] } };
    });
    setPickerDay(null);
  };

  const toggleDay = (dow: number) => {
    setExpandedDay(expandedDay === dow ? null : dow);
  };

  const removeItem = (dow: number, index: number) => {
    setWeekPlan(prev => ({ ...prev, [dow]: { ...prev[dow], items: prev[dow].items.filter((_, i) => i !== index) } }));
  };

  const moveItem = (dow: number, index: number, offset: number) => {
    setWeekPlan(prev => {
      const items = [...prev[dow].items];
      const destination = index + offset;
      if (destination < 0 || destination >= items.length) return prev;
      [items[index], items[destination]] = [items[destination], items[index]];
      return { ...prev, [dow]: { ...prev[dow], items } };
    });
  };

  const updateDayLabel = (dow: number, label: string) => {
    setWeekPlan((prev) => {
      const day = prev[dow] || { label: "", items: [] };
      return { ...prev, [dow]: { ...day, label } };
    });
  };

  const handleSave = async () => {
    setError("");
    if (!planName.trim()) { setError("Enter a plan name."); return; }
    const days: DayPlanDto[] = Object.entries(weekPlan).filter(([, config]) => config.items.length > 0).map(([dow, config]) => ({
      dayOfWeek: parseInt(dow),
      label: config.label || undefined,
      items: config.items.map((item, idx) => ({
        exerciseId: item.exerciseId,
        muscleGroup: item.muscleGroup,
        targetCount: item.targetCount,
        sortOrder: idx,
      })),
    }));

    if (!days.length) { setError("Add at least one exercise to your week."); return; }
    setSaving(true);
    try {
      if (activePlan) {
        await planAPI.updatePlan(activePlan.id, { name: planName.trim(), days });
      } else {
        await planAPI.createPlan({ name: planName.trim(), days });
      }
      await refreshActivePlan();
      await refreshTodayPlan();
      router.back();
    } catch {
      setError("Failed to save plan. Your changes are still here. Please try again.");
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
            maxLength={100}
            value={planName}
            onChangeText={setPlanName}
            placeholder="e.g., PPL Split, Bro Split"
            placeholderTextColor="#bbb"
          />
          {activePlan && (
            <View style={styles.visibilityRow}>
              <View style={styles.visibilityLeft}>
                <MaterialCommunityIcons name="earth" size={20} color="#4CAF50" />
                <View>
                  <Text style={styles.visibilityLabel}>Share Plan</Text>
                  <Text style={styles.visibilityDesc}>Let others view and copy this plan</Text>
                </View>
              </View>
              <Switch
                value={planPublic}
                onValueChange={async (value) => {
                  setPlanPublic(value);
                  try {
                    await planAPI.updateVisibility(activePlan.id, value ? 'PUBLIC' : 'PRIVATE');
                  } catch {
                    setPlanPublic(!value);
                  }
                }}
                trackColor={{ false: '#e0e0e0', true: '#a5d6a7' }}
                thumbColor={planPublic ? '#4CAF50' : '#f4f3f4'}
              />
            </View>
          )}
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
                    {dayConfig.items.length} item{dayConfig.items.length !== 1 ? "s" : ""}
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
                    maxLength={100}
                    style={styles.dayLabelInput}
                    value={dayConfig?.label || ""}
                    onChangeText={(text) => updateDayLabel(dow, text)}
                    placeholder="Day label (e.g., Push Day)"
                    placeholderTextColor="#bbb"
                  />

                  {dayConfig?.items.map((item, index) => (
                    <View key={item.exerciseId ? `exercise-${item.exerciseId}` : `legacy-${index}`} style={styles.itemRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.itemMuscle}>{item.exerciseName || item.muscleGroup}</Text>
                        <Text style={styles.addLabel}>{item.exerciseId ? `${item.muscleGroup} · ${item.equipmentType?.toLowerCase().replace(/_/g, " ")}` : `Muscle goal · ${item.targetCount} exercises`}</Text>
                      </View>
                      <Pressable accessibilityLabel={`Move ${item.exerciseName || item.muscleGroup} up`} disabled={index === 0} style={{ padding: 8, opacity: index === 0 ? 0.3 : 1 }} onPress={() => moveItem(dow, index, -1)}><MaterialCommunityIcons name="arrow-up" size={20} color="#216C50" /></Pressable>
                      <Pressable accessibilityLabel={`Move ${item.exerciseName || item.muscleGroup} down`} disabled={index === dayConfig.items.length - 1} style={{ padding: 8, opacity: index === dayConfig.items.length - 1 ? 0.3 : 1 }} onPress={() => moveItem(dow, index, 1)}><MaterialCommunityIcons name="arrow-down" size={20} color="#216C50" /></Pressable>
                      <Pressable accessibilityLabel={`Remove ${item.exerciseName || item.muscleGroup}`} style={{ padding: 8 }} onPress={() => removeItem(dow, index)}>
                        <MaterialCommunityIcons name="close-circle-outline" size={22} color="#c44040" />
                      </Pressable>
                    </View>
                  ))}
                  {!dayConfig?.items.length && <Text style={styles.addLabel}>Build this day with exercises from the full catalog.</Text>}
                  <Pressable accessibilityRole="button" style={[styles.chip, { alignItems: "center", marginTop: 12, padding: 14 }]} onPress={() => setPickerDay(dow)}>
                    <Text style={styles.chipText}>+ Add Exercises</Text>
                  </Pressable>
                </View>
              )}
            </View>
          );
        })}

        {!!error && <Text accessibilityRole="alert" style={{ color: "#b3261e", marginTop: 16 }}>{error}</Text>}
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
      {pickerDay !== null && <PlanExercisePicker
        dayName={DAY_NAMES[pickerDay - 1]}
        existingIds={(weekPlan[pickerDay]?.items || []).flatMap(i => i.exerciseId ? [i.exerciseId] : [])}
        onClose={() => setPickerDay(null)} onAdd={addExercises}
      />}
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
  visibilityRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#f9f9f9",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    padding: 12,
    marginTop: 10,
  },
  visibilityLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  visibilityLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1a1a1a",
  },
  visibilityDesc: {
    fontSize: 12,
    color: "#888",
    marginTop: 1,
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
  addLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#999",
    marginTop: 10,
    marginBottom: 6,
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
