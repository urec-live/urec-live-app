import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";

const cardioOptions = ["Treadmill", "Elliptical", "Stairmaster"];

export default function CardioWorkout() {
  const router = useRouter();

  return (
    <LinearGradient colors={["#000", "#1a1a1a", "#000"]} style={{ flex: 1 }}>
      <View style={styles.container}>
        <Text style={styles.title}>Select Cardio Machine</Text>
        <FlatList
          data={cardioOptions}
          keyExtractor={(item) => item}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={styles.card} 
              // UPDATED: Navigating directly to the top-level tab screen '/equipment'
              onPress={() => router.push("/equipment")}
            >
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
    color: "#00ff88",
    fontWeight: "900",
    textAlign: "center",
    marginBottom: 20,
  },
  card: {
    backgroundColor: "#111",
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    alignItems: "center",
    shadowColor: "#00ff88",
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 5,
  },
  cardText: { color: "#00ff88", fontWeight: "700", fontSize: 18 },
});