// urec-live-app/app/(tabs)/index.tsx

import { Redirect } from 'expo-router';

// This file catches the default route for the tabs group (e.g., '/')
// and redirects the user immediately to the intended start screen: /workout.
export default function TabRedirectScreen() {
  return <Redirect href="/workout" />;
}