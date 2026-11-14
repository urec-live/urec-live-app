import React, { useState } from "react";
import { Keyboard, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

function Group({ label, value, options, onChange }: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return <View style={s.group}>
    <Text style={s.label}>{label}</Text>
    <View style={s.options}>{options.map(option => <Pressable
      key={option.value}
      accessibilityRole="button"
      accessibilityLabel={`${label}: choose ${option.label}`}
      accessibilityState={{ selected: value === option.value }}
      onPress={() => onChange(option.value)}
      style={[s.option, value === option.value && s.selected]}
    ><Text style={s.text}>{option.label}</Text></Pressable>)}</View>
  </View>;
}

export default function EquipmentFilters({ count, onClear, children }: {
  count: number;
  onClear: () => void;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return <>
    <Pressable accessibilityRole="button" accessibilityLabel={`Filters, ${count} active`}
      accessibilityState={{ expanded: open }}
      onPress={() => { Keyboard.dismiss(); setOpen(true); }}
      style={[s.trigger, count > 0 && s.selected]}>
      <MaterialCommunityIcons name="tune-variant" size={20} color="#216C50" />
      <Text style={s.text}>Filters{count > 0 ? ` (${count})` : ""}</Text>
    </Pressable>
    <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
      <View style={s.overlay}>
        <Pressable accessibilityRole="button" accessibilityLabel="Close filters" style={StyleSheet.absoluteFill} onPress={() => setOpen(false)} />
        <View style={s.panel} accessibilityViewIsModal>
          <View style={s.header}>
            <Text style={s.title}>Filters</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Done filtering" style={s.action} onPress={() => setOpen(false)}><Text style={s.text}>Done</Text></Pressable>
          </View>
          <ScrollView contentContainerStyle={s.content}>{children}</ScrollView>
          <Pressable accessibilityRole="button" onPress={onClear} style={s.action}><Text style={s.text}>Clear filters</Text></Pressable>
        </View>
      </View>
    </Modal>
  </>;
}
EquipmentFilters.Group = Group;

const s = StyleSheet.create({
  trigger: { flexDirection: "row", gap: 5, alignItems: "center", justifyContent: "center", minHeight: 44, paddingHorizontal: 10, borderRadius: 12, borderLeftWidth: 1, borderColor: "#D4E2D8" },
  selected: { backgroundColor: "#EAF3ED", borderColor: "#216C50" },
  text: { color: "#216C50", fontSize: 13, fontWeight: "600" },
  overlay: { flex: 1, backgroundColor: "#13291B66", justifyContent: "center", alignItems: "center", padding: 20 },
  panel: { width: "100%", maxWidth: 480, maxHeight: "80%", backgroundColor: "white", borderRadius: 20, padding: 20 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { fontSize: 21, fontWeight: "700", color: "#1D3828" },
  action: { minHeight: 44, justifyContent: "center", alignItems: "center", paddingHorizontal: 12 },
  content: { gap: 24, paddingVertical: 16 },
  group: { gap: 10 },
  label: { color: "#294D3A", fontSize: 15, fontWeight: "600" },
  options: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  option: { minHeight: 44, justifyContent: "center", paddingHorizontal: 14, borderWidth: 1, borderColor: "#D9E2DC", borderRadius: 12 },
});
