import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useAuth } from "../../contexts/AuthContext";
import { useWorkout } from "../../contexts/WorkoutContext";
import { usePlan } from "../../contexts/PlanContext";

export default function Profile() {
  const { signOut, user } = useAuth();
  const { resetWorkout } = useWorkout();
  const { activePlan } = usePlan();
  const router = useRouter();

  const handleLogoutPress = () => {
    if (Platform.OS === "web") {
      if (window.confirm("Are you sure you want to log out?")) {
        resetWorkout();
        signOut();
        router.replace("/(auth)/login");
      }
      return;
    }
    Alert.alert(
      "Logout",
      "Are you sure you want to log out?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Logout",
          onPress: () => {
            resetWorkout();
            signOut();
            router.replace("/(auth)/login");
          },
          style: "destructive",
        },
      ]
    );
  };

  return (
    <LinearGradient colors={["#ffffff", "#f5f5f5", "#ffffff"]} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* User Info */}
        <View style={styles.userSection}>
          <MaterialCommunityIcons name="account-circle" size={80} color="#4CAF50" />
          <Text style={styles.username}>{user?.username || "User"}</Text>
          <Text style={styles.email}>{user?.email || ""}</Text>
        </View>

        {/* Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Settings</Text>

          <Pressable
            style={styles.settingsRow}
            onPress={() => router.push("/settings/plan" as any)}
          >
            <View style={styles.settingsLeft}>
              <MaterialCommunityIcons name="calendar-clock" size={24} color="#4CAF50" />
              <View>
                <Text style={styles.settingsLabel}>Workout Plan</Text>
                <Text style={styles.settingsDescription}>
                  {activePlan ? activePlan.name : "Set your weekly workout schedule"}
                </Text>
              </View>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={24} color="#ccc" />
          </Pressable>
        </View>

        {/* Logout */}
        <View style={styles.section}>
          <Pressable style={styles.logoutButton} onPress={handleLogoutPress}>
            <MaterialCommunityIcons name="logout" size={20} color="#fff" />
            <Text style={styles.logoutButtonText}>Logout</Text>
          </Pressable>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 40,
  },
  userSection: {
    alignItems: "center",
    marginBottom: 30,
  },
  username: {
    fontSize: 24,
    fontWeight: "900",
    color: "#1a1a1a",
    marginTop: 12,
  },
  email: {
    fontSize: 14,
    color: "#888",
    marginTop: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#999",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  settingsRow: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  settingsLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  settingsLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1a1a1a",
  },
  settingsDescription: {
    fontSize: 13,
    color: "#888",
    marginTop: 2,
  },
  logoutButton: {
    backgroundColor: "#ff4444",
    borderRadius: 10,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderWidth: 2,
    borderColor: "#ff6666",
  },
  logoutButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
});
