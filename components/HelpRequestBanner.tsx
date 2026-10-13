import { MaterialCommunityIcons } from "@expo/vector-icons";
import { usePathname, useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { closedMessage, HELP_STATUS_DISPLAY } from "@/constants/helpRequests";
import { useHelpRequest } from "@/contexts/HelpRequestContext";

/**
 * A slim bar above every screen while a help request is open ("Help: On the way · View"), and
 * once more when staff finish it, so members see updates wherever they are in the app.
 */
export default function HelpRequestBanner() {
  const { activeRequest, lastClosed, dismissClosed } = useHelpRequest();
  const pathname = usePathname();
  const router = useRouter();

  if (pathname === "/help-request") return null;

  if (activeRequest) {
    const display = HELP_STATUS_DISPLAY[activeRequest.status];
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Help request: ${display.label}. View`}
        style={[styles.banner, { backgroundColor: display.color }]}
        onPress={() => router.push("/help-request")}
        testID="help-banner"
      >
        <MaterialCommunityIcons name={display.icon} size={18} color="#fff" />
        <Text style={styles.text} numberOfLines={1}>
          Help: {display.label} · {activeRequest.equipmentName}
        </Text>
        <Text style={styles.action}>View ›</Text>
      </Pressable>
    );
  }

  if (lastClosed) {
    return (
      <View style={[styles.banner, styles.closed]} testID="help-banner">
        <MaterialCommunityIcons name={HELP_STATUS_DISPLAY[lastClosed.status].icon} size={18} color="#fff" />
        <Text style={styles.text} numberOfLines={2}>
          {closedMessage(lastClosed)}
        </Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Dismiss" onPress={dismissClosed} hitSlop={10}>
          <MaterialCommunityIcons name="close" size={18} color="#fff" />
        </Pressable>
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  closed: { backgroundColor: "#455A64" },
  text: { flex: 1, color: "#fff", fontWeight: "700", fontSize: 14 },
  action: { color: "#fff", fontWeight: "900", fontSize: 14 },
});
