// urec-live-app/app/(tabs)/_layout.tsx

import { MaterialCommunityIcons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { Tabs } from "expo-router";
import { StyleSheet } from "react-native";
import ActiveExerciseTracker from "@/components/ActiveExerciseTracker";
import DailyWorkoutSummary from "@/components/DailyWorkoutSummary";

export default function TabLayout() {
  return (
    <>
      <DailyWorkoutSummary />
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: "#ffffff",
            borderTopWidth: 0,
            elevation: 8, // Soft shadow for floating effect
            shadowColor: "#000",
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 0.05,
            shadowRadius: 10,
            height: 60,
            paddingBottom: 8,
          },
          tabBarBackground: () => <BlurView intensity={80} tint="light" style={StyleSheet.absoluteFill} />,
          tabBarActiveTintColor: "#4CAF50",
          tabBarInactiveTintColor: "#B0BEC5",
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
      <ActiveExerciseTracker />
    </>
  );
}
