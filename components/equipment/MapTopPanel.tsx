import React, { ReactNode, useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { dragProgress, settlesOpen } from "@/utils/mapPanels";

const SLIDE = { duration: 240 };
/** Space above the hidden-state pill, and extra travel so the panel's shadow leaves the screen too. */
const GAP = 8;

/**
 * Sits over the top of the map. Swipe it up (or tap its handle) to hide it; a small pill then
 * stays at the top, and tapping it or pulling it down brings the panel back.
 */
export default function MapTopPanel({
  open,
  onOpenChange,
  collapsedLabel,
  onCoverChange,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Shown on the pill while the panel is hidden, e.g. the current floor. */
  collapsedLabel: string;
  /** How far down the screen the panel, or while hidden its pill, reaches. */
  onCoverChange: (px: number) => void;
  children: ReactNode;
}) {
  const [height, setHeight] = useState(0),
    [pillHeight, setPillHeight] = useState(0);
  const progress = useSharedValue(open ? 1 : 0),
    travel = useSharedValue(0),
    start = useSharedValue(0);
  useEffect(() => {
    progress.value = withTiming(open ? 1 : 0, SLIDE);
  }, [open, progress]);
  useEffect(() => {
    travel.value = height;
  }, [height, travel]);
  useEffect(() => {
    onCoverChange(open ? height : pillHeight + GAP);
  }, [open, height, pillHeight, onCoverChange]);
  // Pulling down opens. Each detector needs its own gesture object.
  const drag = (testId: string) =>
    Gesture.Pan()
      .withTestId(testId)
      .activeOffsetY([-10, 10])
      .failOffsetX([-20, 20])
      .onStart(() => {
        start.value = progress.value;
      })
      .onUpdate((e) => {
        progress.value = dragProgress(
          start.value,
          e.translationY,
          travel.value,
        );
      })
      .onEnd((e) => {
        const next = settlesOpen(progress.value, e.velocityY);
        progress.value = withTiming(next ? 1 : 0, SLIDE);
        runOnJS(onOpenChange)(next);
      });
  const panelStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: (progress.value - 1) * (travel.value + GAP) }],
  }));
  const pillStyle = useAnimatedStyle(() => ({ opacity: 1 - progress.value }));
  return (
    <>
      <Animated.View
        pointerEvents={open ? "none" : "box-none"}
        accessibilityElementsHidden={open}
        importantForAccessibility={open ? "no-hide-descendants" : "auto"}
        style={[s.pillRow, pillStyle]}
      >
        <GestureDetector gesture={drag("map-top-pill-drag")}>
          <View collapsable={false}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Show search and floors"
              onPress={() => onOpenChange(true)}
              testID="map-top-pill"
              onLayout={(e) => setPillHeight(e.nativeEvent.layout.height)}
              style={s.pill}
            >
              <MaterialCommunityIcons
                name="magnify"
                size={18}
                color="#216C50"
              />
              <Text numberOfLines={1} style={s.pillText}>
                {collapsedLabel}
              </Text>
              <MaterialCommunityIcons
                name="chevron-down"
                size={18}
                color="#216C50"
              />
            </Pressable>
          </View>
        </GestureDetector>
      </Animated.View>
      <GestureDetector gesture={drag("map-top-panel-drag")}>
        <Animated.View
          testID="map-top-panel"
          onLayout={(e) => setHeight(e.nativeEvent.layout.height)}
          pointerEvents={open ? "auto" : "none"}
          accessibilityElementsHidden={!open}
          importantForAccessibility={open ? "auto" : "no-hide-descendants"}
          style={[s.panel, panelStyle]}
        >
          {children}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Hide search and floors"
            onPress={() => onOpenChange(false)}
            hitSlop={{ top: 6, bottom: 10, left: 40, right: 40 }}
            style={s.handle}
          >
            <View style={s.grabber} />
          </Pressable>
        </Animated.View>
      </GestureDetector>
    </>
  );
}

const s = StyleSheet.create({
  panel: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 2,
    elevation: 6,
    backgroundColor: "#FAFCFA",
    paddingHorizontal: 18,
    paddingTop: 14,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
    shadowColor: "#13291B",
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  handle: { alignItems: "center", paddingTop: 4, paddingBottom: 9 },
  grabber: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#C9D6CD",
  },
  pillRow: {
    position: "absolute",
    top: GAP,
    left: 0,
    right: 0,
    zIndex: 1,
    alignItems: "center",
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minHeight: 44,
    maxWidth: 280,
    paddingHorizontal: 16,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#D4E2D8",
    backgroundColor: "white",
    elevation: 4,
    shadowColor: "#13291B",
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  pillText: {
    flexShrink: 1,
    fontSize: 13,
    fontWeight: "600",
    color: "#216C50",
  },
});
