import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, usePathname, Link } from 'expo-router';
import { Text, View } from 'react-native';
import { GymProvider, useGym } from '@/contexts/GymContext';
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
  const { loading, user } = useAuth();
  const { gym, loading: gymLoading } = useGym();
  const pathname = usePathname();
  const gymRoute = ['/equipment','/scan','/machine/','/report-issue','/workout/equipment/'].some(prefix => pathname.startsWith(prefix));

  if (loading) {
    return null;
  }

  if (user && gymRoute && (gymLoading || !gym)) return <View style={{ padding: 28, gap: 16 }}>
    <Text>{gymLoading ? 'Loading your gym…' : 'Connect to a gym to use equipment, maps and QR check-in.'}</Text>
    <Link href="/settings/gym">Connect to a gym in Settings</Link><Link href="/workout">Browse all exercises</Link>
  </View>;
  return (
    <>
      {user ? <HelpRequestBanner /> : null}
      {user ? <DailyWorkoutSummary /> : null}
      <Stack key={gym?.id ?? "independent"} screenOptions={{ headerShown: false }}>
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
          <Stack.Screen name="settings/gym" options={{ headerShown: false }} />
          <Stack.Screen name="exercise/[id]" options={{ headerShown: false }} />
          <Stack.Screen name="exercise/custom" options={{ headerShown: false }} />
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
          <HelpRequestProvider><GymProvider>
            <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
              <SafeAreaProvider>
                <SafeAreaView style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
                  <RootLayoutNav />
                  <StatusBar style="auto" />
                </SafeAreaView>
              </SafeAreaProvider>
            </ThemeProvider>
          </GymProvider></HelpRequestProvider>
        </PlanProvider>
      </WorkoutProvider>
    </AuthProvider>
  );
}
