import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  cancelAnimation,
  SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import type { ViewportProps, PinProps } from "./MapViewport.types";
import {
  Camera,
  clampCameraWithin,
  fitCameraWithin,
  focusCamera,
  zoomCamera,
} from "@/utils/equipmentMap";
import {
  CameraLayout,
  FOLLOW_FIT,
  FOLLOW_NONE,
  followCamera,
} from "@/utils/mapPanels";
const Zoom = createContext<{ scale: SharedValue<number>; fit: number } | null>(
  null,
);
export function MapPin(p: PinProps) {
  const zoom = useContext(Zoom)!;
  const style = useAnimatedStyle(() => ({
    transform: [{ scale: 1 / zoom.scale.value }],
  }));
  const labelStyle = useAnimatedStyle(() => ({
    opacity:
      p.selected || (!p.dimmed && zoom.scale.value >= 0.9) ? 1 : 0,
  }));
  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          left: p.x - 22,
          top: p.y - 22,
          width: 44,
          height: 44,
          zIndex: p.selected ? 20 : 10,
          opacity: p.dimmed ? 0.22 : 1,
        },
        style,
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={p.label}
        onPress={p.onPress}
        style={{
          width: 44,
          height: 44,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <View
          style={{
            width: p.selected ? 24 : zoom.fit < 0.3 ? 9 : 16,
            height: p.selected ? 24 : zoom.fit < 0.3 ? 9 : 16,
            backgroundColor: p.color,
            borderWidth: p.selected ? 3 : 2,
            borderColor: p.selected ? "#193D75" : p.matched ? "#216C50" : "white",
            borderRadius: 5,
          }}
        />
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: "absolute",
              top: 36,
              backgroundColor: p.selected ? "#193D75" : "white",
              padding: 3,
              borderRadius: 4,
              width: 130,
            },
            labelStyle,
          ]}
        >
          <Text
            numberOfLines={1}
            style={{
              fontSize: 11,
              textAlign: "center",
              color: p.selected ? "white" : "#21362C",
            }}
          >
            {p.label}
          </Text>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}
const SLIDE = { duration: 240 };
export default function MapViewport({
  width,
  height,
  focus,
  insets,
  fullScreen,
  children,
}: ViewportProps) {
  const [size, setSize] = useState({ w: 1, h: 1 });
  const top = insets?.top ?? 0,
    bottom = insets?.bottom ?? 0;
  const view = { top, bottom };
  const scale = useSharedValue(1),
    x = useSharedValue(0),
    y = useSharedValue(0);
  const startScale = useSharedValue(1),
    startX = useSharedValue(0),
    startY = useSharedValue(0),
    focalX = useSharedValue(0),
    focalY = useSharedValue(0),
    follow = useSharedValue(FOLLOW_FIT);
  const fitted = fitCameraWithin(width, height, size.w, size.h, view);
  const apply = (c: Camera, animate = false) => {
    scale.value = animate ? withTiming(c.scale, SLIDE) : c.scale;
    x.value = animate ? withTiming(c.x, SLIDE) : c.x;
    y.value = animate ? withTiming(c.y, SLIDE) : c.y;
  };
  const reset = () => {
    apply(fitted);
    follow.value = FOLLOW_FIT;
  };
  const focusKey = focus?.key;
  const last = useRef<CameraLayout>(null);
  // Re-place the camera when the viewport, the focus or the panels over the map change.
  useEffect(() => {
    if (size.w <= 1) return;
    const next = { focusKey, top, bottom };
    const plan = followCamera(last.current, next, follow.value);
    last.current = next;
    follow.value = plan.follow;
    if (plan.move === "focus" && focus)
      apply(
        focusCamera(
          focus,
          fitted.scale * 2.5,
          width,
          height,
          size.w,
          size.h,
          view,
        ),
        plan.slide,
      );
    else if (plan.move === "fit") apply(fitted, plan.slide);
    else if (plan.move === "clamp")
      apply(
        clampCameraWithin(
          { scale: scale.value, x: x.value, y: y.value },
          width,
          height,
          size.w,
          size.h,
          view,
        ),
        plan.slide,
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusKey, width, height, size.w, size.h, top, bottom]);
  const takeOver = () => {
    "worklet";
    follow.value = FOLLOW_NONE;
    cancelAnimation(scale);
    cancelAnimation(x);
    cancelAnimation(y);
  };
  const pan = Gesture.Pan()
    .maxPointers(1)
    .onStart(() => {
      takeOver();
      startX.value = x.value;
      startY.value = y.value;
    })
    .onUpdate((e) => {
      const c = clampCameraWithin(
        {
          scale: scale.value,
          x: startX.value + e.translationX,
          y: startY.value + e.translationY,
        },
        width,
        height,
        size.w,
        size.h,
        view,
      );
      x.value = c.x;
      y.value = c.y;
    });
  const pinch = Gesture.Pinch()
    .onStart((e) => {
      takeOver();
      startScale.value = scale.value;
      startX.value = x.value;
      startY.value = y.value;
      focalX.value = e.focalX;
      focalY.value = e.focalY;
    })
    .onUpdate((e) => {
      const c = zoomCamera(
        { scale: startScale.value, x: startX.value, y: startY.value },
        Math.max(
          fitted.scale,
          Math.min(fitted.scale * 6, startScale.value * e.scale),
        ),
        { x: focalX.value, y: focalY.value },
      );
      const next = clampCameraWithin(
        {
          ...c,
          x: c.x + e.focalX - focalX.value,
          y: c.y + e.focalY - focalY.value,
        },
        width,
        height,
        size.w,
        size.h,
        view,
      );
      scale.value = next.scale;
      x.value = next.x;
      y.value = next.y;
    });
  const zoom = (factor: number) => {
    takeOver();
    apply(
      clampCameraWithin(
        zoomCamera(
          { scale: scale.value, x: x.value, y: y.value },
          Math.max(
            fitted.scale,
            Math.min(fitted.scale * 6, scale.value * factor),
          ),
          { x: size.w / 2, y: top + Math.max(1, size.h - top - bottom) / 2 },
        ),
        width,
        height,
        size.w,
        size.h,
        view,
      ),
    );
  };
  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: x.value },
      { translateY: y.value },
      { scale: scale.value },
    ],
  }));
  return (
    <View
      onLayout={(e) =>
        setSize({
          w: e.nativeEvent.layout.width,
          h: e.nativeEvent.layout.height,
        })
      }
      style={{
        flex: 1,
        minHeight: 120,
        overflow: "hidden",
        backgroundColor: "#F4F6F5",
        borderRadius: fullScreen ? 0 : 14,
      }}
    >
      <GestureDetector gesture={Gesture.Simultaneous(pan, pinch)}>
        <Animated.View style={StyleSheet.absoluteFill}>
          <Zoom.Provider value={{ scale, fit: fitted.scale }}>
            <Animated.View
              style={[{ width, height, transformOrigin: [0, 0, 0] }, style]}
            >
              {children}
            </Animated.View>
          </Zoom.Provider>
        </Animated.View>
      </GestureDetector>
      <View
        style={{
          position: "absolute",
          right: 12,
          bottom: 12 + bottom,
          flexDirection: "row",
          gap: 4,
          backgroundColor: "white",
          padding: 4,
          borderRadius: 10,
        }}
      >
        {[
          ["Zoom out", "−", () => zoom(0.8)],
          ["Fit floor", "Fit", reset],
          ["Zoom in", "+", () => zoom(1.25)],
        ].map(([label, text, action]) => (
          <Pressable
            key={String(label)}
            accessibilityRole="button"
            accessibilityLabel={String(label)}
            onPress={action as () => void}
            style={{
              minWidth: 44,
              height: 44,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "#F0F5F2",
              borderRadius: 6,
            }}
          >
            <Text style={{ color: "#216C50", fontWeight: "700" }}>
              {String(text)}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
