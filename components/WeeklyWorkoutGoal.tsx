import AsyncStorage from "@react-native-async-storage/async-storage";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { usePathname } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkout } from "@/contexts/WorkoutContext";
import { useCachedResource } from "@/hooks/useCachedResource";
import { cacheKeys, fetchCompletedWorkoutTimes, STALE_MS } from "@/services/cachedResources";
import { workoutFriendsAPI } from "@/services/workoutFriendsAPI";
import WorkoutFriends from "./WorkoutFriends";
import { getWeeklyWorkoutGoal, MILESTONE_WEEKS, WEEKLY_TARGETS, weekKey } from "@/utils/weeklyWorkoutGoal";
import type { WeeklyTargets } from "@/utils/weeklyWorkoutGoal";

export default function WeeklyWorkoutGoal({ editable = true }: { editable?: boolean }) {
  const { user } = useAuth();
  return user ? <GoalCard key={user.username} username={user.username} editable={editable} /> : null;
}

function GoalCard({ username, editable }: { username: string; editable: boolean }) {
  const storageKey = `weekly_workout_targets:${username}`;
  const pathname = usePathname();
  const { workoutHistory, flushPendingSessions } = useWorkout();
  const { data, error, refresh, revalidate } = useCachedResource(
    cacheKeys.user(username, "weekly-goal"),
    async () => {
      await flushPendingSessions();
      return fetchCompletedWorkoutTimes();
    },
    { staleTime: STALE_MS.user },
  );
  const [targets, setTargets] = useState<WeeklyTargets>();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [settingsError, setSettingsError] = useState("");
  const [, setCurrentWeek] = useState(() => weekKey(new Date()));

  useEffect(() => {
    if (editable && pathname !== "/workout") return;
    setCurrentWeek(weekKey(new Date()));
    revalidate();
    const timer = setInterval(() => setCurrentWeek(weekKey(new Date())), 30_000);
    return () => clearInterval(timer);
  }, [editable, pathname, revalidate]);

  useEffect(() => {
    let active = true;
    void AsyncStorage.getItem(storageKey)
      .then((saved) => {
        if (active) setTargets(saved ? JSON.parse(saved) : {});
      })
      .catch(() => {
        if (active) setSettingsError("Could not load your workout target.");
      });
    return () => {
      active = false;
    };
  }, [storageKey]);

  const localCompletions = workoutHistory.flatMap(({ sessions }) =>
    sessions.flatMap(({ endTime }) => (endTime == null ? [] : [endTime])),
  );
  const { days, target, milestoneWeeks } = getWeeklyWorkoutGoal(
    [...(data ?? []), ...localCompletions],
    targets ?? {},
    new Date(),
  );
  const met = days >= target;
  const earned = milestoneWeeks >= MILESTONE_WEEKS;

  async function saveTarget(value: number) {
    if (!targets || saving) return;
    const updated = { ...targets, [weekKey(new Date())]: value };
    setSaving(true);
    setSettingsError("");
    try {
      await AsyncStorage.setItem(storageKey, JSON.stringify(updated));
      setTargets(updated);
      setEditing(false);
      try {
        await workoutFriendsAPI.syncTarget(value);
      } catch {
        setSettingsError("Target saved here. To retry syncing with friends, save it again.");
      }
    } catch {
      setSettingsError("Could not save your workout target. Try again.");
    } finally {
      setSaving(false);
    }
  }

  const card = (
    <View style={styles.card}>
      <View style={styles.heading}>
        <Text style={styles.title}>Weekly workout goal</Text>
        {editable && targets && (
          <Pressable accessibilityRole="button" onPress={() => setEditing(!editing)} disabled={saving} hitSlop={8}>
            <Text style={styles.action}>{editing ? "Cancel" : "Edit target"}</Text>
          </Pressable>
        )}
      </View>
      {targets && (data || days > 0) && (
        <>
          <Text style={styles.progress} accessibilityLiveRegion="polite">
            {days} of {target} workout {target === 1 ? "day" : "days"} this week{met ? " · Goal met!" : ""}
          </Text>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${Math.min(days / target, 1) * 100}%` }]} />
          </View>
          {data && (
            <View style={styles.milestone}>
              <MaterialCommunityIcons name={earned ? "trophy" : "trophy-outline"} color="#216C50" size={18} />
              <Text style={styles.detail}>
                {earned ? "Milestone earned · Four weekly goals met" : `${milestoneWeeks} of ${MILESTONE_WEEKS} past weekly goals met`}
              </Text>
            </View>
          )}
        </>
      )}
      {!data && (
        error ? (
          <Pressable accessibilityRole="button" onPress={() => void refresh()}>
            <Text style={styles.action}>Could not load workout history. Retry</Text>
          </Pressable>
        ) : <Text style={styles.detail}>Loading workout history…</Text>
      )}
      {editing && (
        <>
          <Text style={styles.detail}>Choose workout days per week. Changes apply starting this week.</Text>
          <View style={styles.options}>
            {WEEKLY_TARGETS.map((value) => (
              <Pressable
                key={value}
                accessibilityRole="button"
                accessibilityLabel={`${value} workout ${value === 1 ? "day" : "days"} per week`}
                accessibilityState={{ selected: value === target, disabled: saving }}
                disabled={saving}
                onPress={() => void saveTarget(value)}
                style={[styles.option, value === target && styles.selected]}
              >
                <Text style={[styles.action, value === target && styles.selectedText]}>{value}</Text>
              </Pressable>
            ))}
          </View>
        </>
      )}
      {!!settingsError && <Text role="alert" style={styles.detail}>{settingsError}</Text>}
    </View>
  );

  return (
    <>
      {card}
      {editable && targets && <WorkoutFriends username={username} target={target} />}
    </>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: "#FFFFFF", borderColor: "#E1E7E3", borderWidth: 1, borderRadius: 16, padding: 16, gap: 10, marginBottom: 16 },
  heading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 },
  title: { color: "#1B3029", fontSize: 17, fontWeight: "700" },
  action: { color: "#216C50", fontWeight: "700" },
  progress: { color: "#1B3029", fontWeight: "600" },
  detail: { color: "#43584E", flexShrink: 1 },
  track: { backgroundColor: "#E8F1EB", height: 8, borderRadius: 4, overflow: "hidden" },
  fill: { backgroundColor: "#216C50", height: "100%", borderRadius: 4 },
  milestone: { flexDirection: "row", alignItems: "center", gap: 8 },
  options: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  option: { backgroundColor: "#E8F1EB", borderRadius: 8, minWidth: 44, minHeight: 44, justifyContent: "center", alignItems: "center" },
  selected: { backgroundColor: "#216C50" },
  selectedText: { color: "#FFFFFF" },
});
