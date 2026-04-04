import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import {
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useAuth } from "../../contexts/AuthContext";
import { useWorkout } from "../../contexts/WorkoutContext";

export default function Profile() {
  const { signOut, user, sessionExpiresAt } = useAuth();
  const { resetWorkout } = useWorkout();
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
    Alert.alert("Logout", "Are you sure you want to log out?", [
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
    ]);
  };

  const formatExpiry = (timestamp: number | null) => {
    if (!timestamp) return "Unknown";
    const date = new Date(timestamp);
    return date.toLocaleDateString(undefined, {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const displayName = user?.username || user?.email?.split("@")[0] || "User";
  const initials = getInitials(displayName);

  return (
    <LinearGradient
      colors={["#ffffff", "#f5f5f5", "#ffffff"]}
      style={{ flex: 1 }}
    >
      <View style={styles.container}>
        <View style={styles.avatarContainer}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>

        <Text style={styles.username}>{displayName}</Text>

        {user?.email ? <Text style={styles.email}>{user.email}</Text> : null}

        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="account" size={20} color="#4CAF50" />
            <Text style={styles.infoLabel}>Username</Text>
            <Text style={styles.infoValue}>{user?.username || "—"}</Text>
          </View>

          {user?.email ? (
            <View style={styles.infoRow}>
              <MaterialCommunityIcons
                name="email-outline"
                size={20}
                color="#4CAF50"
              />
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue} numberOfLines={1}>
                {user.email}
              </Text>
            </View>
          ) : null}

          <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
            <MaterialCommunityIcons
              name="shield-check-outline"
              size={20}
              color="#4CAF50"
            />
            <Text style={styles.infoLabel}>Session valid until</Text>
            <Text style={styles.infoValue}>
              {formatExpiry(sessionExpiresAt)}
            </Text>
          </View>
        </View>

        <View style={styles.badge}>
          <MaterialCommunityIcons name="dumbbell" size={14} color="#4CAF50" />
          <Text style={styles.badgeText}>UREC Live Member</Text>
        </View>

        <Pressable style={styles.logoutButton} onPress={handleLogoutPress}>
          <MaterialCommunityIcons name="logout" size={20} color="#fff" />
          <Text style={styles.logoutButtonText}>Logout</Text>
        </Pressable>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 25,
    paddingTop: 60,
  },
  avatarContainer: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "#4CAF50",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    shadowColor: "#4CAF50",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  avatarText: {
    fontSize: 34,
    fontWeight: "900",
    color: "#fff",
    letterSpacing: 1,
  },
  username: {
    fontSize: 26,
    fontWeight: "900",
    color: "#1a1a1a",
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: "#888",
    marginBottom: 28,
  },
  infoCard: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    gap: 10,
  },
  infoLabel: {
    flex: 1,
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  infoValue: {
    fontSize: 14,
    color: "#1a1a1a",
    fontWeight: "700",
    maxWidth: "55%",
    textAlign: "right",
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#e8f5e9",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginBottom: 32,
  },
  badgeText: {
    color: "#4CAF50",
    fontWeight: "700",
    fontSize: 13,
  },
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
