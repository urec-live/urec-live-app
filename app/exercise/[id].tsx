import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Link, useLocalSearchParams } from "expo-router";
import { exerciseAPI, Exercise } from "@/services/exerciseAPI";
import { useWorkout } from "@/contexts/WorkoutContext";
import { useGym } from "@/contexts/GymContext";
import { catalogStyles as s } from "@/constants/catalogStyles";
const loggingLabels = {
  WEIGHT_REPS: "Weight & repetitions",
  REPS: "Repetitions",
  DURATION: "Duration in seconds",
  DISTANCE_DURATION: "Distance & duration",
};
export default function ExerciseDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { gym } = useGym();
  const { currentSession, checkIn } = useWorkout();
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [error, setError] = useState("");
  const load = () => {
    setError("");
    void exerciseAPI
      .get(Number(id))
      .then(setExercise)
      .catch(() =>
        setError("Exercise unavailable. Check your connection and retry."),
      );
  };
  useEffect(load, [id]);
  return (
    <View style={styles.page}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: currentSession ? 440 : 50 },
        ]}
      >
        <Link href="/workout" style={styles.back}>
          <MaterialCommunityIcons name="arrow-left" size={16} /> Exercise
          library
        </Link>
        {!!error && (
          <View style={s.card}>
            <Text style={s.error}>{error}</Text>
            <Pressable accessibilityRole="button" onPress={load}>
              <Text style={s.link}>Try again</Text>
            </Pressable>
          </View>
        )}
        {!exercise && !error && (
          <ActivityIndicator style={{ marginTop: 60 }} color="#216C50" />
        )}
        {exercise && (
          <>
            <View style={styles.hero}>
              <View style={styles.icon}>
                <MaterialCommunityIcons
                  name={
                    exercise.trainingType === "CARDIO"
                      ? "heart-pulse"
                      : exercise.trainingType === "MOBILITY"
                        ? "yoga"
                        : "dumbbell"
                  }
                  size={40}
                  color="#216C50"
                />
              </View>
              <View style={styles.tags}>
                <Text style={styles.tag}>{exercise.muscleGroup}</Text>
                <Text style={styles.type}>
                  {exercise.trainingType.charAt(0) +
                    exercise.trainingType.slice(1).toLowerCase()}
                </Text>
                {exercise.custom && (
                  <Text style={styles.type}>Your exercise</Text>
                )}
              </View>
              <Text accessibilityRole="header" style={styles.title}>
                {exercise.name}
              </Text>
              <Text style={styles.equipment}>
                {exercise.equipmentType === "NONE"
                  ? "No equipment needed"
                  : exercise.equipmentType.charAt(0) +
                    exercise.equipmentType.slice(1).toLowerCase()}
              </Text>
            </View>
            <View style={styles.instructions}>
              <View style={styles.sectionHeading}>
                <MaterialCommunityIcons
                  name="human-handsup"
                  size={20}
                  color="#216C50"
                />
                <Text style={styles.sectionTitle}>Find your form</Text>
              </View>
              <Text style={styles.body}>
                {exercise.instructions ||
                  "Choose a comfortable range and use controlled movement."}
              </Text>
            </View>
            <View style={styles.logging}>
              <View style={styles.loggingIcon}>
                <MaterialCommunityIcons
                  name={
                    exercise.loggingMode === "DURATION" ||
                    exercise.loggingMode === "DISTANCE_DURATION"
                      ? "timer-outline"
                      : "format-list-numbered"
                  }
                  size={24}
                  color="#216C50"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.smallLabel}>What you’ll track</Text>
                <Text style={styles.loggingTitle}>
                  {loggingLabels[exercise.loggingMode]}
                </Text>
              </View>
              <MaterialCommunityIcons
                name="check-circle-outline"
                size={21}
                color="#216C50"
              />
            </View>
            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.start,
                !!currentSession && styles.disabled,
                pressed && { opacity: 0.85 },
              ]}
              disabled={!!currentSession}
              onPress={() =>
                checkIn(
                  exercise.name,
                  undefined,
                  exercise.muscleGroup,
                  exercise.id,
                  exercise.loggingMode,
                )
              }
            >
              <MaterialCommunityIcons
                name={currentSession ? "timer-sand" : "play"}
                size={23}
                color="#fff"
              />
              <Text style={styles.startText}>
                {currentSession
                  ? "Finish your active exercise first"
                  : "Start exercise"}
              </Text>
            </Pressable>
            {!currentSession && (
              <Text style={styles.footnote}>
                Your pace. Your progress. Log each set as you go.
              </Text>
            )}
            {gym && (
              <Link
                href={{
                  pathname: "/workout/equipment/[exercise]",
                  params: {
                    exercise: exercise.name,
                    exerciseId: exercise.id,
                    loggingMode: exercise.loggingMode,
                    muscle: exercise.muscleGroup,
                  },
                }}
                style={styles.secondary}
              >
                <MaterialCommunityIcons name="map-marker-outline" size={17} />{" "}
                Find equipment at {gym.name}
              </Link>
            )}
            {exercise.custom && (
              <Link
                href={{
                  pathname: "/exercise/custom",
                  params: { id: exercise.id },
                }}
                style={styles.secondary}
              >
                <MaterialCommunityIcons name="pencil-outline" size={17} /> Edit
                or archive exercise
              </Link>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}
const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#F3F5F6" },
  content: { width: "100%", maxWidth: 780, alignSelf: "center", padding: 24 },
  back: {
    fontSize: 13,
    fontWeight: "600",
    color: "#657A6D",
    paddingVertical: 12,
    marginBottom: 24,
  },
  hero: { marginBottom: 28 },
  icon: {
    width: 82,
    height: 82,
    backgroundColor: "#E4EEE6",
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 22,
  },
  tags: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 12,
  },
  tag: {
    fontSize: 12,
    fontWeight: "600",
    color: "#216C50",
    backgroundColor: "#E3EEE6",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 7,
  },
  type: { fontSize: 12, color: "#748279" },
  title: {
    fontSize: 34,
    fontWeight: "800",
    letterSpacing: -1,
    lineHeight: 42,
    color: "#1B3029",
  },
  equipment: { fontSize: 15, color: "#6C7C75", marginTop: 8 },
  instructions: {
    padding: 22,
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E1E7E3",
    marginBottom: 16,
  },
  sectionHeading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#1B3029" },
  body: { fontSize: 16, lineHeight: 27, color: "#65786B" },
  logging: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 18,
    borderRadius: 14,
    backgroundColor: "#E9F0EA",
    marginBottom: 26,
  },
  loggingIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "#DBE8DF",
    alignItems: "center",
    justifyContent: "center",
  },
  smallLabel: { fontSize: 12, color: "#6C7C75", marginBottom: 4 },
  loggingTitle: { fontSize: 15, fontWeight: "600", color: "#1B3029" },
  start: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 17,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: "#216C50",
  },
  startText: { color: "#fff", fontSize: 16, fontWeight: "700", flexShrink: 1 },
  disabled: { backgroundColor: "#81968A" },
  footnote: {
    textAlign: "center",
    fontSize: 12,
    color: "#77877C",
    marginTop: 13,
    marginBottom: 14,
  },
  secondary: {
    textAlign: "center",
    paddingVertical: 16,
    paddingHorizontal: 12,
    color: "#216C50",
    fontSize: 14,
    fontWeight: "600",
  },
});
