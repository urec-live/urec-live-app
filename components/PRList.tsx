import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { PersonalRecord } from "@/services/sessionAPI";

interface PRListProps {
  records: PersonalRecord[];
  limit?: number;
}

export default function PRList({ records, limit = 5 }: PRListProps) {
  const router = useRouter();
  const displayed = records.slice(0, limit);

  if (displayed.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Personal Records</Text>
        <Text style={styles.empty}>Complete workouts with weights to see PRs</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Personal Records</Text>
      {displayed.map((pr, idx) => (
        <Pressable
          key={pr.exerciseName}
          style={[styles.row, idx < displayed.length - 1 && styles.rowBorder]}
          onPress={() =>
            router.push(`/progress/${encodeURIComponent(pr.exerciseName)}` as any)
          }
        >
          <View style={styles.rankBadge}>
            <Text style={styles.rankText}>{idx + 1}</Text>
          </View>
          <View style={styles.info}>
            <Text style={styles.exerciseName}>{pr.exerciseName}</Text>
          </View>
          <View style={styles.weightSection}>
            <Text style={styles.weight}>{pr.maxWeightLbs}</Text>
            <Text style={styles.weightUnit}>lbs</Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={20} color="#ccc" />
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 12,
  },
  empty: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
    paddingVertical: 12,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#E8F5E9",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  rankText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#4CAF50",
  },
  info: {
    flex: 1,
  },
  exerciseName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1a1a1a",
  },
  weightSection: {
    flexDirection: "row",
    alignItems: "baseline",
    marginRight: 8,
  },
  weight: {
    fontSize: 18,
    fontWeight: "800",
    color: "#4CAF50",
  },
  weightUnit: {
    fontSize: 12,
    fontWeight: "600",
    color: "#888",
    marginLeft: 2,
  },
});
