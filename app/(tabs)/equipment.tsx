import { useRouter } from "expo-router";
import { FlatList, StyleSheet, Text, TouchableOpacity, View, RefreshControl, ActivityIndicator } from "react-native";
import React, { useEffect, useState } from "react";
import { MachineDto, machineAPI } from "@/services/machineAPI";
import websocketService from "@/services/websocketService";

const getStatusColor = (status: string) => {
  const upperStatus = status.toUpperCase();
  switch (upperStatus) {
    case "AVAILABLE":
      return "#4CAF50"; // green
    case "IN USE":
    case "IN_USE":
      return "#FF5722"; // red-orange
    default:
      return "#999";
  }
};

export default function Equipment() {
  const router = useRouter();
  const [machines, setMachines] = useState<MachineDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadMachines = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      console.log('Fetching machines from API...');
      const res = await machineAPI.listAll();
      console.log('Machines received:', res);
      console.log('Number of machines:', res.length);
      if (res.length > 0) {
        console.log('First machine:', JSON.stringify(res[0]));
        console.log('First machine status:', res[0].status);
        console.log('Status color:', getStatusColor(res[0].status));
      }
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
        renderItem={({ item }) => (
          <TouchableOpacity
            // ✅ Type-safe navigation to dynamic route
            onPress={() => router.push({ pathname: "/machine/[id]", params: { id: String(item.id) } })}
            activeOpacity={0.85}
            style={[styles.card, { borderLeftColor: getStatusColor(item.status) }]}
          >
            <View style={styles.cardTop}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={[styles.status, { color: getStatusColor(item.status) }]}>
                {item.status}
              </Text>
            </View>
          </TouchableOpacity>
        )}
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
    backgroundColor: "#ffffff",
    padding: 18,
    marginBottom: 15,
    borderRadius: 10,
    borderLeftWidth: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
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
  scanButtonText: { color: "#ffffff", fontWeight: "900", fontSize: 14 },
  name: {
    color: "#1a1a1a",
    fontSize: 18,
    fontWeight: "700",
  },
  status: {
    fontWeight: "800",
    fontSize: 14,
    textTransform: "uppercase",
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
