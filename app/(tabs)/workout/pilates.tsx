import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";

const pilatesOptions = ["Mat Pilates", "Reformer", "Power Pilates"];

export default function PilatesWorkout() {
  const router = useRouter();

  return (
    <LinearGradient colors={["#ffffff", "#f5f5f5", "#ffffff"]} style={{ flex: 1 }}>
      <View style={styles.container}>
        <Text style={styles.title}>Select Pilates Type</Text>
        <FlatList
          data={pilatesOptions}
          keyExtractor={(item) => item}
          contentContainerStyle={{ paddingRight: 8 }}
          showsVerticalScrollIndicator={false}
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
    color: "#1a1a1a",
    fontWeight: "900",
    textAlign: "center",
    marginBottom: 20,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  cardText: { color: "#4CAF50", fontWeight: "700", fontSize: 18 },
});