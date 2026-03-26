import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { TodayGoalItem } from "@/services/planAPI";

interface TodayGoalCardProps {
  item: TodayGoalItem;
}

export default function TodayGoalCard({ item }: TodayGoalCardProps) {
  const router = useRouter();
  const progress = Math.min(item.completedCount / item.targetCount, 1);
  const progressPercent = Math.round(progress * 100);

  const handlePress = () => {
    router.push(`/workout/exercises/${encodeURIComponent(item.muscleGroup)}` as any);
  };

  return (
    <Pressable style={[styles.card, item.completed && styles.cardCompleted]} onPress={handlePress}>
      <View style={styles.row}>
        <View style={styles.iconContainer}>
          <MaterialCommunityIcons
            name={item.completed ? "check-circle" : "target"}
            size={24}
            color={item.completed ? "#4CAF50" : "#FF9800"}
          />
        </View>
        <View style={styles.info}>
          <Text style={[styles.muscleGroup, item.completed && styles.textCompleted]}>
            {item.muscleGroup}
          </Text>
          <Text style={styles.progress}>
            {item.completedCount}/{item.targetCount} exercises
          </Text>
        </View>
        <View style={styles.progressBar}>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${progressPercent}%`,
                  backgroundColor: item.completed ? "#4CAF50" : "#FF9800",
                },
              ]}
            />
          </View>
          <Text style={styles.progressText}>{progressPercent}%</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  cardCompleted: {
    borderColor: "#C8E6C9",
    backgroundColor: "#f9fdf9",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconContainer: {
    marginRight: 12,
  },
  info: {
    flex: 1,
  },
  muscleGroup: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1a1a1a",
  },
  textCompleted: {
    color: "#4CAF50",
  },
  progress: {
    fontSize: 13,
    color: "#888",
    marginTop: 2,
  },
  progressBar: {
    alignItems: "flex-end",
    width: 70,
  },
  progressTrack: {
    width: 60,
    height: 6,
    backgroundColor: "#e0e0e0",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
  },
  progressText: {
    fontSize: 11,
    color: "#888",
    marginTop: 3,
  },
});
