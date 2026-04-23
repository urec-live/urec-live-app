import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { LineChart } from "react-native-gifted-charts";
import { sessionAPI, WeightProgression } from "@/services/sessionAPI";

export default function ExerciseProgressionScreen() {
  const { exercise } = useLocalSearchParams<{ exercise: string }>();
  const router = useRouter();
  const [data, setData] = useState<WeightProgression[]>([]);
  const [loading, setLoading] = useState(true);

  const exerciseName = decodeURIComponent(exercise || "");

  useEffect(() => {
    const load = async () => {
      try {
        const progression = await sessionAPI.getExerciseProgression(exerciseName);
        setData(progression);
      } catch {
        // silently handle
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [exerciseName]);

  const chartData = data.map((d, idx) => ({
    value: d.maxWeightLbs,
    label: idx === 0 || idx === data.length - 1
      ? new Date(d.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })
      : "",
    dataPointText: String(d.maxWeightLbs),
  }));

  const maxWeight = data.length > 0 ? Math.max(...data.map((d) => d.maxWeightLbs)) : 0;
  const minWeight = data.length > 0 ? Math.min(...data.map((d) => d.maxWeightLbs)) : 0;
  const improvement = data.length >= 2
    ? data[data.length - 1].maxWeightLbs - data[0].maxWeightLbs
    : 0;

  return (
    <LinearGradient colors={["#ffffff", "#f5f5f5", "#ffffff"]} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <MaterialCommunityIcons name="arrow-left" size={24} color="#1a1a1a" />
          </Pressable>
          <View style={styles.headerCenter}>
            <Text style={styles.title} numberOfLines={1}>{exerciseName}</Text>
            <Text style={styles.subtitle}>Weight Progression</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4CAF50" />
          </View>
        ) : data.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="chart-line" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No weight data recorded yet</Text>
            <Text style={styles.emptySubtext}>
              Complete workouts with weights to track progression
            </Text>
          </View>
        ) : (
          <>
            {/* Summary cards */}
            <View style={styles.summaryRow}>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>Current Max</Text>
                <Text style={styles.summaryValue}>{data[data.length - 1].maxWeightLbs} lbs</Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>All-Time Max</Text>
                <Text style={styles.summaryValue}>{maxWeight} lbs</Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>Progress</Text>
                <Text style={[
                  styles.summaryValue,
                  improvement > 0 ? styles.positive : improvement < 0 ? styles.negative : null,
                ]}>
                  {improvement > 0 ? "+" : ""}{improvement} lbs
                </Text>
              </View>
            </View>

            {/* Chart */}
            <View style={styles.chartContainer}>
              <Text style={styles.chartTitle}>Weight Over Time</Text>
              <LineChart
                data={chartData}
                width={280}
                height={200}
                color="#4CAF50"
                thickness={2}
                dataPointsColor="#4CAF50"
                dataPointsRadius={4}
                curved
                yAxisThickness={0}
                xAxisThickness={1}
                xAxisColor="#e0e0e0"
                yAxisTextStyle={{ color: "#999", fontSize: 10 }}
                xAxisLabelTextStyle={{ color: "#999", fontSize: 9 }}
                hideRules
                maxValue={maxWeight * 1.15}
                noOfSections={4}
                isAnimated
                animationDuration={800}
                startFillColor="#4CAF5030"
                endFillColor="#4CAF5005"
                areaChart
              />
            </View>

            {/* History list */}
            <View style={styles.historyContainer}>
              <Text style={styles.historyTitle}>Session History</Text>
              {data.slice().reverse().map((entry, idx) => (
                <View
                  key={entry.date}
                  style={[styles.historyRow, idx < data.length - 1 && styles.historyRowBorder]}
                >
                  <Text style={styles.historyDate}>
                    {new Date(entry.date).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </Text>
                  <Text style={styles.historyWeight}>{entry.maxWeightLbs} lbs</Text>
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
    marginHorizontal: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: "900",
    color: "#1a1a1a",
  },
  subtitle: {
    fontSize: 13,
    color: "#888",
    marginTop: 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 100,
  },
  emptyContainer: {
    alignItems: "center",
    paddingTop: 80,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#999",
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#bbb",
    marginTop: 8,
    textAlign: "center",
  },
  summaryRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#888",
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1a1a1a",
  },
  positive: {
    color: "#4CAF50",
  },
  negative: {
    color: "#ff4444",
  },
  chartContainer: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  chartTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 12,
  },
  historyContainer: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  historyTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 12,
  },
  historyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
  },
  historyRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  historyDate: {
    fontSize: 14,
    color: "#666",
  },
  historyWeight: {
    fontSize: 16,
    fontWeight: "700",
    color: "#4CAF50",
  },
});
