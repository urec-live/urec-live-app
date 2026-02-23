import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useRef } from "react";
import { Animated, Pressable, StyleSheet, Text, View, StatusBar } from "react-native";
import { useSplit } from "@/contexts/SplitContext";
import React from "react";
import { Colors, Fonts } from "@/constants/theme";
import { LinearGradient } from "expo-linear-gradient";

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
  const { todayGroups, todayExpandedGroups, isRestDay, showAllWorkouts, setShowAllWorkouts } =
    useSplit();

  const hasStrength = todayExpandedGroups.some(
    (group) => group !== "Cardio" && group !== "Pilates"
  );
  const hasCardio = todayExpandedGroups.includes("Cardio");
  const hasPilates = todayExpandedGroups.includes("Pilates");

  const handlePress = (route: WorkoutRoute) => {
    router.push(route);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <View style={styles.connectionDot} />
          <Text style={styles.headerTitle}>Workout</Text>
        </View>
      </View>

      <View style={styles.content}>
        {/* Today's Split Hero Card */}
        <View style={styles.splitCardWrapper}>
          <LinearGradient
            colors={[Colors.dark.primary, Colors.dark.secondary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.splitCardGradient}
          >
            <View style={styles.splitHeader}>
              <Text style={styles.splitTitle}>TODAY&apos;S SPLIT</Text>
              <Pressable
                style={[styles.showAllButton, showAllWorkouts && styles.showAllButtonActive]}
                onPress={() => setShowAllWorkouts(!showAllWorkouts)}
              >
                <Text style={[styles.showAllText, showAllWorkouts && styles.showAllTextActive]}>
                  {showAllWorkouts ? "SHOW SPLIT" : "SHOW ALL"}
                </Text>
              </Pressable>
            </View>

            {isRestDay ? (
              <View>
                <Text style={styles.splitTextRest}>Rest & Recovery</Text>
                <Text style={styles.splitSubText}>
                  Take it easy today. Recovery is where the growth happens.
                </Text>
              </View>
            ) : (
              <Text style={styles.splitText}>{todayGroups.join(" · ")}</Text>
            )}
          </LinearGradient>
        </View>

        {/* Workout Options */}
        <View style={styles.optionsList}>
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
                  Animated.spring(scale, { toValue: 0.98, useNativeDriver: true }).start()
                }
                onPressOut={() =>
                  Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start()
                }
                onPress={() => handlePress(item.route)}
                disabled={!isEnabled}
                style={{ marginBottom: 16 }}
              >
                <Animated.View style={[styles.optionCard, { transform: [{ scale }] }]}>
                  {isEnabled ? (
                    <LinearGradient
                      colors={[Colors.dark.surface, 'rgba(10, 14, 39, 0.8)']}
                      style={styles.optionGradient}
                    >
                      <View style={[styles.iconContainer, styles.iconActive]}>
                        <MaterialCommunityIcons
                          name={item.icon as any}
                          size={28}
                          color="#FFF"
                        />
                      </View>
                      <View style={styles.textContainer}>
                        <Text style={styles.optionText}>{item.name}</Text>
                        <Text style={styles.optionSubText}>Ready to start</Text>
                      </View>
                      <MaterialCommunityIcons name="chevron-right" size={24} color={Colors.dark.textSecondary} />
                    </LinearGradient>
                  ) : (
                    <View style={styles.optionDisabled}>
                      <View style={styles.iconContainer}>
                        <MaterialCommunityIcons
                          name={item.icon as any}
                          size={28}
                          color={Colors.dark.textSecondary}
                        />
                      </View>
                      <View style={styles.textContainer}>
                        <Text style={[styles.optionText, styles.textDisabled]}>{item.name}</Text>
                        <Text style={styles.optionSubText}>Not scheduled today</Text>
                      </View>
                    </View>
                  )}
                </Animated.View>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
    paddingTop: 60,
  },
  header: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  connectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.dark.primary,
    shadowColor: Colors.dark.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 5,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: Colors.dark.text,
    fontFamily: Fonts.sans,
    letterSpacing: -0.5,
  },
  content: {
    paddingHorizontal: 20,
  },
  splitCardWrapper: {
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 32,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  splitCardGradient: {
    padding: 24,
  },
  splitHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  splitTitle: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  showAllButton: {
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.2)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  showAllButtonActive: {
    backgroundColor: '#FFF',
    borderColor: '#FFF',
  },
  showAllText: {
    color: '#FFF',
    fontWeight: "700",
    fontSize: 10,
    letterSpacing: 0.5,
  },
  showAllTextActive: {
    color: Colors.dark.primary,
  },
  splitText: {
    color: '#FFF',
    fontSize: 24,
    fontFamily: Fonts.sans,
    lineHeight: 32,
    fontWeight: '700',
  },
  splitTextRest: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  splitSubText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    lineHeight: 20,
  },
  optionsList: {
    gap: 0,
  },
  optionCard: {
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: Colors.dark.surface,
  },
  optionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.dark.primary, // Neon border for active
    borderRadius: 20,
  },
  optionDisabled: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  iconActive: {
    backgroundColor: Colors.dark.secondary, // Electric Purple bg for icon
    shadowColor: Colors.dark.secondary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  textContainer: {
    flex: 1,
  },
  optionText: {
    color: Colors.dark.text,
    fontWeight: "700",
    fontSize: 16,
    marginBottom: 4,
  },
  textDisabled: {
    color: Colors.dark.textSecondary,
  },
  optionSubText: {
    color: Colors.dark.textSecondary,
    fontSize: 12,
  },
});
