import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useAuth } from "../../contexts/AuthContext";

export default function Profile() {
  const { signOut } = useAuth();
  const router = useRouter();

  const handleLogoutPress = () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to log out?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Logout",
          onPress: () => {
            signOut();
            router.replace("/(auth)/login");
          },
          style: "destructive",
        },
      ]
    );
  };

  return (
    <LinearGradient colors={["#000", "#1a1a1a", "#000"]} style={{ flex: 1 }}>
      <View style={styles.container}>
        <MaterialCommunityIcons name="account-circle" size={80} color="#00ff88" />
        <Text style={styles.title}>My Profile</Text>
        <Text style={styles.text}>Track your gym history and achievements here soon.</Text>
        
        <Pressable style={styles.logoutButton} onPress={handleLogoutPress}>
          <MaterialCommunityIcons name="logout" size={20} color="#fff" />
          <Text style={styles.logoutButtonText}>Logout</Text>
        </Pressable>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 25 },
  title: {
    fontSize: 26,
    fontWeight: "900",
    color: "#00ff88",
    marginTop: 20,
    marginBottom: 10,
  },
  text: { color: "#ccc", textAlign: "center", fontSize: 16, marginBottom: 40 },
  logoutButton: {
    backgroundColor: "#ff4444",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 30,
    flexDirection: "row",
    alignItems: "center",
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
