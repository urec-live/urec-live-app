import { MaterialCommunityIcons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { Tabs } from "expo-router";
import { StyleSheet, View } from "react-native";
import ActiveExerciseTracker from "@/components/ActiveExerciseTracker";
import DailyWorkoutSummary from "@/components/DailyWorkoutSummary";
import { Colors } from "@/constants/theme";

export default function TabLayout() {
  return (
    <>
      <DailyWorkoutSummary />
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: 'transparent',
            borderTopWidth: 0,
            elevation: 0,
            height: 60,
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
          },
          tabBarBackground: () => (
            <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
          ),
          tabBarItemStyle: {
            paddingTop: 8,
            paddingBottom: 8,
          },
          tabBarActiveTintColor: Colors.dark.primary, // Neon Cyan
          tabBarInactiveTintColor: Colors.dark.icon,
        }}
      >
        <Tabs.Screen
          name="index" // This is the redirect file
          options={{
            title: "Home Redirect",
            href: null,
          }}
        />
        <Tabs.Screen
          name="workout"
          options={{
            title: "Workout",
            tabBarIcon: ({ color, size, focused }) => (
              <View style={focused ? styles.activeTabIcon : null}>
                <MaterialCommunityIcons name="arm-flex" size={size} color={color} />
              </View>
            ),
          }}
        />
        <Tabs.Screen
          name="equipment"
          options={{
            title: "Equipment",
            tabBarIcon: ({ color, size, focused }) => (
              <View style={focused ? styles.activeTabIcon : null}>
                <MaterialCommunityIcons name="dumbbell" size={size} color={color} />
              </View>
            ),
          }}
        />
        <Tabs.Screen
          name="history"
          options={{
            title: "History",
            tabBarIcon: ({ color, size, focused }) => (
              <View style={focused ? styles.activeTabIcon : null}>
                <MaterialCommunityIcons name="history" size={size} color={color} />
              </View>
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: "Profile",
            tabBarIcon: ({ color, size, focused }) => (
              <View style={focused ? styles.activeTabIcon : null}>
                <MaterialCommunityIcons name="account-circle" size={size} color={color} />
              </View>
            ),
          }}
        />
      </Tabs>
      <ActiveExerciseTracker />
    </>
  );
}

const styles = StyleSheet.create({
  activeTabIcon: {
    shadowColor: Colors.dark.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 5,
  },
});
