import { act, renderHook } from "@testing-library/react-native";
import { DeviceEventEmitter, Platform } from "react-native";

import { useKeyboardHeight } from "@/hooks/useKeyboardHeight";

const keyboard = (event: string, height = 0) =>
  act(() => {
    DeviceEventEmitter.emit(event, {
      endCoordinates: { height, screenX: 0, screenY: 800 - height, width: 400 },
      duration: 0,
      easing: "keyboard",
    });
  });

describe("useKeyboardHeight", () => {
  const realOS = Platform.OS;
  afterEach(() => {
    (Platform as { OS: string }).OS = realOS;
  });

  it("follows the keyboard as iOS announces it", () => {
    const { result } = renderHook(() => useKeyboardHeight());
    expect(result.current).toBe(0);
    keyboard("keyboardWillShow", 336);
    expect(result.current).toBe(336);
    keyboard("keyboardWillHide");
    expect(result.current).toBe(0);
  });

  it("uses the shown and hidden events on Android", () => {
    (Platform as { OS: string }).OS = "android";
    const { result } = renderHook(() => useKeyboardHeight());
    keyboard("keyboardWillShow", 300);
    expect(result.current).toBe(0);
    keyboard("keyboardDidShow", 311);
    expect(result.current).toBe(311);
    keyboard("keyboardDidHide");
    expect(result.current).toBe(0);
  });

  it("stops listening when unmounted", () => {
    const before = DeviceEventEmitter.listenerCount("keyboardWillShow");
    const { unmount } = renderHook(() => useKeyboardHeight());
    expect(DeviceEventEmitter.listenerCount("keyboardWillShow")).toBe(before + 1);
    unmount();
    expect(DeviceEventEmitter.listenerCount("keyboardWillShow")).toBe(before);
  });
});
