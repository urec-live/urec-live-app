import { useEffect, useState } from "react";
import { Keyboard, Platform } from "react-native";

/**
 * The on-screen keyboard's height, or 0 while it's hidden. On Android, React Native reports it
 * without the navigation bar, and with edge-to-edge the window doesn't shrink for the keyboard,
 * so screens that need to stay above it pad by this.
 */
export function useKeyboardHeight(): number {
  const [height, setHeight] = useState(0);
  useEffect(() => {
    const shown = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      (e) => setHeight(e.endCoordinates.height),
    );
    const hidden = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => setHeight(0),
    );
    return () => {
      shown.remove();
      hidden.remove();
    };
  }, []);
  return height;
}
