import { MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { BANNER_STATUS_TEXT, SEVERITY_DISPLAY } from "@/constants/issues";
import type { MachineIssueStatus } from "@/services/issueAPI";

/** Warning on the machine page while the machine has open issue reports. Visible to every member. */
export default function MachineIssueBanner({ issue }: { issue: MachineIssueStatus }) {
  if (issue.openReportCount === 0 || !issue.worstSeverity || !issue.status) return null;

  const severity = SEVERITY_DISPLAY[issue.worstSeverity];
  const reportCount = issue.openReportCount > 1 ? `${issue.openReportCount} reports · ` : "";

  return (
    <View
      style={[styles.banner, { backgroundColor: severity.tint, borderColor: severity.color }]}
      accessible
      accessibilityRole="alert"
    >
      <MaterialCommunityIcons name="alert-circle-outline" size={22} color={severity.color} />
      <View style={styles.text}>
        <Text style={[styles.headline, { color: severity.color }]}>{severity.bannerHeadline}</Text>
        <Text style={styles.status}>
          {reportCount}
          {BANNER_STATUS_TEXT[issue.status]}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
  },
  text: {
    flex: 1,
  },
  headline: {
    fontSize: 15,
    fontWeight: "800",
  },
  status: {
    fontSize: 13,
    color: "#555",
    marginTop: 2,
  },
});
