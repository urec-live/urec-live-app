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
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";

// Simple Sparkline Component
const Sparkline = ({ intensity }: { intensity: number }) => {
  // Generate 5 bars relative to intensity
  const bars = [0.4, 0.7, 0.5, 0.9, 0.6].map(factor => Math.max(0.2, Math.min(1, factor * (intensity / 100) * 2)));
  return (
    <View style={styles.sparklineContainer}>
      {bars.map((h, i) => (
        <View
          key={i}
          style={[
            styles.sparkBar,
            {
              height: h * 16,
              backgroundColor: intensity > 66 ? Colors.dark.inUse : (intensity > 33 ? Colors.dark.reserved : Colors.dark.available),
              opacity: 0.8 + (i * 0.05)
            }
          ]}
        />
      ))}
    </View>
  );
};

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
      const res = await machineAPI.listAll();
      setMachines(res);

      const exercisesMap: Record<number, Exercise[]> = {};
      await Promise.all(
        res.map(async (machine) => {
          try {
            const exercises = await machineAPI.getExercisesByEquipmentId(machine.id);
            exercisesMap[machine.id] = exercises;
          } catch (err) {
            exercisesMap[machine.id] = [];
          }
        })
      );
      setExercisesByEquipment(exercisesMap);
      await refreshWaitTimes(res);
      await refreshRollingUtilization();
    } catch (error) {
      console.error("Error loading machines:", error);
      setMachines([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    machinesRef.current = machines;
  }, [machines]);

  // Logic for real-time refresh (omitting implementation details for brevity, assumes same logic as before)
  const scheduleRealtimeRefresh = () => {
    if (realtimeRefreshTimeoutRef.current) clearTimeout(realtimeRefreshTimeoutRef.current);
    realtimeRefreshTimeoutRef.current = setTimeout(async () => {
      realtimeRefreshTimeoutRef.current = null;
      await refreshRollingUtilization();
      await refreshWaitTimes(machinesRef.current);
    }, 400);
  };

  useEffect(() => {
    if (authLoading) return;
    loadMachines();
    websocketService.connect();
    const unsubscribe = websocketService.subscribe((update) => {
      setMachines(prev => prev.map(m => m.id === update.equipmentId ? { ...m, status: update.status } : m));
      scheduleRealtimeRefresh();
    });
    const unsubscribeConnection = websocketService.subscribeConnection(() => loadMachines(true));
    return () => {
      unsubscribe();
      unsubscribeConnection();
      if (realtimeRefreshTimeoutRef.current) clearTimeout(realtimeRefreshTimeoutRef.current);
    };
  }, [authLoading, isSignedIn, isGuest]);

  const onRefresh = () => loadMachines(true);

  const formatWaitTime = (seconds: number | null | undefined) => {
    if (!seconds || seconds <= 0) return null;
    const minutes = Math.max(1, Math.ceil(seconds / 60));
    return `Wait ~${minutes}m`;
  };

  const overallUtilization = rollingUtilization.length
    ? rollingUtilization.reduce((sum, item) => sum + item.utilizationPercent, 0) / rollingUtilization.length
    : null;

  // Design logic
  const livePercent = overallUtilization ? Math.round(overallUtilization) : 0;
  const availablePercent = 100 - livePercent; // Crude approximation for display

  const hasActiveSession = Boolean(currentSession);
  const handleScanPress = () => {
    if (isGuest) {
      Alert.alert("Guest Mode", "Sign in to scan.");
      return;
    }
    if (hasActiveSession && currentSession) {
      router.push({
        pathname: "/workout/equipment/[exercise]",
        params: { exercise: currentSession.exerciseName, muscle: currentSession.muscleGroup },
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
        <ActivityIndicator size="large" color={Colors.dark.primary} />
        <Text style={styles.loadingText}>Loading equipment...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <View style={styles.pulsingDot} />
          <Text style={styles.headerTitle}>Equipment Availability</Text>
        </View>
        <TouchableOpacity onPress={() => setShowAll(!showAll)}>
          <MaterialCommunityIcons name="cog" size={24} color={Colors.dark.textSecondary} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={visibleMachines}
        keyExtractor={(item) => item.code}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            {/* Live Now Card */}
            <View style={styles.heroCardWrapper}>
              <LinearGradient
                colors={[Colors.dark.accentRed, Colors.dark.secondary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.heroGradient}
              >
                <View style={styles.heroHeader}>
                  <Text style={styles.heroLabel}>🔥 LIVE NOW</Text>
                </View>
                <View style={styles.statsRow}>
                  <Text style={styles.bigStat}>{availablePercent}%</Text>
                  <Text style={styles.statLabel}>AVAILABLE</Text>
                </View>
                <View style={styles.heroFooter}>
                  <Text style={styles.heroFooterText}>
                    {utilizationUpdatedAt ? "Updated just now" : "Updating..."} • LIVE TRACKING
                  </Text>
                </View>
              </LinearGradient>
            </View>

            {/* Scan Action */}
            {!hasActiveSession && (
              <TouchableOpacity style={styles.scanButton} onPress={handleScanPress} activeOpacity={0.8}>
                <LinearGradient
                  colors={[Colors.dark.primary, "rgba(0,245,255,0.4)"]}
                  style={styles.scanGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <MaterialCommunityIcons name="qrcode-scan" size={20} color="#000" />
                  <Text style={styles.scanText}>SCAN QR TO CHECK IN</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
          </>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>{isRestDay && !showAll ? "Rest Day" : "No Machines"}</Text>
          </View>
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.dark.primary}
            colors={[Colors.dark.primary, Colors.dark.secondary]}
            progressBackgroundColor={Colors.dark.surface}
          />
        }
        renderItem={({ item }) => {
          const statusUpper = item.status.toUpperCase();
          const isAvailable = statusUpper === "AVAILABLE";
          const exercises = exercisesByEquipment[item.id] || [];
          const muscleGroups = [...new Set(exercises.map(e => e.muscleGroup))].join(" · ");
          const utilization = utilizationByEquipmentId[item.id] || 0;
          const waitTimeLabel = !isAvailable ? formatWaitTime(waitTimeByEquipmentId[item.id]) : null;

          return (
            <BlurView intensity={20} tint="dark" style={styles.rowCardWrapper}>
              <TouchableOpacity
                style={styles.rowCard}
                activeOpacity={0.7}
                onPress={() => router.push({ pathname: "/machine/[id]", params: { id: String(item.id) } })}
              >
                <View style={styles.rowHeader}>
                  <Text style={styles.machineName}>{item.name}</Text>
                </View>

                <View style={styles.rowBody}>
                  <View style={styles.statusSection}>
                    <View style={styles.statusRow}>
                      <View style={[
                        styles.statusDot,
                        {
                          backgroundColor: isAvailable ? Colors.dark.available : Colors.dark.inUse,
                          shadowColor: isAvailable ? Colors.dark.available : Colors.dark.inUse
                        }
                      ]} />
                      <Text style={[
                        styles.statusText,
                        { color: isAvailable ? Colors.dark.available : Colors.dark.inUse }
                      ]}>
                        {isAvailable ? "AVAILABLE" : "IN USE"}
                      </Text>
                    </View>
                    <Text style={styles.subText}>{muscleGroups || "General"}</Text>
                  </View>

                  <View style={styles.metricSection}>
                    <Text style={styles.metricLabel}>BUSY:</Text>
                    <Sparkline intensity={utilization} />
                    {waitTimeLabel && (
                      <Text style={styles.waitText}>{waitTimeLabel}</Text>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            </BlurView>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
    paddingTop: 50,
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: Colors.dark.primary,
    marginTop: 10,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  pulsingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.dark.available,
    shadowColor: Colors.dark.available,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 5,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: Colors.dark.text,
    letterSpacing: 0.5,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },

  // Hero Card
  heroCardWrapper: {
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  heroGradient: {
    padding: 24,
  },
  heroHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  heroLabel: {
    color: '#FFF',
    fontWeight: "900",
    fontSize: 14,
    letterSpacing: 1,
  },
  statsRow: {
    marginVertical: 10,
  },
  bigStat: {
    fontSize: 48,
    fontWeight: "900",
    color: '#FFF',
    letterSpacing: -1,
  },
  statLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontWeight: "700",
    fontSize: 14,
    marginTop: -5,
    letterSpacing: 1,
  },
  heroFooter: {
    marginTop: 4,
  },
  heroFooterText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    fontWeight: "600",
  },

  // Scan Button
  scanButton: {
    marginBottom: 24,
    borderRadius: 999,
    overflow: 'hidden',
    shadowColor: Colors.dark.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 10,
  },
  scanGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    gap: 10,
  },
  scanText: {
    color: '#000',
    fontWeight: "900",
    fontSize: 14,
    letterSpacing: 1,
  },

  // List Items
  rowCardWrapper: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
    backgroundColor: 'rgba(30, 41, 59, 0.4)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  rowCard: {
    padding: 16,
  },
  rowHeader: {
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
    paddingBottom: 8,
  },
  machineName: {
    color: Colors.dark.text,
    fontSize: 16,
    fontWeight: "700",
  },
  rowBody: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  statusSection: {
    gap: 4,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  subText: {
    color: Colors.dark.textSecondary,
    fontSize: 12,
    fontWeight: "500",
  },
  metricSection: {
    alignItems: "flex-end",
    gap: 2,
  },
  metricLabel: {
    fontSize: 10,
    color: Colors.dark.textSecondary,
    fontWeight: "700",
    marginBottom: 2,
  },
  sparklineContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 2,
    height: 16,
  },
  sparkBar: {
    width: 4,
    borderRadius: 1,
  },
  waitText: {
    marginTop: 4,
    fontSize: 10,
    color: Colors.dark.accentAmber,
    fontWeight: '700',
  },

  // Empty
  emptyContainer: {
    alignItems: "center",
    padding: 40,
  },
  emptyText: {
    color: Colors.dark.textSecondary,
    fontSize: 16,
  },
});
