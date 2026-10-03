import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { SEVERITY_DISPLAY, STATUS_DISPLAY, STATUS_STEPS } from "@/constants/issues";
import { issueAPI, IssueReport, IssueStatus } from "@/services/issueAPI";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** Submitted → Seen → Repairing → Fixed, filled up to the report's current status. */
function ProgressStrip({ status }: { status: IssueStatus }) {
  const currentIndex = STATUS_STEPS.indexOf(status);
  return (
    <View style={styles.progress}>
      {STATUS_STEPS.map((step, index) => {
        const reached = index <= currentIndex;
        return (
          <View key={step} style={styles.progressStep}>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressLine,
                  index === 0 && styles.progressLineHidden,
                  reached && styles.progressReached,
                ]}
              />
              <View style={[styles.progressDot, reached && styles.progressReached]} />
              <View
                style={[
                  styles.progressLine,
                  index === STATUS_STEPS.length - 1 && styles.progressLineHidden,
                  index < currentIndex && styles.progressReached,
                ]}
              />
            </View>
            <Text style={[styles.progressLabel, reached && styles.progressLabelReached]}>
              {STATUS_DISPLAY[step].short}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function ReportCard({ report }: { report: IssueReport }) {
  const severity = SEVERITY_DISPLAY[report.severity];
  const status = STATUS_DISPLAY[report.status];
  return (
    <View style={styles.card} testID={`report-${report.id}`}>
      <View style={styles.cardHeader}>
        <Text style={styles.machineName} numberOfLines={1}>
          {report.equipmentName}
        </Text>
        <View style={[styles.statusPill, { backgroundColor: `${status.color}1A` }]}>
          <Text style={[styles.statusPillText, { color: status.color }]}>{status.label}</Text>
        </View>
      </View>
      <View style={styles.metaRow}>
        <View style={[styles.severityChip, { backgroundColor: severity.tint }]}>
          <MaterialCommunityIcons name={severity.icon} size={13} color={severity.color} />
          <Text style={[styles.severityChipText, { color: severity.color }]}>{severity.short}</Text>
        </View>
        <Text style={styles.date}>Reported {formatDate(report.reportedAt)}</Text>
      </View>
      <Text style={styles.description} numberOfLines={3}>
        {report.description}
      </Text>
      <ProgressStrip status={report.status} />
    </View>
  );
}

export default function MyReportsScreen() {
  const router = useRouter();
  const [reports, setReports] = useState<IssueReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      setReports(await issueAPI.getMyReports());
      setLoadFailed(false);
    } catch {
      setLoadFailed(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Reload whenever the screen regains focus so admin status changes show up
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/(tabs)/profile");
  };

  return (
    <View style={styles.container}>
      <Pressable onPress={goBack} style={styles.backButton}>
        <Text style={styles.backText}>← Back</Text>
      </Pressable>
      <Text style={styles.title}>My Equipment Reports</Text>
      <Text style={styles.subtitle}>{"Track the repair status of machines you've reported"}</Text>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#4CAF50" accessibilityLabel="Loading reports" />
        </View>
      ) : (
        <FlatList
          data={reports}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => <ReportCard report={item} />}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => load(true)}
              tintColor="#4CAF50"
              colors={["#4CAF50"]}
            />
          }
          ListEmptyComponent={
            loadFailed ? (
              <View style={styles.empty}>
                <MaterialCommunityIcons name="wifi-off" size={44} color="#ccc" />
                <Text style={styles.emptyTitle}>{"Couldn't load your reports"}</Text>
                <Text style={styles.emptyText}>Pull down to try again.</Text>
              </View>
            ) : (
              <View style={styles.empty}>
                <MaterialCommunityIcons name="clipboard-check-outline" size={48} color="#c8e6c9" />
                <Text style={styles.emptyTitle}>No reports yet</Text>
                <Text style={styles.emptyText}>
                  {'If a machine isn\'t working right, open it and tap "Report a problem".'}
                </Text>
              </View>
            )
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    paddingHorizontal: 20,
    paddingTop: 25,
  },
  backButton: {
    marginBottom: 16,
  },
  backText: {
    color: "#4CAF50",
    fontWeight: "700",
    fontSize: 16,
  },
  title: {
    color: "#1a1a1a",
    fontSize: 26,
    fontWeight: "900",
  },
  subtitle: {
    color: "#888",
    fontSize: 14,
    marginTop: 4,
    marginBottom: 16,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  listContent: {
    paddingBottom: 40,
    flexGrow: 1,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  machineName: {
    flex: 1,
    fontSize: 17,
    fontWeight: "800",
    color: "#1a1a1a",
  },
  statusPill: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: "800",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 8,
  },
  severityChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  severityChipText: {
    fontSize: 12,
    fontWeight: "700",
  },
  date: {
    fontSize: 12,
    color: "#999",
  },
  description: {
    fontSize: 14,
    color: "#444",
    lineHeight: 20,
    marginTop: 10,
  },
  progress: {
    flexDirection: "row",
    marginTop: 14,
  },
  progressStep: {
    flex: 1,
    alignItems: "center",
  },
  progressTrack: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "stretch",
  },
  progressLine: {
    flex: 1,
    height: 2,
    backgroundColor: "#e0e0e0",
  },
  progressLineHidden: {
    backgroundColor: "transparent",
  },
  progressDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#e0e0e0",
  },
  progressReached: {
    backgroundColor: "#4CAF50",
  },
  progressLabel: {
    fontSize: 11,
    color: "#aaa",
    marginTop: 4,
  },
  progressLabelReached: {
    color: "#1a1a1a",
    fontWeight: "600",
  },
  empty: {
    alignItems: "center",
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#1a1a1a",
    marginTop: 12,
  },
  emptyText: {
    fontSize: 14,
    color: "#888",
    textAlign: "center",
    marginTop: 6,
    lineHeight: 20,
  },
});
