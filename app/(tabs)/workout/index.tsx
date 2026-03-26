import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useRef } from "react";
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { usePlan } from "@/contexts/PlanContext";
import TodayGoalCard from "@/components/TodayGoalCard";

const DAY_NAMES = ["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

type WorkoutRoute = "/workout/strength" | "/workout/cardio" | "/workout/pilates";

const workouts: { name: string; icon: string; route: WorkoutRoute }[] = [
  { name: "Strength Training", icon: "arm-flex", route: "/workout/strength" },
  { name: "Cardio", icon: "run", route: "/workout/cardio" },
  { name: "Pilates", icon: "yoga", route: "/workout/pilates" },
];

export default function Dashboard() {
  const router = useRouter();
  const scale = useRef(new Animated.Value(1)).current;
  const { todayPlan, hasPlanForToday, refreshTodayPlan } = usePlan();

  // Refresh today's plan when screen comes into focus (e.g., after completing a workout)
  useFocusEffect(
    useCallback(() => {
      refreshTodayPlan();
    }, [refreshTodayPlan])
  );

  const handlePress = (route: WorkoutRoute) => {
    router.push(route);
  };

  // Determine which muscle groups are in today's plan (for dimming)
  const plannedMuscleGroups = todayPlan?.items.map((i) => i.muscleGroup.toLowerCase()) ?? [];

  return (
    <LinearGradient colors={["#ffffff", "#f5f5f5", "#ffffff"]} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {hasPlanForToday && todayPlan && (
          <View style={styles.goalsSection}>
            <View style={styles.goalsHeader}>
              <MaterialCommunityIcons name="flag-checkered" size={22} color="#4CAF50" />
              <Text style={styles.goalsTitle}>Today's Goals</Text>
              <Text style={styles.goalsDayLabel}>
                {todayPlan.label || DAY_NAMES[todayPlan.dayOfWeek]}
              </Text>
            </View>
            {todayPlan.items.map((item, idx) => (
              <TodayGoalCard key={idx} item={item} />
            ))}
          </View>
        )}

        <View style={styles.workoutSection}>
          {hasPlanForToday && (
            <Text style={styles.exploreLabel}>Explore All Workouts</Text>
          )}
          {workouts.map((item, index) => (
            <Pressable
              key={index}
              onPressIn={() =>
                Animated.spring(scale, { toValue: 0.95, useNativeDriver: true }).start()
              }
              onPressOut={() =>
                Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start()
              }
              onPress={() => handlePress(item.route)}
            >
              <Animated.View
                style={[
                  styles.option,
                  { transform: [{ scale }] },
                  hasPlanForToday && styles.optionDimmed,
                ]}
              >
                <MaterialCommunityIcons
                  name={item.icon as any}
                  size={32}
                  color={hasPlanForToday ? "#aaa" : "#4CAF50"}
                />
                <Text
                  style={[styles.optionText, hasPlanForToday && styles.optionTextDimmed]}
                >
                  {item.name}
                </Text>
              </Animated.View>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 30,
  },
  goalsSection: {
    width: "100%",
    maxWidth: 340,
    marginBottom: 24,
  },
  goalsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  goalsTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1a1a1a",
    flex: 1,
  },
  goalsDayLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#4CAF50",
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  workoutSection: {
    alignItems: "center",
  },
  exploreLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#999",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  option: {
    width: 280,
    padding: 15,
    marginVertical: 6,
    borderRadius: 10,
    backgroundColor: "#ffffff",
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "flex-start",
    gap: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  optionDimmed: {
    opacity: 0.5,
  },
  optionText: {
    color: "#4CAF50",
    fontWeight: "700",
    fontSize: 18,
  },
  optionTextDimmed: {
    color: "#aaa",
  },
});
