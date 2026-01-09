import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View, ActivityIndicator } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useState, useEffect } from "react";
import { useSplit } from "@/contexts/SplitContext";
import { machineAPI } from "@/services/machineAPI";

export default function StrengthWorkout() {
  const router = useRouter();
  const { todayGroups, todayStrengthGroups } = useSplit();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [muscleGroups, setMuscleGroups] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchMuscleGroups = async () => {
    try {
      setError(null);
      const groups = await machineAPI.getMuscleGroups();
      setMuscleGroups(groups);
    } catch (err) {
      console.error('Failed to fetch muscle groups:', err);
      setError('Failed to load muscle groups');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMuscleGroups();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchMuscleGroups();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <LinearGradient colors={["#ffffff", "#f5f5f5", "#ffffff"]} style={{ flex: 1 }}>
        <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={{ marginTop: 10, color: '#666' }}>Loading muscle groups...</Text>
        </View>
      </LinearGradient>
    );
  }

  if (error) {
    return (
      <LinearGradient colors={["#ffffff", "#f5f5f5", "#ffffff"]} style={{ flex: 1 }}>
        <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
          <MaterialCommunityIcons name="alert-circle" size={48} color="#f44336" />
          <Text style={{ marginTop: 10, color: '#f44336', fontSize: 16 }}>{error}</Text>
          <TouchableOpacity 
            style={{ marginTop: 20, backgroundColor: '#4CAF50', padding: 12, borderRadius: 8 }}
            onPress={fetchMuscleGroups}
          >
            <Text style={{ color: '#fff', fontWeight: '600' }}>Retry</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={["#ffffff", "#f5f5f5", "#ffffff"]} style={{ flex: 1 }}>
      <View style={styles.container}>
        <Text style={styles.title}>SELECT MUSCLE GROUP</Text>
        {todayGroups.length > 0 ? (
          <Text style={styles.subTitle}>Today&apos;s focus: {todayGroups.join(", ")}</Text>
        ) : (
          <Text style={styles.subTitle}>
            Looks like a rest day. Update your split if you want a focused plan.
          </Text>
        )}

        <FlatList
          data={
            todayStrengthGroups.length > 0
              ? muscleGroups.filter((group) => todayStrengthGroups.includes(group))
              : muscleGroups
          }
          keyExtractor={(item) => item}
          contentContainerStyle={{ paddingRight: 8 }}
          showsVerticalScrollIndicator={false}
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
              style={styles.card}
              onPress={() =>
                router.push({
                  pathname: "/workout/exercises/[muscle]",
                  params: { muscle: item },
                })
              }
            >
              <MaterialCommunityIcons name="arm-flex" size={32} color="#4CAF50" />
              <View style={{ flex: 1 }}>
                <Text style={styles.cardText}>{item}</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, paddingTop: 60 },
  title: {
    fontSize: 26,
    color: "#1a1a1a",
    fontWeight: "900",
    textAlign: "center",
    marginBottom: 20,
  },
  subTitle: {
    color: "#666",
    textAlign: "center",
    marginBottom: 16,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 10,
    padding: 15,
    marginBottom: 12,
    elevation: 3,
    gap: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  cardText: { color: "#1a1a1a", fontWeight: "700", fontSize: 18 },
  countText: { color: "#666", fontSize: 14 },
});
