// urec-live-app/app/(tabs)/_layout.tsx

import { MaterialCommunityIcons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { Tabs } from "expo-router";
import { StyleSheet } from "react-native";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: "transparent", borderTopWidth: 0, elevation: 0 },
        tabBarBackground: () => <BlurView intensity={50} tint="dark" style={StyleSheet.absoluteFill} />,
        tabBarActiveTintColor: "#00ff88",
        tabBarInactiveTintColor: "#777",
      }}
    >
      <Tabs.Screen
        name="index" // This is the redirect file
        options={{
          title: "Home Redirect", // Temporary title for clarity
          href: null, // FIX: This hides the tab from the tab bar.
        }}
      />
      <Tabs.Screen
        name="workout"
        options={{
          title: "Workout",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="arm-flex" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="equipment"
        options={{
          title: "Equipment",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="dumbbell" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: "History",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="history" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="account-circle" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}