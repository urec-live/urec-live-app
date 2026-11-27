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

/**
 * Sits over the bottom of the map. Closed, only its title (and `peek`, the selected item's
 * card) shows; swipe up on that part or tap the title to open it, swipe down or tap to close.
 * The list scrolls on its own and never moves the sheet.
 */
export default function ResultsSheet({
  open,
  onOpenChange,
  maxHeight,
  onPeekChange,
  title,
  count,
  subtitle,
  peek,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The open sheet's height. */
  maxHeight: number;
  /** Height of the part that shows while closed. */
  onPeekChange: (px: number) => void;
  title: string;
  count: number;
  subtitle: string;
  /** Shown under the title even while closed. */
  peek?: ReactNode;
  children: ReactNode;
}) {
  const [peekHeight, setPeekHeight] = useState(0);
  const progress = useSharedValue(open ? 1 : 0),
    height = useSharedValue(0),
    shown = useSharedValue(0),
    start = useSharedValue(0);
  useEffect(() => {
    progress.value = withTiming(open ? 1 : 0, SLIDE);
  }, [open, progress]);
  // Slide when these change (a panel above opened, a selection card appeared), but not from
  // the unmeasured zero at mount.
  useEffect(() => {
    const next = Math.max(0, maxHeight);
    height.value = height.value > 0 ? withTiming(next, SLIDE) : next;
  }, [maxHeight, height]);
  useEffect(() => {
    shown.value = shown.value > 0 ? withTiming(peekHeight, SLIDE) : peekHeight;
    onPeekChange(peekHeight);
  }, [peekHeight, shown, onPeekChange]);
  // Pulling up opens.
  const drag = Gesture.Pan()
    .withTestId("results-sheet-drag")
    .activeOffsetY([-10, 10])
    .failOffsetX([-20, 20])
    .onStart(() => {
      start.value = progress.value;
    })
    .onUpdate((e) => {
      progress.value = dragProgress(
        start.value,
        -e.translationY,
        height.value - shown.value,
      );
    })
    .onEnd((e) => {
      const next = settlesOpen(progress.value, -e.velocityY);
      progress.value = withTiming(next ? 1 : 0, SLIDE);
      runOnJS(onOpenChange)(next);
    });
  const sheetStyle = useAnimatedStyle(() => ({
    height: height.value,
    transform: [
      {
        translateY:
          (1 - progress.value) * Math.max(0, height.value - shown.value),
      },
    ],
  }));
  return (
    <Animated.View style={[s.sheet, sheetStyle]}>
      <GestureDetector gesture={drag}>
        <View
          collapsable={false}
          testID="results-sheet-peek"
          onLayout={(e) =>
            setPeekHeight(Math.ceil(e.nativeEvent.layout.height))
          }
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              open ? "Hide equipment list" : "Show equipment list"
            }
            accessibilityState={{ expanded: open }}
            onPress={() => onOpenChange(!open)}
            style={s.header}
          >
            <View style={s.grabber} />
            <View style={s.titleRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.title}>
                  {title} <Text style={s.muted}>({count})</Text>
                </Text>
                <Text style={s.muted}>{subtitle}</Text>
              </View>
              <MaterialCommunityIcons
                name={open ? "chevron-down" : "chevron-up"}
                size={24}
                color="#216C50"
              />
            </View>
          </Pressable>
          {peek ? <View style={s.peek}>{peek}</View> : null}
        </View>
      </GestureDetector>
      <View
        pointerEvents={open ? "auto" : "none"}
        accessibilityElementsHidden={!open}
        importantForAccessibility={open ? "auto" : "no-hide-descendants"}
        style={s.content}
      >
        {children}
      </View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 3,
    elevation: 12,
    backgroundColor: "white",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    shadowColor: "#13291B",
    shadowOpacity: 0.16,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -3 },
  },
  header: { paddingHorizontal: 18, paddingTop: 8, paddingBottom: 12 },
  grabber: {
    alignSelf: "center",
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#C9D6CD",
    marginBottom: 8,
  },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  title: { fontSize: 15, fontWeight: "700", color: "#254B34" },
  muted: { fontSize: 12, color: "#708175", marginTop: 3 },
  peek: { paddingHorizontal: 14, paddingBottom: 12 },
  content: {
    flex: 1,
    borderTopWidth: 1,
    borderColor: "#EDF1EE",
  },
});
