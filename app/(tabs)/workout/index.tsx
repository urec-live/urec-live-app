import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useRef } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { useSplit } from "@/contexts/SplitContext";

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
  const { todayGroups, isRestDay } = useSplit();

  // ✅ router.push now gets strictly typed route
  const handlePress = (route: WorkoutRoute) => {
    router.push(route);
  };

  return (
    <LinearGradient colors={["#ffffff", "#f5f5f5", "#ffffff"]} style={{ flex: 1 }}>
      <View style={styles.container}>
        <View style={styles.splitCard}>
          <Text style={styles.splitTitle}>Today&apos;s Split</Text>
          {isRestDay ? (
            <Text style={styles.splitText}>
              Hey looks like it&apos;s your rest day. Recovery is as important as training, so take
              it easy if you need it.
            </Text>
          ) : (
            <Text style={styles.splitText}>{todayGroups.join(", ")}</Text>
          )}
        </View>
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
            <Animated.View style={[styles.option, { transform: [{ scale }] }]}>
              <MaterialCommunityIcons name={item.icon as any} size={32} color="#4CAF50" />
              <Text style={styles.optionText}>{item.name}</Text>
            </Animated.View>
          </Pressable>
        ))}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 20 },
  title: {
    fontSize: 30,
    fontWeight: "900",
    color: "#1a1a1a",
    textTransform: "uppercase",
    marginBottom: 30,
  },
  subtitle: {
    color: "#666",
    fontSize: 18,
    marginBottom: 40,
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
  optionText: {
    color: "#4CAF50",
    fontWeight: "700",
    fontSize: 18,
  },
  splitCard: {
    width: "100%",
    backgroundColor: "#ffffff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    padding: 16,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  splitTitle: {
    color: "#1a1a1a",
    fontWeight: "800",
    marginBottom: 6,
  },
  splitText: {
    color: "#666",
    lineHeight: 20,
  },
});
