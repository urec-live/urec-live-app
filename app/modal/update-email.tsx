import React, { useState } from "react";
import {
    StyleSheet,
    Text,
    View,
    TextInput,
    Pressable,
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { userAPI } from "../../services/userAPI";
import { useAuth } from "../../contexts/AuthContext"; // To update user context if needed
import { MaterialCommunityIcons } from "@expo/vector-icons";

export default function UpdateEmailScreen() {
    const router = useRouter();
    const { user, refreshUser } = useAuth(); // Assume refreshUser exists or we explicitly fetch
    // Actually useAuth might not have refreshUser exposed. We might need to reload. 

    const [newEmail, setNewEmail] = useState(user?.email || "");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        if (!newEmail) {
            Alert.alert("Error", "Please enter an email address");
            return;
        }
        if (newEmail === user?.email) {
            Alert.alert("Info", "Email is unchanged");
            return;
        }

        try {
            setLoading(true);
            await userAPI.updateEmail(newEmail);
            await refreshUser(); // Refresh local user state
            Alert.alert("Success", "Email updated successfully", [
                { text: "OK", onPress: () => router.back() },
            ]);
            // Ideally trigger a profile refresh here
        } catch (error: any) {
            Alert.alert("Error", error.message || "Failed to update email");
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.container}
        >
            <View style={styles.header}>
                <Pressable onPress={() => router.back()} style={styles.backButton}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color="#333" />
                </Pressable>
                <Text style={styles.title}>Update Email</Text>
            </View>

            <Text style={styles.description}>
                Update your email address. You will use this new email to login.
            </Text>

            <View style={styles.form}>
                <Text style={styles.label}>Email Address</Text>
                <TextInput
                    style={styles.input}
                    value={newEmail}
                    onChangeText={setNewEmail}
                    placeholder="Enter new email"
                    autoCapitalize="none"
                    keyboardType="email-address"
                />

                <Pressable
                    style={[styles.button, loading && styles.buttonDisabled]}
                    onPress={handleSubmit}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.buttonText}>Save Changes</Text>
                    )}
                </Pressable>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#fff",
        padding: 20,
        paddingTop: 60,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    backButton: {
        marginRight: 10,
        padding: 5,
    },
    title: {
        fontSize: 24,
        fontWeight: "800",
        color: "#333",
    },
    description: {
        color: "#666",
        marginBottom: 30,
        lineHeight: 20,
    },
    form: {
        gap: 15,
    },
    label: {
        fontSize: 16,
        fontWeight: "600",
        color: "#333",
        marginBottom: 5,
    },
    input: {
        borderWidth: 1,
        borderColor: "#e0e0e0",
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        backgroundColor: "#f9f9f9",
    },
    button: {
        backgroundColor: "#4CAF50",
        padding: 15,
        borderRadius: 8,
        alignItems: "center",
        marginTop: 20,
    },
    buttonDisabled: {
        opacity: 0.7,
    },
    buttonText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "bold",
    },
});
