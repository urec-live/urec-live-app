import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

const machineData = {
  "1": { name: "Bench Press", status: "available" },
  "2": { name: "Leg Press", status: "in use" },
  "3": { name: "Lat Pulldown", status: "reserved" },
  "4": { name: "Chest Fly", status: "available" },
  "5": { name: "Cable Row", status: "in use" },
};

export default function MachineDetails() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const machine = machineData[id as keyof typeof machineData];
  const [status, setStatus] = useState(machine?.status || "available");

  const handleAction = (action: string) => {
    if (action === "reserve") setStatus("reserved");
    if (action === "checkin") setStatus("in use");
    if (action === "end") setStatus("available");
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>

      <Text style={styles.title}>{machine?.name}</Text>
      <Text style={[styles.status, { color: getStatusColor(status) }]}>
        {status.toUpperCase()}
      </Text>

      <View style={styles.buttons}>
        {status === "available" && (
          <TouchableOpacity
            style={[styles.button, styles.goldButton]}
            onPress={() => handleAction("reserve")}
          >
            <Text style={styles.buttonText}>RESERVE</Text>
          </TouchableOpacity>
        )}

        {status === "reserved" && (
          <TouchableOpacity
            style={[styles.button, styles.goldButton]}
            onPress={() => handleAction("checkin")}
          >
            <Text style={styles.buttonText}>CHECK IN</Text>
          </TouchableOpacity>
        )}

        {status === "in use" && (
          <TouchableOpacity
            style={[styles.button, styles.goldButton]}
            onPress={() => handleAction("end")}
          >
            <Text style={styles.buttonText}>END SESSION</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "available":
      return "#00FF7F";
    case "in use":
      return "#FF3B30";
    case "reserved":
      return "#FFA500";
    default:
      return "#999";
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
    padding: 25,
  },
  backButton: {
    marginBottom: 20,
  },
  backText: {
    color: "#00ff88",
    fontWeight: "700",
    fontSize: 16,
  },
  title: {
    color: "#00ff88",
    fontSize: 28,
    fontWeight: "900",
    textAlign: "center",
    marginBottom: 10,
  },
  status: {
    textAlign: "center",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 40,
  },
  buttons: {
    alignItems: "center",
  },
  button: {
    width: "70%",
    paddingVertical: 15,
    borderRadius: 35,
    marginBottom: 15,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#00ff88",
    shadowOpacity: 0.7,
    shadowRadius: 12,
    elevation: 8,
  },
  goldButton: {
    backgroundColor: "#009c67",
  },
  buttonText: {
    color: "#000",
    fontWeight: "800",
    fontSize: 16,
    letterSpacing: 1,
  },
});
