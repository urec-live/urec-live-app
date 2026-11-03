// urec-live-app/app/(tabs)/_layout.tsx

import { MaterialCommunityIcons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { Tabs } from "expo-router";
import { Platform, StyleSheet } from "react-native";

import { useGym } from "@/contexts/GymContext";

export default function TabLayout() {
  const { gym } = useGym();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#FFFFFF",
          borderTopWidth: 1,
          borderTopColor: "#E1E7E3",
          elevation: 0,
          paddingTop: 7,
          // Web only. On a phone, even `height: undefined` here replaces the height and bottom inset
          // React Navigation works out, and the tab bar collapses to nothing.
          ...(Platform.OS === "web" && { height: 64, paddingBottom: 8 }),
        },
        tabBarBackground: () => (
          <BlurView
            intensity={60}
            tint="light"
            style={StyleSheet.absoluteFill}
          />
        ),
        tabBarActiveTintColor: "#216C50",
        tabBarInactiveTintColor: "#839088",
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
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
          href: gym ? "/equipment" : null,
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
        name="league"
        options={{
          title: "League",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="trophy" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons
              name="account-circle"
              size={size}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}
