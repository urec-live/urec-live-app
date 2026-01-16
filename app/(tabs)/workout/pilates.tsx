import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSplit } from "@/contexts/SplitContext";

const pilatesOptions = ["Mat Pilates", "Reformer", "Power Pilates"];

export default function PilatesWorkout() {
  const router = useRouter();
  const { todayGroups, showAllWorkouts } = useSplit();
  const isPilatesDay =
    todayGroups.length === 0 || todayGroups.includes("Pilates") || todayGroups.includes("Core");
  const canShow = showAllWorkouts || isPilatesDay;

  return (
    <LinearGradient colors={["#ffffff", "#f5f5f5", "#ffffff"]} style={{ flex: 1 }}>
      <View style={styles.container}>
        <Text style={styles.title}>Select Pilates Type</Text>
        {!canShow && (
          <Text style={styles.subTitle}>
            Pilates isn&apos;t scheduled today. Update your split to focus on core work.
          </Text>
        )}
        <FlatList
          data={canShow ? pilatesOptions : []}
          keyExtractor={(item) => item}
          contentContainerStyle={{ paddingRight: 8 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={styles.card} 
              // UPDATED: Navigating directly to the top-level tab screen '/equipment'
              onPress={() => router.push("/equipment")}
            >
              <MaterialCommunityIcons name="yoga" size={32} color="#4CAF50" />
              <Text style={styles.cardText}>{item}</Text>
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
});
