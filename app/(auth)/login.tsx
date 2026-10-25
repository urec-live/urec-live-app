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
import { GoogleSignInButton } from "../../components/GoogleSignInButton";

export default function LoginScreen() {
  const [isRegistering, setIsRegistering] = useState(false);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn, signInWithGoogle, signUp } = useAuth();
  const [googleError, setGoogleError] = useState<string | null>(null);
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

  const handleGoogleToken = async (idToken: string) => {
    try {
      setLoading(true);
      setGoogleError(null);
      await signInWithGoogle(idToken);
      router.replace("/(tabs)");
    } catch (error: any) {
      setGoogleError(error.response?.data?.error || "Google sign-in failed. Please try again.");
    } finally {
      setLoading(false);
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
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>
            <GoogleSignInButton disabled={loading} onToken={handleGoogleToken} />
            {googleError ? <Text style={styles.errorText}>{googleError}</Text> : null}
          </>
        )}

        <Pressable onPress={() => {
          setIsRegistering(!isRegistering);
          setUsername("");
          setEmail("");
          setPassword("");
          setConfirmPassword("");
        }} disabled={loading}>
          <Text style={styles.toggleText}>
            {isRegistering
              ? "Already have an account? Login"
              : "Don't have an account? Register"}
          </Text>
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
  dividerRow: {
    alignItems: "center",
    flexDirection: "row",
    marginVertical: 20,
    width: "90%",
  },
  dividerLine: {
    backgroundColor: "#d0d5dd",
    flex: 1,
    height: 1,
  },
  dividerText: {
    color: "#667085",
    marginHorizontal: 12,
  },
  errorText: {
    color: "#b42318",
    fontSize: 13,
    marginTop: 8,
    textAlign: "center",
    width: "90%",
  },
});

