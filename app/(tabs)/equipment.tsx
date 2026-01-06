import { useRouter } from "expo-router";
import { FlatList, StyleSheet, Text, TouchableOpacity, View, RefreshControl, ActivityIndicator } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import { MachineDto, machineAPI } from "@/services/machineAPI";
import websocketService from "@/services/websocketService";


export default function Equipment() {
  const router = useRouter();
  const [machines, setMachines] = useState<MachineDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadMachines = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      console.log('[Equipment] Fetching machines from API...');
      const res = await machineAPI.listAll();
      console.log('[Equipment] Machines received:', res.length);
      setMachines(res);
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
    loadMachines();

    // Connect to WebSocket for real-time updates
    websocketService.connect();
    
    const unsubscribe = websocketService.subscribe((updatedMachine) => {
      console.log('[Equipment] Received machine update via WebSocket:', updatedMachine);
      setMachines(prev => 
        prev.map(m => m.id === updatedMachine.id ? updatedMachine : m)
      );
    });

    // Cleanup on unmount
    return () => {
      unsubscribe();
    };
  }, []);

  const onRefresh = () => {
    loadMachines(true);
  };

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
      <Text style={styles.title}>Equipment Availability</Text>
      <TouchableOpacity style={styles.scanButton} onPress={() => router.push("/scan")}>
        <Text style={styles.scanButtonText}>Scan QR to Check In</Text>
      </TouchableOpacity>

      <FlatList
        data={machines}
        keyExtractor={(item) => item.code}
        contentContainerStyle={{ paddingRight: 8 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No machines available</Text>
            <Text style={styles.emptySubtext}>Pull to refresh</Text>
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
  title: {
    fontSize: 26,
    fontWeight: "900",
    color: "#1a1a1a",
    textAlign: "center",
    marginBottom: 20,
    letterSpacing: 1,
    textTransform: "uppercase",
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
    borderRadius: 12,
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
});
