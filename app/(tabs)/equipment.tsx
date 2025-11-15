import { useRouter } from "expo-router";
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";

const machines = [
  { id: "1", name: "Bench Press", status: "available" },
  { id: "2", name: "Leg Press", status: "in use" },
  { id: "3", name: "Lat Pulldown", status: "reserved" },
  { id: "4", name: "Chest Fly", status: "available" },
  { id: "5", name: "Cable Row", status: "in use" },
];

const getStatusColor = (status: string) => {
  switch (status) {
    case "available":
      return "#00FF7F"; // neon green
    case "in use":
      return "#FF3B30"; // red
    case "reserved":
      return "#FFA500"; // orange/gold
    default:
      return "#999";
  }
};

export default function Equipment() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Equipment Availability</Text>

      <FlatList
        data={machines}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            // ✅ Type-safe navigation to dynamic route
            onPress={() => router.push({ pathname: "/machine/[id]", params: { id: item.id } })}
            activeOpacity={0.85}
            style={[styles.card, { borderLeftColor: getStatusColor(item.status) }]}
          >
            <View style={styles.cardTop}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={[styles.status, { color: getStatusColor(item.status) }]}>
                {item.status.toUpperCase()}
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
    backgroundColor: "#000", // gym black background
    padding: 20,
    paddingTop: 50,
  },
  title: {
    fontSize: 26,
    fontWeight: "900",
    color: "#00ff88", // gold
    textAlign: "center",
    marginBottom: 20,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  card: {
    backgroundColor: "#111",
    padding: 18,
    marginBottom: 15,
    borderRadius: 10,
    borderLeftWidth: 6,
    shadowColor: "#00ff88",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 5,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  name: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  status: {
    fontWeight: "800",
    fontSize: 14,
    textTransform: "uppercase",
  },
});
