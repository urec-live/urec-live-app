import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";

interface EquipmentMarkerProps {
  x: number;
  y: number;
  status: string;
  name: string;
  label?: string | null;
  onPress: () => void;
}

const STATUS_COLORS: Record<string, string> = {
  available: "#4CAF50",
  "in use": "#FF5722",
  reserved: "#FF9800",
};

export default function EquipmentMarker({ x, y, status, name, label, onPress }: EquipmentMarkerProps) {
  const color = STATUS_COLORS[status.toLowerCase()] || "#9E9E9E";

  return (
    <Pressable
      style={[styles.container, { left: x - 18, top: y - 18 }]}
      onPress={onPress}
      hitSlop={8}
    >
      <Svg width={36} height={36}>
        <Circle cx={18} cy={18} r={14} fill={color} opacity={0.25} />
        <Circle cx={18} cy={18} r={9} fill={color} />
        <Circle cx={18} cy={18} r={9} fill="none" stroke="#fff" strokeWidth={2} />
      </Svg>
      <Text style={styles.label} numberOfLines={1}>
        {label || name.substring(0, 8)}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    alignItems: "center",
    width: 70,
  },
  label: {
    fontSize: 9,
    fontWeight: "700",
    color: "#333",
    textAlign: "center",
    marginTop: -2,
    backgroundColor: "rgba(255,255,255,0.85)",
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    overflow: "hidden",
  },
});
