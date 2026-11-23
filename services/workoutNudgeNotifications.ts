import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { workoutFriendsAPI } from "./workoutFriendsAPI";

const tokenKey = (username: string) => `workout-nudge-token:${username}`;

export function getNudgeToken(username: string) {
  return AsyncStorage.getItem(tokenKey(username));
}

export async function enableNudgeNotifications(username: string) {
  const notifications = await import("expo-notifications");
  if (Platform.OS === "android") {
    await notifications.setNotificationChannelAsync("workout-nudges", {
      name: "Workout nudges",
      importance: notifications.AndroidImportance.DEFAULT,
    });
  }
  let permission = await notifications.getPermissionsAsync();
  if (permission.status !== "granted") permission = await notifications.requestPermissionsAsync();
  if (permission.status !== "granted") return false;
  const projectId = Constants.easConfig?.projectId ?? Constants.expoConfig?.extra?.eas?.projectId;
  if (!projectId) throw new Error("Push notifications are unavailable in this build");
  const { data: token } = await notifications.getExpoPushTokenAsync({ projectId });
  const previous = await getNudgeToken(username);
  if (previous && previous !== token) await workoutFriendsAPI.removeDevice(previous);
  await workoutFriendsAPI.registerDevice(token);
  await AsyncStorage.setItem(tokenKey(username), token);
  return true;
}

export async function disableNudgeNotifications(username: string) {
  const token = await getNudgeToken(username);
  if (!token) return;
  await workoutFriendsAPI.removeDevice(token);
  await AsyncStorage.removeItem(tokenKey(username));
}
