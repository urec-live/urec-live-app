import { MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

interface StreakDisplayProps {
  currentStreak: number;
  longestStreak: number;
}

export default function StreakDisplay({ currentStreak, longestStreak }: StreakDisplayProps) {
  return (
    <View style={styles.container}>
      <View style={styles.currentStreak}>
        <MaterialCommunityIcons
          name="fire"
          size={36}
          color={currentStreak > 0 ? "#FF6B35" : "#ccc"}
        />
        <Text style={[styles.streakNumber, currentStreak > 0 && styles.streakActive]}>
          {currentStreak}
        </Text>
        <Text style={styles.streakLabel}>Day Streak</Text>
      </View>
      <View style={styles.divider} />
      <View style={styles.bestStreak}>
        <MaterialCommunityIcons name="trophy" size={24} color="#FFB800" />
        <Text style={styles.bestNumber}>{longestStreak}</Text>
        <Text style={styles.bestLabel}>Best Streak</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  currentStreak: {
    flex: 2,
    alignItems: "center",
  },
  streakNumber: {
    fontSize: 36,
    fontWeight: "900",
    color: "#ccc",
    marginTop: 4,
  },
  streakActive: {
    color: "#FF6B35",
  },
  streakLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#888",
    marginTop: 2,
  },
  divider: {
    width: 1,
    height: 60,
    backgroundColor: "#e0e0e0",
    marginHorizontal: 16,
  },
  bestStreak: {
    flex: 1,
    alignItems: "center",
  },
  bestNumber: {
    fontSize: 22,
    fontWeight: "800",
    color: "#1a1a1a",
    marginTop: 4,
  },
  bestLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#888",
    marginTop: 2,
  },
});
