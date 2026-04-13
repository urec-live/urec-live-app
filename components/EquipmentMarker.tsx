import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface EquipmentMarkerProps {
  x: number;
  y: number;
  status: string;
  name: string;
  label?: string | null;
  dimmed?: boolean;
  highlighted?: boolean;
  onPress: () => void;
}

const STATUS_COLORS: Record<string, string> = {
  available: "#4CAF50",
  "in use": "#FF5722",
  reserved: "#FF9800",
};

export default function EquipmentMarker({
  x,
  y,
  status,
  name,
  label,
  dimmed = false,
  highlighted = false,
  onPress,
}: EquipmentMarkerProps) {
  const color = STATUS_COLORS[status.toLowerCase()] || "#9E9E9E";
  const markerScale = highlighted ? 1.4 : 1;

  return (
    <TouchableOpacity
      activeOpacity={1}
      // onPress={onPress}
      style={[
        styles.container,
        {
          left: x - 22,
          top: y - 22,
          opacity: dimmed ? 0.15 : 1,
          transform: [{ scale: markerScale }],
        },
      ]}
    >
      {/* Outer glow ring */}
      <View
        style={[
          styles.outerRing,
          { backgroundColor: color },
        ]}
      />
      {/* Inner solid dot */}
      <View
        style={[
          styles.innerDot,
          { backgroundColor: color },
        ]}
      />
      {/* Label */}
      <Text
        style={[
          styles.label,
          dimmed && styles.labelDimmed,
          highlighted && styles.labelHighlighted,
        ]}
        numberOfLines={1}
      >
        {label || name.substring(0, 10)}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    alignItems: "center",
    width: 80,
    zIndex: 10,
    elevation: 10,
  },
  outerRing: {
    position: "absolute",
    top: 0,
    left: 18,
    width: 44,
    height: 44,
    borderRadius: 22,
    opacity: 0.25,
  },
  innerDot: {
    marginTop: 9,
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 3,
    borderColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  label: {
    fontSize: 10,
    fontWeight: "700",
    color: "#333",
    textAlign: "center",
    marginTop: 2,
    backgroundColor: "rgba(255,255,255,0.9)",
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: "hidden",
  },
  labelDimmed: {
    color: "#bbb",
  },
  labelHighlighted: {
    backgroundColor: "#333",
    color: "#fff",
    fontWeight: "800",
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
});
