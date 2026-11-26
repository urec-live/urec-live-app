import React, { useState } from "react";
import { Modal, Pressable, ScrollView, Text } from "react-native";
export default function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const text = options.find((o) => o.value === value)?.label ?? label;
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${text}`}
        onPress={() => setOpen(true)}
        style={{
          minHeight: 44,
          paddingHorizontal: 14,
          justifyContent: "center",
          borderWidth: 1,
          borderColor: value ? "#216C50" : "#D9E2DC",
          backgroundColor: value ? "#EAF3ED" : "white",
          borderRadius: 10,
        }}
      >
        <Text style={{ color: "#294D3A", fontSize: 13 }}>{text} ▾</Text>
      </Pressable>
      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable
          onPress={() => setOpen(false)}
          style={{
            flex: 1,
            backgroundColor: "#13291B66",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{
              backgroundColor: "white",
              borderRadius: 16,
              width: "100%",
              maxWidth: 420,
              maxHeight: "75%",
              padding: 16,
            }}
          >
            <Text
              style={{
                fontSize: 20,
                fontWeight: "700",
                color: "#193E2A",
                margin: 8,
              }}
            >
              {label}
            </Text>
            <ScrollView>
              {options.map((o) => (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${label}: choose ${o.label}`}
                  accessibilityState={{ selected: o.value === value }}
                  key={o.value}
                  onPress={() => {
                    onChange(o.value);
                    setOpen(false);
                  }}
                  style={{
                    padding: 14,
                    borderRadius: 8,
                    backgroundColor: o.value === value ? "#EAF3ED" : "white",
                  }}
                >
                  <Text style={{ color: "#294D3A" }}>
                    {o.label}
                    {o.value === value ? " ✓" : ""}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
            <Pressable
              accessibilityRole="button"
              onPress={() => setOpen(false)}
              style={{ padding: 14 }}
            >
              <Text style={{ color: "#216C50", textAlign: "center" }}>
                Close
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
