import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import 'react-native-reanimated';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { useColorScheme } from '@/hooks/use-color-scheme';
import ActiveExerciseTracker from '../components/ActiveExerciseTracker';
import DailyWorkoutSummary from '../components/DailyWorkoutSummary';
import HelpRequestBanner from '../components/HelpRequestBanner';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { HelpRequestProvider } from '../contexts/HelpRequestContext';
import { PlanProvider } from '../contexts/PlanContext';
import { WorkoutProvider } from '../contexts/WorkoutContext';

export const unstable_settings = {
  anchor: '(tabs)',
};

function RootLayoutNav() {
  const { user } = useAuth();

  return (
    <>
      <HelpRequestBanner />
      <DailyWorkoutSummary />
      <Stack screenOptions={{ headerShown: false }}>
        {user ? (
          <>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="settings/plan" options={{ headerShown: false }} />
            <Stack.Screen name="progress/[exercise]" options={{ headerShown: false }} />
            <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
          </>
        ) : (
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        )}
      </Stack>
      <ActiveExerciseTracker />
    </>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <AuthProvider>
      <WorkoutProvider>
        <PlanProvider>
          <HelpRequestProvider>
            <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
              <SafeAreaProvider>
                <SafeAreaView style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
                  <RootLayoutNav />
                  <StatusBar style="auto" />
                </SafeAreaView>
              </SafeAreaProvider>
            </ThemeProvider>
          </HelpRequestProvider>
        </PlanProvider>
      </WorkoutProvider>
    </AuthProvider>
  );
}
