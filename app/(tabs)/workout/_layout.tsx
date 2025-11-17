// urec-live-app/app/(tabs)/workout/_layout.tsx

import { Stack } from 'expo-router';

export default function WorkoutStackLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* The Workout tab will now navigate through this stack.
        The initial screen is (tabs)/workout/index.tsx (Select Your Workout)
      */}
      <Stack.Screen name="index" /> 
    </Stack>
  );
}