import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
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
import { authAPI } from "../../services/authAPI";

export default function ResetPasswordScreen() {
    const { token } = useLocalSearchParams();
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleResetPassword = async () => {
        if (!newPassword || !confirmPassword) {
            Alert.alert("Error", "Please fill in all fields.");
            return;
        }
        if (newPassword !== confirmPassword) {
            Alert.alert("Error", "Passwords do not match.");
            return;
        }
        if (!token || typeof token !== "string") {
            Alert.alert("Error", "Invalid logic. No token found.");
            return;
        }

        try {
            setLoading(true);
            await authAPI.resetPassword(token, newPassword);
            Alert.alert("Success", "Your password has been reset.", [
                { text: "Login", onPress: () => router.replace("/(auth)/login") },
            ]);
        } catch (error: any) {
            Alert.alert("Error", "Failed to reset password. Link may be expired.");
        } finally {
            setLoading(false);
        }
    };

    if (!token) {
        return (
            <LinearGradient colors={["#ffffff", "#f5f5f5", "#ffffff"]} style={{ flex: 1 }}>
                <View style={styles.container}>
                    <Text style={styles.subtitle}>Invalid or missing reset token.</Text>
                    <Pressable onPress={() => router.replace("/(auth)/login")} style={styles.backButton}>
                        <Text style={styles.backText}>Back to Login</Text>
                    </Pressable>
                </View>
            </LinearGradient>
        )
    }

    return (
        <LinearGradient colors={["#ffffff", "#f5f5f5", "#ffffff"]} style={{ flex: 1 }}>
            <View style={styles.container}>
                <MaterialCommunityIcons name="lock-check" size={64} color="#00ff88" />
                <Text style={styles.title}>Set New Password</Text>

                <TextInput
                    style={styles.input}
                    placeholder="New Password"
                    placeholderTextColor="#888"
                    value={newPassword}
                    onChangeText={setNewPassword}
                    secureTextEntry
                    editable={!loading}
                />

                <TextInput
                    style={styles.input}
                    placeholder="Confirm New Password"
                    placeholderTextColor="#888"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry
                    editable={!loading}
                />

                <Pressable
                    style={[styles.button, loading && styles.buttonDisabled]}
                    onPress={handleResetPassword}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.buttonText}>Reset Password</Text>
                    )}
                </Pressable>

                <Pressable onPress={() => router.replace("/(auth)/login")} style={styles.backButton} disabled={loading}>
                    <Text style={styles.backText}>Back to Login</Text>
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
        fontSize: 28,
        fontWeight: "900",
        color: "#1a1a1a",
        marginBottom: 30,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 18,
        color: '#666',
        marginBottom: 20,
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
    backButton: {
        marginTop: 20,
        padding: 10,
    },
    backText: {
        color: "#4CAF50",
        fontWeight: "600",
    }
});
