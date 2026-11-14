import React, { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

export interface ResultsSheetProps {
  height: number;
  peekHeight: number;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  docked: boolean;
  header: React.ReactNode;
  children: React.ReactNode;
}

// This sheet shares the screen with an interactive map. Only the header owns
// the pan gesture, leaving list scrolling and map gestures independent.
export default function ResultsSheet({
  height,
  peekHeight,
  expanded,
  onExpandedChange,
  docked,
  header,
  children,
}: ResultsSheetProps) {
  const [headerHeight, setHeaderHeight] = useState(76);
  const travel = Math.max(0, height - peekHeight);
  const y = useSharedValue(docked || expanded ? 0 : travel);
  const start = useSharedValue(0);
  useEffect(() => {
    y.set(
      withSpring(docked || expanded ? 0 : travel, {
        duration: 280,
        dampingRatio: 1,
        overshootClamping: true,
        reduceMotion: ReduceMotion.System,
      }),
    );
  }, [docked, expanded, travel, y]);
  const pan = useMemo(
    () =>
      Gesture.Pan()
        .enabled(!docked)
        .activeOffsetY([-8, 8])
        .onStart(() => {
          start.set(y.get());
        })
        .onUpdate((e) => {
          y.set(Math.max(0, Math.min(travel, start.get() + e.translationY)));
        })
        .onEnd((e) => {
          const open = y.get() + e.velocityY * 0.15 < travel / 2;
          y.set(
            withSpring(open ? 0 : travel, {
              duration: 280,
              dampingRatio: 1,
              velocity: e.velocityY,
              overshootClamping: true,
              reduceMotion: ReduceMotion.System,
            }),
          );
          scheduleOnRN(onExpandedChange, open);
        })
        .onFinalize((_e, success) => {
          if (!success)
            y.set(
              withSpring(expanded ? 0 : travel, {
                duration: 280,
                dampingRatio: 1,
                reduceMotion: ReduceMotion.System,
              }),
            );
        }),
    [docked, expanded, travel, start, y, onExpandedChange],
  );
  const animation = useAnimatedStyle(() => ({
    transform: [{ translateY: y.get() }],
  }));
  return (
    <Animated.View
      style={[styles.sheet, { height }, docked && styles.docked, animation]}
    >
      <GestureDetector gesture={pan} touchAction="none">
        <View onLayout={(e) => setHeaderHeight(e.nativeEvent.layout.height)}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              expanded ? "Collapse results" : "Expand results"
            }
            accessibilityHint="You can also drag this handle up or down."
            accessibilityState={{
              expanded: docked || expanded,
              disabled: docked,
            }}
            disabled={docked}
            onPress={() => onExpandedChange(!expanded)}
            style={styles.header}
          >
            {!docked && <View style={styles.handle} />}
            {header}
          </Pressable>
        </View>
      </GestureDetector>
      <View
        style={[
          styles.content,
          !expanded &&
            !docked && {
              flexGrow: 0,
              flexShrink: 0,
              flexBasis: "auto",
              height: Math.max(0, peekHeight - headerHeight),
            },
        ]}
      >
        {children}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "white",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: "#D8E2DC",
    overflow: "hidden",
    boxShadow: "0 -3px 20px #203C2B14",
  },
  docked: {
    left: 14,
    right: undefined,
    bottom: 14,
    width: 360,
    borderRadius: 18,
  },
  header: {
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 12,
    minHeight: 64,
  },
  handle: {
    alignSelf: "center",
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#BCCBC2",
    marginBottom: 12,
  },
  content: { flex: 1, minHeight: 0, overflow: "hidden" },
});
