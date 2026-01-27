import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
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
    <LinearGradient colors={["#ffffff", "#f5f5f5", "#ffffff"]} style={{ flex: 1 }}>
      <View style={styles.container}>
        <MaterialCommunityIcons name="dumbbell" size={64} color="#00ff88" />
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
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: "900",
    color: "#1a1a1a",
    marginBottom: 30,
  },
  input: {
    width: "90%",
    backgroundColor: "#ffffff",
    color: "#1a1a1a",
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  button: {
    width: "90%",
    backgroundColor: "#4CAF50",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
  toggleText: {
    color: "#4CAF50",
    marginTop: 20,
  },
  forgotText: {
    color: "#1b5e20",
    marginTop: 12,
    fontWeight: "700",
  },
  forgotContainer: {
    width: "100%",
    alignItems: "center",
    marginTop: 12,
  },
  guestButton: {
    marginTop: 14,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#4CAF50",
  },
  guestButtonText: {
    color: "#4CAF50",
    fontWeight: "700",
  },
});

