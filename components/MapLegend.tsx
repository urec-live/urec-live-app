import React from "react";
import { StyleSheet, Text, View } from "react-native";

const LEGEND_ITEMS = [
  { color: "#4CAF50", label: "Available" },
  { color: "#FF5722", label: "In Use" },
  { color: "#FF9800", label: "Reserved" },
];

export default function MapLegend() {
  return (
    <View style={styles.container}>
      {LEGEND_ITEMS.map((item) => (
        <View key={item.label} style={styles.item}>
          <View style={[styles.dot, { backgroundColor: item.color }]} />
          <Text style={styles.label}>{item.label}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  label: {
    fontSize: 11,
    fontWeight: "600",
    color: "#666",
  },
});
