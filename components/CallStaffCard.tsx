import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { HELP_STATUS_DISPLAY } from "@/constants/helpRequests";
import { useHelpRequest } from "@/contexts/HelpRequestContext";
import { toHelpRequestError } from "@/utils/helpRequestErrors";

interface Props {
  equipmentId: number;
  /** Sent when the member is clearly doing one exercise, so staff and the how-to link match it. */
  exerciseName?: string;
}

/**
 * The cabin-crew call button on a machine's page: "Not sure how to use this? Call staff".
 * Becomes a link to the open request once the member has one.
 */
export default function CallStaffCard({ equipmentId, exerciseName }: Props) {
  const router = useRouter();
  const { activeRequest, callStaff } = useHelpRequest();
  const [calling, setCalling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openRequest = () => router.push("/help-request");

  const handleCall = async () => {
    setCalling(true);
    setError(null);
    try {
      await callStaff({ equipmentId, exerciseName });
      openRequest();
    } catch (e) {
      const { message, alreadyOpen } = toHelpRequestError(e, "call");
      if (alreadyOpen) openRequest();
      else setError(message);
    } finally {
      setCalling(false);
    }
  };

  if (activeRequest) {
    const display = HELP_STATUS_DISPLAY[activeRequest.status];
    const here = activeRequest.equipmentId === equipmentId;
    return (
      <View style={[styles.card, { borderColor: display.color }]} testID="call-staff-card">
        <View style={styles.row}>
          <MaterialCommunityIcons name={display.icon} size={24} color={display.color} />
          <Text style={[styles.title, { color: display.color }]}>
            {here ? `Help requested: ${display.label}` : `You asked for help at ${activeRequest.equipmentName}`}
          </Text>
        </View>
        <Pressable accessibilityRole="button" style={styles.secondaryButton} onPress={openRequest}>
          <Text style={styles.secondaryButtonText}>View your help request</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.card} testID="call-staff-card">
      <View style={styles.row}>
        <MaterialCommunityIcons name="face-agent" size={24} color="#1976D2" />
        <Text style={styles.title}>Not sure how to use this?</Text>
      </View>
      <Text style={styles.text}>Call staff and someone will come over to help you.</Text>
      {error && (
        <Text style={styles.error} accessibilityRole="alert">
          {error}
        </Text>
      )}
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: calling }}
        disabled={calling}
        style={[styles.callButton, calling && styles.disabled]}
        onPress={handleCall}
      >
        {calling ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <MaterialCommunityIcons name="bell-ring-outline" size={18} color="#fff" />
            <Text style={styles.callButtonText}>Call staff</Text>
          </>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#BBDEFB",
    padding: 16,
    marginBottom: 20,
    gap: 8,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: { flex: 1, fontSize: 16, fontWeight: "800", color: "#1a1a1a" },
  text: { fontSize: 14, color: "#555" },
  error: { color: "#B71C1C", fontSize: 13 },
  callButton: {
    flexDirection: "row",
    gap: 8,
    backgroundColor: "#1976D2",
    borderRadius: 30,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  callButtonText: { color: "#fff", fontWeight: "800", fontSize: 15 },
  secondaryButton: {
    borderRadius: 30,
    paddingVertical: 10,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#1976D2",
  },
  secondaryButtonText: { color: "#1976D2", fontWeight: "700", fontSize: 14 },
  disabled: { opacity: 0.5 },
});
