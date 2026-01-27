import { Platform } from "react-native";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";

import { notificationAPI } from "@/services/notificationAPI";

export const configureForegroundNotifications = () => {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
};

const getProjectId = () =>
  Constants.easConfig?.projectId ||
  Constants.expoConfig?.extra?.eas?.projectId ||
  Constants.expoConfig?.extra?.projectId;

const ENABLE_PUSH = process.env.EXPO_PUBLIC_ENABLE_PUSH !== "false";

export const registerForPushNotificationsAsync = async () => {
  if (!ENABLE_PUSH) {
    console.log("[push] disabled via EXPO_PUBLIC_ENABLE_PUSH");
    return;
  }
  if (!Device.isDevice) {
    console.log("[push] Physical device required for push notifications");
    return;
  }

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#1b5e20",
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    console.log("[push] Permission not granted");
    return;
  }

  const projectId = getProjectId();
  const tokenResponse = await Notifications.getExpoPushTokenAsync(
    projectId ? { projectId } : undefined
  );

  const token = tokenResponse.data;
  if (!token) {
    return;
  }

  await notificationAPI.registerPushToken({
    token,
    platform: Platform.OS,
    deviceName: Device.deviceName ?? null,
  });
};
