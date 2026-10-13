import { Alert, Platform } from "react-native";

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmText: string;
  cancelText?: string;
  destructive?: boolean;
}

/**
 * An "Are you sure?" prompt that also works on web, where Alert buttons do nothing: uses
 * window.confirm there and Alert.alert on iOS/Android. Resolves true only when confirmed.
 */
export function confirmAsync({
  title,
  message,
  confirmText,
  cancelText = "Cancel",
  destructive = false,
}: ConfirmOptions): Promise<boolean> {
  if (Platform.OS === "web") {
    return Promise.resolve(typeof window !== "undefined" && window.confirm(`${title}\n\n${message}`));
  }
  return new Promise((resolve) => {
    Alert.alert(
      title,
      message,
      [
        { text: cancelText, style: "cancel", onPress: () => resolve(false) },
        { text: confirmText, style: destructive ? "destructive" : "default", onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });
}
