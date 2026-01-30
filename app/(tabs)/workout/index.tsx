import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useRef } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { useSplit } from "@/contexts/SplitContext";
import React from "react";
import { Colors } from "@/constants/theme";

// ✅ Define type-safe route literals
// UPDATED: Removed "/(tabs)" prefix as these routes are relative to the tab's root.
type WorkoutRoute = "/workout/strength" | "/workout/cardio" | "/workout/pilates";

// Workout options for selection
const workouts: { name: string; icon: string; route: WorkoutRoute }[] = [
  { name: "Strength Training", icon: "arm-flex", route: "/workout/strength" },
  { name: "Cardio", icon: "run", route: "/workout/cardio" },
  { name: "Pilates", icon: "yoga", route: "/workout/pilates" },
];

export default function Dashboard() {
  const router = useRouter();
  const scale = useRef(new Animated.Value(1)).current;
  const { todayGroups, todayExpandedGroups, isRestDay, showAllWorkouts, setShowAllWorkouts } =
    useSplit();

  const hasStrength = todayExpandedGroups.some(
    (group) => group !== "Cardio" && group !== "Pilates"
  );
  const hasCardio = todayExpandedGroups.includes("Cardio");
  const hasPilates = todayExpandedGroups.includes("Pilates");

  // ✅ router.push now gets strictly typed route
  const handlePress = (route: WorkoutRoute) => {
    router.push(route);
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.light.backgroundSecondary }}>
      <View style={styles.container}>
        <View style={styles.splitCard}>
          <View style={styles.splitHeader}>
            <Text style={styles.splitTitle}>Today&apos;s Split</Text>
            <Pressable
              style={[styles.showAllButton, showAllWorkouts && styles.showAllButtonActive]}
              onPress={() => setShowAllWorkouts(!showAllWorkouts)}
            >
              <Text style={[styles.showAllText, showAllWorkouts && styles.showAllTextActive]}>
                {showAllWorkouts ? "Show Split" : "Show All"}
              </Text>
            </Pressable>
          </View>
          {isRestDay ? (
            <Text style={styles.splitText}>
              Hey looks like it&apos;s your rest day. Recovery is as important as training, so take
              it easy if you need it.
            </Text>
          ) : (
            <Text style={styles.splitText}>{todayGroups.join(", ")}</Text>
          )}
        </View>
        {workouts.map((item, index) => {
          const isEnabled =
            showAllWorkouts ||
            (!isRestDay &&
              (item.name === "Strength Training"
                ? hasStrength
                : item.name === "Cardio"
                  ? hasCardio
                  : hasPilates));
          return (
            <Pressable
              key={index}
              onPressIn={() =>
                Animated.spring(scale, { toValue: 0.95, useNativeDriver: true }).start()
              }
              onPressOut={() =>
                Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start()
              }
              onPress={() => handlePress(item.route)}
              disabled={!isEnabled}
            >
              <Animated.View
                style={[
                  styles.option,
                  !isEnabled && styles.optionDisabled,
                  { transform: [{ scale }] },
                ]}
              >
                <MaterialCommunityIcons
                  name={item.icon as any}
                  size={32}
                  color={isEnabled ? Colors.light.primary : Colors.light.icon}
                />
                <View>
                  <Text style={[styles.optionText, !isEnabled && styles.optionTextDisabled]}>
                    {item.name}
                  </Text>
                  {!isEnabled && <Text style={styles.optionSubText}>Not scheduled today</Text>}
                </View>
              </Animated.View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 20 },
  splitCard: {
    width: "100%",
    backgroundColor: Colors.light.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: Colors.light.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  splitHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  splitTitle: {
    color: Colors.light.text,
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  showAllButton: {
    borderRadius: 20,
    backgroundColor: Colors.light.primaryLight,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  showAllButtonActive: {
    backgroundColor: Colors.light.primary,
  },
  showAllText: {
    color: Colors.light.primary,
    fontWeight: "700",
    fontSize: 12,
  },
  showAllTextActive: {
    color: "#fff",
  },
  splitText: {
    color: Colors.light.textSecondary,
    fontSize: 15,
    lineHeight: 22,
  },
  option: {
    width: "100%",
    height: 80,
    paddingHorizontal: 20,
    marginVertical: 6,
    borderRadius: 16,
    backgroundColor: Colors.light.surface,
    alignItems: "center",
    flexDirection: "row",
    gap: 16,
    shadowColor: Colors.light.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: "transparent", // Placeholder for cleaner look
  },
  optionDisabled: {
    opacity: 0.6,
    backgroundColor: Colors.light.backgroundSecondary,
    shadowOpacity: 0,
    borderWidth: 0,
  },
  optionText: {
    color: Colors.light.text,
    fontWeight: "700",
    fontSize: 18,
    letterSpacing: -0.5,
  },
  optionTextDisabled: {
    color: Colors.light.icon,
  },
  optionSubText: {
    color: Colors.light.textSecondary,
    fontSize: 13,
    marginTop: 2,
  },
});
