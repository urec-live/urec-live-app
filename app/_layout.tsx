import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import 'react-native-reanimated';
import { Platform, ToastAndroid } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { machineAPI } from '@/services/machineAPI';
import { configureForegroundNotifications } from '@/services/pushNotifications';
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
    if (loading) {
      return;
    }

    const isInAuthFlow = segments.includes('(auth)');

    if (!user && !isGuest && !isInAuthFlow) {
      router.replace('/(auth)/login');
      return;
    }

    if ((user || isGuest) && isInAuthFlow) {
      router.replace('/(tabs)');
    }
  }, [loading, user, isGuest, segments, router]);

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
          try {
            const exercises = await machineAPI.getExercisesByEquipmentCode(session.equipment.code);
            if (exercises.length > 0) {
              router.replace({
                pathname: '/workout/equipment/[exercise]',
                params: {
                  exercise: exercises[0].name,
                  muscle: exercises[0].muscleGroup,
                },
              });
            } else {
              router.replace({
                pathname: '/machine/[id]',
                params: { id: String(session.equipment.id) },
              });
            }
          } catch {
            router.replace({
              pathname: '/machine/[id]',
              params: { id: String(session.equipment.id) },
            });
          }
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
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    configureForegroundNotifications();
  }, []);

  return (
    <AuthProvider>
      <WorkoutProvider>
        <SplitProvider>
          <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
            <SafeAreaProvider>
              <RootLayoutNav />
            </SafeAreaProvider>
          </ThemeProvider>
        </SplitProvider>
      </WorkoutProvider>
    </AuthProvider>
  );
}
