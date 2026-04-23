import { MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

interface StatsCardProps {
  icon: string;
  label: string;
  value: string | number;
  subtitle?: string;
  color?: string;
}

export default function StatsCard({ icon, label, value, subtitle, color = "#4CAF50" }: StatsCardProps) {
  return (
    <View style={styles.card}>
      <MaterialCommunityIcons name={icon as any} size={28} color={color} />
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
    flex: 1,
    minWidth: 100,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  value: {
    fontSize: 24,
    fontWeight: "900",
    color: "#1a1a1a",
    marginTop: 8,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: "#888",
    marginTop: 2,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 11,
    color: "#aaa",
    marginTop: 2,
    textAlign: "center",
  },
});
