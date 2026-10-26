import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import 'react-native-reanimated';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { useLiveMachineUpdates } from '@/hooks/useLiveMachineUpdates';
import ActiveExerciseTracker from '../components/ActiveExerciseTracker';
import BackendUnreachableNotice from '../components/BackendUnreachableNotice';
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
  const { loading, user } = useAuth();
  // Machine statuses stay live on every screen, not just the Equipment tab (before the early return: it's a hook)
  useLiveMachineUpdates(!!user);

  if (loading) {
    return null;
  }

  return (
    <>
      {/* Signed in or not: the sign-in screen needs it too */}
      <BackendUnreachableNotice />
      {user ? <HelpRequestBanner /> : null}
      {user ? <DailyWorkoutSummary /> : null}
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Protected guard={!user}>
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        </Stack.Protected>
        <Stack.Protected guard={!!user}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="chat" options={{ headerShown: false }} />
          <Stack.Screen name="chat/community" options={{ headerShown: false }} />
          <Stack.Screen name="chat/dm/index" options={{ headerShown: false }} />
          <Stack.Screen name="chat/dm/[username]" options={{ headerShown: false }} />
          <Stack.Screen name="demo-player" options={{ headerShown: false }} />
          <Stack.Screen name="help-request" options={{ headerShown: false }} />
          <Stack.Screen name="machine/[id]" options={{ headerShown: false }} />
          <Stack.Screen name="my-reports" options={{ headerShown: false }} />
          <Stack.Screen name="progress/[exercise]" options={{ headerShown: false }} />
          <Stack.Screen name="report-issue" options={{ headerShown: false }} />
          <Stack.Screen name="scan" options={{ headerShown: false }} />
          <Stack.Screen name="settings/plan" options={{ headerShown: false }} />
          <Stack.Screen name="summary" options={{ headerShown: false }} />
          <Stack.Screen name="users/[username]" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        </Stack.Protected>
      </Stack>
      {user ? <ActiveExerciseTracker /> : null}
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
