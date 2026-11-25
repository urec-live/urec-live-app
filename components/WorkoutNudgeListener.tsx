import { router } from "expo-router";
import { useEffect } from "react";
import { Platform } from "react-native";
import type { NotificationResponse } from "expo-notifications";
import { workoutFriendsAPI } from "@/services/workoutFriendsAPI";
import { getNudgeToken } from "@/services/workoutNudgeNotifications";

export default function WorkoutNudgeListener({ username }: { username: string }) {
  useEffect(() => {
    if (Platform.OS === "web") return;
    let disposed = false;
    let subscription: { remove: () => void } | undefined;

    async function listen() {
      const notifications = await import("expo-notifications");
      if (disposed) return;
      notifications.setNotificationHandler({
        handleNotification: async ({ request }) => {
          const data = request.content.data;
          const show = data.kind === "workout-nudge" && data.recipient === username;
          return { shouldShowBanner: show, shouldShowList: show, shouldPlaySound: false, shouldSetBadge: false };
        },
      });
      const open = (response: NotificationResponse) => {
        const data = response.notification.request.content.data;
        if (data.kind === "workout-nudge" && data.recipient === username && typeof data.sender === "string") {
          router.push({ pathname: "/chat/dm/[username]", params: { username: data.sender } });
          notifications.clearLastNotificationResponse();
        }
      };
      subscription = notifications.addNotificationResponseReceivedListener(open);
      const last = notifications.getLastNotificationResponse();
      if (last) open(last);
      const token = await getNudgeToken(username);
      if (token && !disposed) await workoutFriendsAPI.registerDevice(token);
    }

    void listen().catch(() => {});
    return () => {
      disposed = true;
      subscription?.remove();
    };
  }, [username]);

  return null;
}
