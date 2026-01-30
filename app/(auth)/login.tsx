import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useAuth } from "../../contexts/AuthContext";
import { authAPI } from "../../services/authAPI";
import { Colors } from "../../constants/theme";

export default function LoginScreen() {
  const [isRegistering, setIsRegistering] = useState(false);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signIn, signUp, startGuest } = useAuth();
  const router = useRouter();

  const handleAuth = async () => {
    if (!username || !password) {
      Alert.alert("Error", "Please enter both username and password.");
      return;
    }

    if (isRegistering) {
      if (!email || !confirmPassword) {
        Alert.alert("Error", "Please fill in all fields.");
        return;
      }
      if (password !== confirmPassword) {
        Alert.alert("Error", "Passwords do not match.");
        return;
      }

      try {
        setLoading(true);
        await signUp(username, email, password);
        Alert.alert("Success", "Registration successful!");
        router.replace("/(tabs)");
      } catch (error: any) {
        Alert.alert("Registration Failed", error.response?.data?.message || "Failed to register. Please try again.");
      } finally {
        setLoading(false);
      }
    } else {
      try {
        setLoading(true);
        await signIn(username, password);
        router.replace("/(tabs)");
      } catch (error: any) {
        Alert.alert("Login Failed", error.response?.data?.message || "Invalid credentials. Please try again.");
      } finally {
        setLoading(false);
      }
    }
  };

  const handleForgotPassword = async () => {
    if (!forgotEmail.trim()) {
      Alert.alert("Error", "Please enter your email.");
      return;
    }
    try {
      setForgotLoading(true);
      await authAPI.forgotPassword(forgotEmail.trim());
      Alert.alert(
        "Check your email",
        "If an account exists for that email, you'll receive a reset link shortly."
      );
      setShowForgotPassword(false);
      setForgotEmail("");
    } catch (error: any) {
      Alert.alert("Error", "Unable to request password reset right now.");
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.contentContainer}>
        <View style={styles.iconContainer}>
          <MaterialCommunityIcons name="dumbbell" size={48} color={Colors.light.primary} />
        </View>
        <Text style={styles.title}>UREC Live</Text>

        <TextInput
          style={styles.input}
          placeholder="Username"
          placeholderTextColor="#888"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          editable={!loading}
        />

        {isRegistering && (
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#888"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            editable={!loading}
          />
        )}

        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#888"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          editable={!loading}
        />

        {isRegistering && (
          <TextInput
            style={styles.input}
            placeholder="Confirm Password"
            placeholderTextColor="#888"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            editable={!loading}
          />
        )}

        <Pressable
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleAuth}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>
              {isRegistering ? "Register" : "Login"}
            </Text>
          )}
        </Pressable>

        {!isRegistering && (
          <>
            <Pressable
              onPress={() => setShowForgotPassword((prev) => !prev)}
              disabled={loading || forgotLoading}
            >
              <Text style={styles.forgotText}>Forgot password?</Text>
            </Pressable>

            {showForgotPassword && (
              <View style={styles.forgotContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="Email"
                  placeholderTextColor="#888"
                  value={forgotEmail}
                  onChangeText={setForgotEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  editable={!forgotLoading}
                />
                <Pressable
                  style={[styles.button, forgotLoading && styles.buttonDisabled]}
                  onPress={handleForgotPassword}
                  disabled={forgotLoading}
                >
                  {forgotLoading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.buttonText}>Send Reset Link</Text>
                  )}
                </Pressable>
              </View>
            )}
          </>
        )}

        <Pressable onPress={() => {
          setIsRegistering(!isRegistering);
          setUsername("");
          setEmail("");
          setPassword("");
          setConfirmPassword("");
          setShowForgotPassword(false);
          setForgotEmail("");
        }} disabled={loading}>
          <Text style={styles.toggleText}>
            {isRegistering
              ? "Already have an account? Login"
              : "Don't have an account? Register"}
          </Text>
        </Pressable>

        <Pressable
          style={[styles.guestButton, loading && styles.buttonDisabled]}
          onPress={async () => {
            setLoading(true);
            await startGuest();
            router.replace("/(tabs)");
            setLoading(false);
          }}
          disabled={loading}
        >
          <Text style={styles.guestButtonText}>Continue as Guest</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
    justifyContent: "center",
  },
  contentContainer: {
    padding: 24,
    alignItems: "center",
  },
  iconContainer: {
    width: 80,
    height: 80,
    backgroundColor: Colors.light.primaryLight,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
    shadowColor: Colors.light.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: "900",
    color: Colors.light.text,
    marginBottom: 32,
    letterSpacing: 0.5,
  },
  input: {
    width: "100%",
    backgroundColor: Colors.light.surface,
    color: Colors.light.text,
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 0,
    shadowColor: Colors.light.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  button: {
    width: "100%",
    backgroundColor: Colors.light.primary,
    padding: 16,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 12,
    shadowColor: Colors.light.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
    letterSpacing: 0.5,
  },
  toggleText: {
    color: Colors.light.primary,
    marginTop: 24,
    fontWeight: "600",
  },
  forgotText: {
    color: Colors.light.textSecondary,
    marginTop: 16,
    fontWeight: "600",
    fontSize: 13,
  },
  forgotContainer: {
    width: "100%",
    alignItems: "center",
    marginTop: 16,
  },
  guestButton: {
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.light.secondary,
    backgroundColor: "transparent",
  },
  guestButtonText: {
    color: Colors.light.textSecondary,
    fontWeight: "600",
    fontSize: 13,
  },
});

