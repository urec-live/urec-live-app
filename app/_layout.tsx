import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef } from 'react';
import 'react-native-reanimated';
import { Platform, ToastAndroid } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { machineAPI } from '@/services/machineAPI';
import ActiveExerciseTracker from '../components/ActiveExerciseTracker';
import ActiveSessionBanner from '../components/ActiveSessionBanner';
import DailyWorkoutSummary from '../components/DailyWorkoutSummary';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { SplitProvider } from '../contexts/SplitContext';
import { useWorkout, WorkoutProvider } from '../contexts/WorkoutContext';

export const unstable_settings = {
  anchor: '(tabs)',
};

function RootLayoutNav() {
  const { user, isGuest, loading } = useAuth();
  const { currentSession } = useWorkout();
  const router = useRouter();
  const segments = useSegments();
  const didAutoResume = useRef(false);

  useEffect(() => {
    didAutoResume.current = false;
  }, [user?.username, isGuest]);

  useEffect(() => {
    if (loading || !user || isGuest) {
      return;
    }

    if (didAutoResume.current || currentSession) {
      return;
    }

    const isInActiveFlow =
      segments.includes('machine') || segments.includes('workout') || segments.includes('scan');
    if (isInActiveFlow) {
      return;
    }

    didAutoResume.current = true;

    const autoResume = async () => {
      try {
        const session = await machineAPI.getMyActiveSession();
        if (session?.equipment?.id) {
          router.replace({
            pathname: '/machine/[id]',
            params: { id: String(session.equipment.id) },
          });
          if (Platform.OS === 'android') {
            ToastAndroid.show('Resumed your active session', ToastAndroid.SHORT);
          } else {
            console.log('[Resume] Active session restored');
          }
        }
      } catch {
        // If this fails, stay on the current screen.
      }
    };

    autoResume();
  }, [loading, user, isGuest, currentSession, segments, router]);

  return (
    <>
      <DailyWorkoutSummary />
      <ActiveSessionBanner />
      <Stack screenOptions={{ headerShown: false }}>
        {user || isGuest ? (
          <>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
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
        <SplitProvider>
          <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
            <SafeAreaProvider>
              <SafeAreaView style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
                <RootLayoutNav />
                <StatusBar style="auto" />
              </SafeAreaView>
            </SafeAreaProvider>
          </ThemeProvider>
        </SplitProvider>
      </WorkoutProvider>
    </AuthProvider>
  );
}
