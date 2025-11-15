import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useRef } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";

// ✅ Define type-safe route literals
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

  // ✅ router.push now gets strictly typed route
  const handlePress = (route: WorkoutRoute) => {
    router.push(route);
  };

  return (
    <LinearGradient colors={["#000000", "#1a1a1a", "#000000"]} style={{ flex: 1 }}>
      <View style={styles.container}>
        <Text style={styles.title}>Select Your Workout 💪</Text>

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
              <MaterialCommunityIcons name={item.icon as any} size={36} color="#00ff88" />
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
    color: "#00ff88",
    textTransform: "uppercase",
    marginBottom: 30,
  },
  subtitle: {
    color: "#ccc",
    fontSize: 18,
    marginBottom: 40,
  },
  option: {
    width: 280,
    paddingVertical: 18,
    marginVertical: 10,
    borderRadius: 15,
    backgroundColor: "#111",
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
    shadowColor: "#00ff88",
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 5,
  },
  optionText: {
    color: "#00ff88",
    fontWeight: "700",
    fontSize: 18,
    textTransform: "capitalize",
  },
});
