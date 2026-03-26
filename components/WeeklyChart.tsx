import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { BarChart } from "react-native-gifted-charts";

interface WeeklyChartProps {
  sessionsPerWeek: Record<string, number>;
  volumePerWeek?: Record<string, number>;
  mode?: "sessions" | "volume";
}

export default function WeeklyChart({ sessionsPerWeek, volumePerWeek, mode = "sessions" }: WeeklyChartProps) {
  const dataSource = mode === "volume" && volumePerWeek ? volumePerWeek : sessionsPerWeek;

  const entries = Object.entries(dataSource);
  if (entries.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>
          {mode === "volume" ? "Weekly Volume" : "Weekly Sessions"}
        </Text>
        <Text style={styles.empty}>No data yet</Text>
      </View>
    );
  }

  // Sort by week key and take last 8
  const sorted = entries
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-8);

  const barData = sorted.map(([weekKey, val]) => {
    // Extract week number from "yyyy-Www" format
    const weekNum = weekKey.split("W")[1] || weekKey;
    return {
      value: mode === "volume" ? Math.round(val) : val,
      label: `W${weekNum}`,
      frontColor: "#4CAF50",
    };
  });

  const maxValue = Math.max(...barData.map((d) => d.value), 1);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        {mode === "volume" ? "Weekly Volume (lbs)" : "Weekly Sessions"}
      </Text>
      <BarChart
        data={barData}
        barWidth={28}
        spacing={12}
        roundedTop
        roundedBottom
        noOfSections={4}
        maxValue={maxValue * 1.2}
        yAxisThickness={0}
        xAxisThickness={1}
        xAxisColor="#e0e0e0"
        yAxisTextStyle={{ color: "#999", fontSize: 10 }}
        xAxisLabelTextStyle={{ color: "#999", fontSize: 10 }}
        hideRules
        isAnimated
        animationDuration={600}
      />
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
    paddingVertical: 20,
  },
});
