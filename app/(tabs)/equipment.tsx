import { useRouter } from "expo-router";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  StatusBar,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import { MachineDto, machineAPI, Exercise } from "@/services/machineAPI";
import websocketService from "@/services/websocketService";
import { useSplit } from "@/contexts/SplitContext";
import { useAuth } from "@/contexts/AuthContext";
import { analyticsAPI, EquipmentUtilizationSnapshot, WaitTimeSummaryDTO } from "@/services/analyticsAPI";
import { useWorkout } from "@/contexts/WorkoutContext";
import { Colors } from "@/constants/theme";


export default function Equipment() {
  const router = useRouter();
  const [machines, setMachines] = useState<MachineDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exercisesByEquipment, setExercisesByEquipment] = useState<Record<number, Exercise[]>>({});
  const [showAll, setShowAll] = useState(false);
  const { todayExpandedGroups, isRestDay } = useSplit();
  const { isGuest, isSignedIn, loading: authLoading } = useAuth();
  const { currentSession } = useWorkout();
  const [utilizationByEquipmentId, setUtilizationByEquipmentId] = useState<Record<number, number>>({});
  const [rollingUtilization, setRollingUtilization] = useState<EquipmentUtilizationSnapshot[]>([]);
  const [utilizationUpdatedAt, setUtilizationUpdatedAt] = useState<number | null>(null);
  const [waitTimeByEquipmentId, setWaitTimeByEquipmentId] = useState<Record<number, number | null>>({});
  const [waitTimeSummary, setWaitTimeSummary] = useState<WaitTimeSummaryDTO | null>(null);
  const machinesRef = useRef<MachineDto[]>([]);
  const realtimeRefreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refreshRollingUtilization = async () => {
    if (isGuest || !isSignedIn || authLoading) {
      setUtilizationByEquipmentId({});
      setRollingUtilization([]);
      setWaitTimeSummary(null);
      return;
    }

    try {
      const [utilization, summary] = await Promise.all([
        analyticsAPI.getRollingUtilization(15),
        analyticsAPI.getWaitTimeSummary()
      ]);
      const map: Record<number, number> = {};
      utilization.forEach((item) => {
        map[item.equipmentId] = item.utilizationPercent;
      });
      setUtilizationByEquipmentId(map);
      setRollingUtilization(utilization);
      setWaitTimeSummary(summary);
      setUtilizationUpdatedAt(Date.now());
    } catch (err) {
      console.error("[Equipment] Error loading analytics:", err);
      // Don't clear everything on partial failure if possible, but for MVP safer to clear
      setUtilizationByEquipmentId({});
      setRollingUtilization([]);
      setUtilizationUpdatedAt(null);
    }
  };

  const refreshWaitTimes = async (machinesList: MachineDto[]) => {
    if (isGuest || !isSignedIn || authLoading) {
      setWaitTimeByEquipmentId({});
      return;
    }

    const inUseMachines = machinesList.filter(
      (machine) => machine.status.toUpperCase() !== "AVAILABLE"
    );

    if (!inUseMachines.length) {
      setWaitTimeByEquipmentId({});
      return;
    }

    try {
      const entries = await Promise.all(
        inUseMachines.map(async (machine) => {
          try {
            const estimate = await analyticsAPI.getWaitTimeEstimate(machine.code);
            return [machine.id, estimate.estimatedWaitSeconds ?? null] as const;
          } catch (err) {
            console.error(`[Equipment] Error loading wait time for ${machine.code}:`, err);
            return [machine.id, null] as const;
          }
        })
      );
      const map: Record<number, number | null> = {};
      entries.forEach(([id, seconds]) => {
        map[id] = seconds;
      });
      setWaitTimeByEquipmentId(map);
    } catch (err) {
      console.error("[Equipment] Error loading wait times:", err);
      setWaitTimeByEquipmentId({});
    }
  };

  const loadMachines = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      console.log('[Equipment] Fetching machines from API...');
      const res = await machineAPI.listAll();
      console.log('[Equipment] Machines received:', res.length);
      setMachines(res);

      // Fetch exercises for each machine
      const exercisesMap: Record<number, Exercise[]> = {};
      await Promise.all(
        res.map(async (machine) => {
          try {
            const exercises = await machineAPI.getExercisesByEquipmentId(machine.id);
            exercisesMap[machine.id] = exercises;
          } catch (err) {
            console.error(`Error fetching exercises for machine ${machine.id}:`, err);
            exercisesMap[machine.id] = [];
          }
        })
      );
      setExercisesByEquipment(exercisesMap);
      await refreshWaitTimes(res);
      await refreshRollingUtilization();
    } catch (error) {
      console.error("Error loading machines:", error);
      console.error("Error details:", JSON.stringify(error));
      setMachines([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    machinesRef.current = machines;
  }, [machines]);

  const scheduleRealtimeRefresh = () => {
    if (realtimeRefreshTimeoutRef.current) {
      clearTimeout(realtimeRefreshTimeoutRef.current);
    }
    realtimeRefreshTimeoutRef.current = setTimeout(async () => {
      realtimeRefreshTimeoutRef.current = null;
      await refreshRollingUtilization();
      await refreshWaitTimes(machinesRef.current);
    }, 400);
  };

  useEffect(() => {
    if (authLoading) {
      return;
    }
    loadMachines();

    // Connect to WebSocket for real-time updates
    websocketService.connect();

    const unsubscribe = websocketService.subscribe((update) => {
      console.log('[Equipment] Received equipment status update via WebSocket:', update);
      setMachines(prev => {
        const next = prev.map(m => m.id === update.equipmentId ? { ...m, status: update.status } : m);
        return next;
      });
      scheduleRealtimeRefresh();
    });
    const unsubscribeConnection = websocketService.subscribeConnection(() => {
      loadMachines(true);
    });

    // Cleanup on unmount
    return () => {
      unsubscribe();
      unsubscribeConnection();
      if (realtimeRefreshTimeoutRef.current) {
        clearTimeout(realtimeRefreshTimeoutRef.current);
      }
    };
  }, [authLoading, isSignedIn, isGuest]);

  const onRefresh = () => {
    loadMachines(true);
  };

  const formatWaitTime = (seconds: number | null | undefined) => {
    if (!seconds || seconds <= 0) {
      return null;
    }
    const minutes = Math.max(1, Math.ceil(seconds / 60));
    return `Wait ~${minutes}m`;
  };

  const getBusyLabel = (utilization?: number) => {
    if (utilization == null || Number.isNaN(utilization)) {
      return null;
    }
    if (utilization < 33) {
      return { label: "Low", style: styles.busyLow, textStyle: styles.busyTextLow };
    }
    if (utilization < 66) {
      return { label: "Med", style: styles.busyMedium, textStyle: styles.busyTextMedium };
    }
    return { label: "High", style: styles.busyHigh, textStyle: styles.busyTextHigh };
  };

  const overallUtilization = rollingUtilization.length
    ? rollingUtilization.reduce((sum, item) => sum + item.utilizationPercent, 0) /
    rollingUtilization.length
    : null;
  const overallBusyInfo = getBusyLabel(overallUtilization ?? undefined);
  const overallFillStyle =
    overallUtilization == null
      ? styles.busyFillNeutral
      : overallUtilization < 33
        ? styles.busyFillLow
        : overallUtilization < 66
          ? styles.busyFillMedium
          : styles.busyFillHigh;
  const busyCardStyle =
    overallUtilization == null
      ? styles.busySummaryCardNeutral
      : overallUtilization < 33
        ? styles.busySummaryCardLow
        : overallUtilization < 66
          ? styles.busySummaryCardMedium
          : styles.busySummaryCardHigh;
  const busyAccentStyle =
    overallBusyInfo?.textStyle ?? styles.busyTextNeutral;
  const busyPillText =
    overallUtilization == null ? "Guest" : "Live";
  const showBusySummary = overallUtilization != null || isGuest || !isSignedIn;
  const busySummarySubtitle = isGuest
    ? "Sign in to see live usage."
    : overallUtilization == null
      ? "No recent usage data."
      : "Avg utilization across equipment";
  const showBusySummaryHint = true;
  const busySummaryHintText = isGuest
    ? "Sign in for live utilization updates."
    : "Pull to refresh for the latest utilization.";
  const lastUpdatedLabel = (() => {
    if (!utilizationUpdatedAt || overallUtilization == null) {
      return null;
    }
    const minutes = Math.floor((Date.now() - utilizationUpdatedAt) / 60000);
    if (minutes <= 0) {
      return "Updated just now";
    }
    return `Updated ${minutes}m ago`;
  })();
  const hasActiveSession = Boolean(currentSession);
  const handleScanPress = () => {
    if (isGuest) {
      Alert.alert("Guest Mode", "Sign in to scan and check in to equipment.");
      return;
    }
    if (hasActiveSession && currentSession) {
      router.push({
        pathname: "/workout/equipment/[exercise]",
        params: {
          exercise: currentSession.exerciseName,
          muscle: currentSession.muscleGroup,
        },
      });
      return;
    }
    router.push("/scan");
  };

  const visibleMachines = showAll
    ? machines
    : machines.filter((machine) => {
      const exercises = exercisesByEquipment[machine.id] || [];
      return exercises.some((exercise) => todayExpandedGroups.includes(exercise.muscleGroup));
    });

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={Colors.light.primary} />
        <Text style={styles.loadingText}>Loading machines...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.headerRow}>
        <Text style={styles.title}>Equipment Availability</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.showAllButton, showAll && styles.showAllButtonActive]}
            onPress={() => setShowAll((prev) => !prev)}
          >
            <Text style={[styles.showAllButtonText, showAll && styles.showAllButtonTextActive]}>
              {showAll ? "Show Split" : "Show All"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      {showBusySummary && (
        <>
          <View style={[styles.busySummaryCard, busyCardStyle]}>
            <View style={styles.busySummaryGlow} />
            <View style={styles.busySummaryHeader}>
              <View style={styles.busySummaryTitleRow}>
                <View style={styles.busySummaryIcon}>
                  <MaterialCommunityIcons name="chart-line" size={16} color="#1a1a1a" />
                </View>
                <Text style={styles.busySummaryTitle}>Busy Now</Text>
                <Text style={styles.busySummaryRange}>(15 min)</Text>
              </View>
              <View style={[styles.busySummaryBadge, overallBusyInfo?.style, styles.busySummaryBadgeStrong]}>
                <View
                  style={[
                    styles.busySummaryBadgeDot,
                    overallUtilization == null ? styles.busySummaryBadgeDotMuted : styles.busySummaryBadgeDotLive,
                  ]}
                />
                <Text style={[styles.busySummaryBadgeText, busyAccentStyle]}>{busyPillText}</Text>
              </View>
            </View>
            <View style={styles.busySummaryRow}>
              <Text style={styles.busySummaryPercent}>
                {overallUtilization == null ? "--" : Math.round(overallUtilization)}%
              </Text>
              <Text style={styles.busySummarySub}>{busySummarySubtitle}</Text>
            </View>
            <View style={styles.busyMeterTrack}>
              <View
                style={[
                  styles.busyMeterFill,
                  overallFillStyle,
                  { width: `${Math.min(100, Math.max(0, overallUtilization ?? 0))}%` },
                ]}
              />
            </View>
            {(showBusySummaryHint || lastUpdatedLabel) && (
              <View style={styles.busySummaryMetaRow}>
                {showBusySummaryHint && (
                  <Text style={styles.busySummaryHint}>{busySummaryHintText}</Text>
                )}
                {lastUpdatedLabel && (
                  <Text style={styles.busySummaryUpdated}>{lastUpdatedLabel}</Text>
                )}
              </View>
            )}
          </View>

          {waitTimeSummary && waitTimeSummary.busyCount > 0 && (
            <View style={styles.waitSummaryCard}>
              <View style={styles.waitSummaryHeader}>
                <View style={styles.waitSummaryIcon}>
                  <MaterialCommunityIcons name="clock-outline" size={16} color="#1a1a1a" />
                </View>
                <Text style={styles.waitSummaryTitle}>Wait Times</Text>
              </View>
              <View style={styles.waitSummaryRow}>
                <View style={styles.waitSummaryItem}>
                  <Text style={styles.waitSummaryValue}>
                    {waitTimeSummary.averageWaitMinutes != null
                      ? `${Math.round(waitTimeSummary.averageWaitMinutes)}m`
                      : "?"}
                  </Text>
                  <Text style={styles.waitSummaryLabel}>Avg Wait</Text>
                </View>

                {waitTimeSummary.longestWaitSeconds != null && (
                  <>
                    <View style={styles.waitSummaryDivider} />
                    <View style={styles.waitSummaryItem}>
                      <Text style={styles.waitSummaryValue}>{Math.round(waitTimeSummary.longestWaitSeconds / 60)}m</Text>
                      <Text style={styles.waitSummaryLabel}>Max ({waitTimeSummary.longestWaitMachineName})</Text>
                    </View>
                  </>
                )}
              </View>
            </View>
          )}
        </>
      )}
      {!hasActiveSession && (
        <TouchableOpacity
          style={[
            styles.scanButton,
            showBusySummary ? styles.scanButtonOutline : styles.scanButtonSolid,
            isGuest && styles.scanButtonDisabled,
          ]}
          onPress={handleScanPress}
        >
          <Text
            style={[
              styles.scanButtonText,
              showBusySummary ? styles.scanButtonTextOutline : styles.scanButtonTextSolid,
            ]}
          >
            Scan QR to Check In
          </Text>
        </TouchableOpacity>
      )}

      <FlatList
        data={visibleMachines}
        keyExtractor={(item) => item.code}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            {isRestDay && !showAll ? (
              <>
                <Text style={styles.emptyText}>Rest day today</Text>
                <Text style={styles.emptySubtext}>Tap "Show All" to browse everything.</Text>
              </>
            ) : (
              <>
                <Text style={styles.emptyText}>No machines available</Text>
                <Text style={styles.emptySubtext}>Pull to refresh</Text>
              </>
            )}
          </View>
        )}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.light.primary}
            colors={[Colors.light.primary, "#66BB6A", "#81C784"]}
            progressBackgroundColor="#ffffff"
            title="Pull to refresh"
            titleColor="#4CAF50"
          />
        }
        renderItem={({ item }) => {
          const statusUpper = item.status.toUpperCase();
          const isAvailable = statusUpper === "AVAILABLE";
          const exercises = exercisesByEquipment[item.id] || [];
          const muscleGroups = [...new Set(exercises.map(e => e.muscleGroup))].join(", ");
          const busyInfo = getBusyLabel(utilizationByEquipmentId[item.id]);
          const waitTimeLabel = isAvailable ? null : formatWaitTime(waitTimeByEquipmentId[item.id]);

          return (
            <TouchableOpacity
              onPress={() => router.push({ pathname: "/machine/[id]", params: { id: String(item.id) } })}
              activeOpacity={0.7}
              style={[
                styles.card,
                isAvailable ? styles.availableCard : styles.inUseCard,
              ]}
            >
              <View style={[
                styles.iconContainer,
                isAvailable ? styles.availableIconBg : styles.inUseIconBg
              ]}>
                <MaterialCommunityIcons
                  name="dumbbell"
                  size={24}
                  color={isAvailable ? Colors.light.primary : Colors.light.error}
                />
              </View>
              <View style={styles.cardContent}>
                <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
                <View style={styles.badgeRow}>
                  <View style={[
                    styles.statusBadge,
                    isAvailable ? styles.availableBadge : styles.inUseBadge
                  ]}>
                    <View style={[
                      styles.statusDot,
                      isAvailable ? styles.availableDot : styles.inUseDot
                    ]} />
                    <Text style={[
                      styles.statusText,
                      isAvailable ? styles.availableText : styles.inUseText
                    ]}>
                      {isAvailable ? "Available" : (statusUpper === "IN_USE" ? "In Use" : item.status)}
                    </Text>
                  </View>
                  {busyInfo && (
                    <View style={[styles.busyBadge, busyInfo.style]}>
                      <Text style={[styles.busyText, busyInfo.textStyle]}>Busy: {busyInfo.label}</Text>
                    </View>
                  )}
                  {waitTimeLabel && (
                    <Text style={styles.waitTimeText}>{waitTimeLabel}</Text>
                  )}
                </View>
                {exercises.length > 0 && (
                  <View style={styles.exercisesContainer}>
                    {muscleGroups && (
                      <Text style={styles.muscleGroupText}>
                        {muscleGroups}
                      </Text>
                    )}
                    <Text style={styles.exercisesText} numberOfLines={2}>
                      {exercises.slice(0, 3).map(e => e.name).join(", ")}
                      {exercises.length > 3 && "..."}
                    </Text>
                  </View>
                )}
              </View>
              <MaterialCommunityIcons
                name="chevron-right"
                size={24}
                color="#bdbdbd"
              />
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.backgroundSecondary,
    padding: 16,
    paddingTop: 24,
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    color: Colors.light.textSecondary,
    fontSize: 14,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
    marginTop: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: Colors.light.text,
    textAlign: "left",
    letterSpacing: -0.5,
  },
  headerActions: {
    alignItems: "flex-end",
  },
  showAllButton: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.light.primary,
    paddingVertical: 6,
    paddingHorizontal: 16,
    backgroundColor: "transparent",
  },
  showAllButtonActive: {
    backgroundColor: Colors.light.primary,
  },
  showAllButtonText: {
    color: Colors.light.primary,
    fontWeight: "700",
    fontSize: 12,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  showAllButtonTextActive: {
    color: "#ffffff",
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.light.surface,
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 12,
    borderRadius: 20,
    shadowColor: Colors.light.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 0, // Removed border for floating effect
  },
  availableCard: {
    // No specific change needed, cleaner without colored border
  },
  inUseCard: {
    // No specific change needed
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  availableIconBg: {
    backgroundColor: Colors.light.primaryLight,
  },
  inUseIconBg: {
    backgroundColor: "#FFEBEE", // Soft Red
  },
  cardContent: {
    flex: 1,
    justifyContent: "center",
  },
  name: {
    color: Colors.light.text,
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 6,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
  },
  availableBadge: {
    backgroundColor: Colors.light.primaryLight,
  },
  inUseBadge: {
    backgroundColor: "#FFEBEE",
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  availableDot: {
    backgroundColor: Colors.light.primary,
  },
  inUseDot: {
    backgroundColor: Colors.light.error,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  availableText: {
    color: Colors.light.primary,
  },
  inUseText: {
    color: Colors.light.error,
  },
  busyBadge: {
    marginTop: 0,
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  busyLow: {
    backgroundColor: "#eff7f2",
  },
  busyMedium: {
    backgroundColor: "#fff6e8",
  },
  busyHigh: {
    backgroundColor: "#fff0f0",
  },
  busyText: {
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  busyTextLow: {
    color: "#2e7d32",
  },
  busyTextMedium: {
    color: "#ef6c00",
  },
  busyTextHigh: {
    color: "#c62828",
  },
  busyTextNeutral: {
    color: "#1a1a1a",
  },
  busySummaryCard: {
    backgroundColor: "#fcfefd",
    borderRadius: 18,
    padding: 12,
    borderWidth: 0.5,
    borderColor: "#e2e6e3",
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 7,
    elevation: 2,
    overflow: "hidden",
  },
  busySummaryGlow: {
    position: "absolute",
    top: -55,
    right: -70,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "#e0f2e9",
    opacity: 0.45,
  },
  busySummaryCardNeutral: {
    borderLeftWidth: 2,
    borderLeftColor: "#cfd8dc",
  },
  busySummaryCardLow: {
    borderLeftWidth: 2,
    borderLeftColor: "#2e7d32",
  },
  busySummaryCardMedium: {
    borderLeftWidth: 2,
    borderLeftColor: "#ef6c00",
  },
  busySummaryCardHigh: {
    borderLeftWidth: 2,
    borderLeftColor: "#c62828",
  },
  busySummaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  busySummaryTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  busySummaryIcon: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#e8f5e9",
  },
  busySummaryTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: "#1a1a1a",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  busySummaryRange: {
    fontSize: 10,
    color: "#7a7a7a",
    fontWeight: "600",
  },
  busySummaryBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "#f1f8f4",
  },
  busySummaryBadgeStrong: {
    borderWidth: 1,
    borderColor: "#cfe8d6",
  },
  busySummaryBadgeText: {
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  busySummaryBadgeDot: {
    width: 6,
    height: 6,
    borderRadius: 999,
  },
  busySummaryBadgeDotLive: {
    backgroundColor: "#2e7d32",
  },
  busySummaryBadgeDotMuted: {
    backgroundColor: "#9e9e9e",
  },
  busySummaryRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 8,
    flexWrap: "wrap",
    marginBottom: 6,
  },
  busySummaryPercent: {
    fontSize: 28,
    fontWeight: "900",
    color: "#1a1a1a",
  },
  busySummarySub: {
    fontSize: 11,
    color: "#7a7a7a",
    fontWeight: "600",
    flexShrink: 1,
    lineHeight: 16,
  },
  busyMeterTrack: {
    height: 10,
    backgroundColor: "#f0f0f0",
    borderRadius: 999,
    overflow: "hidden",
  },
  busyMeterFill: {
    height: "100%",
    borderRadius: 999,
  },
  busyFillLow: {
    backgroundColor: "#00c853",
  },
  busyFillMedium: {
    backgroundColor: "#ff9800",
  },
  busyFillHigh: {
    backgroundColor: "#ff3d00",
  },
  busyFillNeutral: {
    backgroundColor: "#cfd8dc",
  },
  busySummaryMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 6,
    gap: 10,
  },
  busySummaryHint: {
    fontSize: 9,
    color: "#8c8c8c",
    fontWeight: "600",
    letterSpacing: 0.2,
    flex: 1,
  },
  waitSummaryCard: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 12,
    borderWidth: 0.5,
    borderColor: "#e2e6e3",
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 7,
    elevation: 2,
  },
  waitSummaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    gap: 6,
  },
  waitSummaryIcon: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff3e0",
  },
  waitSummaryTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: "#1a1a1a",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  waitSummaryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
  },
  waitSummaryItem: {
    alignItems: "center",
  },
  waitSummaryValue: {
    fontSize: 18,
    fontWeight: "900",
    color: "#1a1a1a",
    marginBottom: 2,
  },
  waitSummaryLabel: {
    fontSize: 10,
    color: "#7a7a7a",
    fontWeight: "600",
    maxWidth: 100,
    textAlign: "center",
  },
  waitSummaryDivider: {
    width: 1,
    height: 30,
    backgroundColor: "#f0f0f0",
  },
  busySummaryUpdated: {
    fontSize: 9,
    color: "#4f6b5a",
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  waitTimeText: {
    fontSize: 10,
    color: "#6b6b6b",
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.2,
  },
  exercisesContainer: {
    marginTop: 6,
  },
  muscleGroupText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#666",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  exercisesText: {
    fontSize: 12,
    color: "#888",
    lineHeight: 16,
  },
  scanButton: {
    alignSelf: "flex-end",
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    marginBottom: 10,
  },
  scanButtonSolid: {
    backgroundColor: "#4CAF50",
    borderColor: "#2f8f45",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  scanButtonOutline: {
    backgroundColor: "#f4fbf7",
    borderColor: "#b9ddc6",
  },
  scanButtonDisabled: {
    opacity: 0.5,
  },
  scanButtonText: {
    fontWeight: "900",
    fontSize: 12,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  scanButtonTextSolid: {
    color: "#ffffff",
  },
  scanButtonTextOutline: {
    color: "#2f8f45",
  },

  emptyContainer: {
    padding: 40,
    alignItems: "center",
  },
  emptyText: {
    color: "#4d4d4d",
    fontSize: 16,
    fontWeight: "700",
  },
  emptySubtext: {
    color: "#7a7a7a",
    fontSize: 13,
    marginTop: 6,
  },
  listContent: {
    paddingBottom: 96,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
    flexWrap: "wrap",
  },
});
