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
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import { MachineDto, machineAPI, Exercise, ActiveEquipmentSession } from "@/services/machineAPI";
import websocketService from "@/services/websocketService";
import { useSplit } from "@/contexts/SplitContext";
import { useAuth } from "@/contexts/AuthContext";


export default function Equipment() {
  const router = useRouter();
  const [machines, setMachines] = useState<MachineDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exercisesByEquipment, setExercisesByEquipment] = useState<Record<number, Exercise[]>>({});
  const [showAll, setShowAll] = useState(false);
  const { todayExpandedGroups, isRestDay } = useSplit();
  const { isGuest, isSignedIn, loading: authLoading } = useAuth();
  const [myActiveSession, setMyActiveSession] = useState<ActiveEquipmentSession | null>(null);

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

      if (!isGuest && isSignedIn && !authLoading) {
        try {
          const active = await machineAPI.getMyActiveSession();
          setMyActiveSession(active);
        } catch (err) {
          console.error('[Equipment] Error loading active session:', err);
          setMyActiveSession(null);
        }
      } else {
        setMyActiveSession(null);
      }
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
    if (authLoading) {
      return;
    }
    loadMachines();

    // Connect to WebSocket for real-time updates
    websocketService.connect();
    
    const unsubscribe = websocketService.subscribe((update) => {
      console.log('[Equipment] Received equipment status update via WebSocket:', update);
      setMachines(prev =>
        prev.map(m => m.id === update.equipmentId ? { ...m, status: update.status } : m)
      );
    });

    // Cleanup on unmount
    return () => {
      unsubscribe();
    };
  }, [authLoading, isSignedIn, isGuest]);

  const onRefresh = () => {
    loadMachines(true);
  };

  const formatStartedAt = (iso: string) => {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) {
      return iso;
    }
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
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
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Loading machines...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Equipment Availability</Text>
        <TouchableOpacity
          style={[styles.showAllButton, showAll && styles.showAllButtonActive]}
          onPress={() => setShowAll((prev) => !prev)}
        >
          <Text style={[styles.showAllButtonText, showAll && styles.showAllButtonTextActive]}>
            {showAll ? "Show Split" : "Show All"}
          </Text>
        </TouchableOpacity>
      </View>
      {myActiveSession && (
        <View style={styles.activeSessionBanner}>
          <Text style={styles.activeSessionTitle}>Currently using</Text>
          <Text style={styles.activeSessionText}>
            {myActiveSession.equipment.name} (started {formatStartedAt(myActiveSession.startedAt)})
          </Text>
          {myActiveSession.equipment?.id && (
            <TouchableOpacity
              style={styles.activeSessionButton}
              onPress={() =>
                router.push({
                  pathname: "/machine/[id]",
                  params: { id: String(myActiveSession.equipment.id) },
                })
              }
            >
              <Text style={styles.activeSessionButtonText}>Resume Session</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
      <TouchableOpacity
        style={[styles.scanButton, isGuest && styles.scanButtonDisabled]}
        onPress={() => {
          if (isGuest) {
            Alert.alert("Guest Mode", "Sign in to scan and check in to equipment.");
            return;
          }
          router.push("/scan");
        }}
      >
        <Text style={styles.scanButtonText}>Scan QR to Check In</Text>
      </TouchableOpacity>

      <FlatList
        data={visibleMachines}
        keyExtractor={(item) => item.code}
        contentContainerStyle={{ margin: 0 }}
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
            tintColor="#4CAF50"
            colors={["#4CAF50", "#66BB6A", "#81C784"]}
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
                  size={28}
                  color={isAvailable ? "#4CAF50" : "#FF5722"}
                />
              </View>
              <View style={styles.cardContent}>
                <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
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
                    {isAvailable ? "Available" : "In Use"}
                  </Text>
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
    backgroundColor: "#f5f5f5",
    padding: 20,
    paddingTop: 50,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 12,
  },
  title: {
    fontSize: 26,
    fontWeight: "900",
    color: "#1a1a1a",
    textAlign: "center",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  showAllButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#4CAF50",
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  showAllButtonActive: {
    backgroundColor: "#4CAF50",
  },
  showAllButtonText: {
    color: "#4CAF50",
    fontWeight: "700",
    fontSize: 12,
  },
  showAllButtonTextActive: {
    color: "#ffffff",
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  availableCard: {
    backgroundColor: "#f1f8f4",
    borderLeftWidth: 4,
    borderLeftColor: "#4CAF50",
  },
  inUseCard: {
    backgroundColor: "#fff5f2",
    borderLeftWidth: 4,
    borderLeftColor: "#FF5722",
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  availableIconBg: {
    backgroundColor: "#e8f5e9",
  },
  inUseIconBg: {
    backgroundColor: "#ffebee",
  },
  cardContent: {
    flex: 1,
    justifyContent: "center",
  },
  name: {
    color: "#1a1a1a",
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 6,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    gap: 6,
  },
  availableBadge: {
    backgroundColor: "#e8f5e9",
  },
  inUseBadge: {
    backgroundColor: "#ffebee",
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  availableDot: {
    backgroundColor: "#4CAF50",
  },
  inUseDot: {
    backgroundColor: "#FF5722",
  },
  statusText: {
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  availableText: {
    color: "#2e7d32",
  },
  inUseText: {
    color: "#d32f2f",
  },
  exercisesContainer: {
    marginTop: 8,
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
    fontSize: 13,
    color: "#888",
    lineHeight: 16,
  },
  scanButton: {
    backgroundColor: "#4CAF50",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderWidth: 2,
    borderColor: "#2e7d32",
    marginBottom: 16,
    alignItems: "center",
  },
  scanButtonDisabled: {
    opacity: 0.5,
  },
  scanButtonText: {
    color: "#ffffff",
    fontWeight: "900",
    fontSize: 14,
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: "#4CAF50",
    fontSize: 16,
    marginTop: 10,
  },
  emptyContainer: {
    padding: 40,
    alignItems: "center",
  },
  emptyText: {
    color: "#666",
    fontSize: 18,
    fontWeight: "700",
  },
  emptySubtext: {
    color: "#999",
    fontSize: 14,
    marginTop: 8,
  },
  activeSessionBanner: {
    borderWidth: 1,
    borderColor: "#1b5e20",
    backgroundColor: "#e8f5e9",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  activeSessionTitle: {
    color: "#1b5e20",
    fontWeight: "800",
    textTransform: "uppercase",
    fontSize: 12,
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  activeSessionText: {
    color: "#1a1a1a",
    fontWeight: "700",
    fontSize: 14,
  },
  activeSessionButton: {
    marginTop: 10,
    alignSelf: "flex-start",
    backgroundColor: "#1b5e20",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  activeSessionButtonText: {
    color: "#ffffff",
    fontWeight: "800",
    fontSize: 12,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
});
