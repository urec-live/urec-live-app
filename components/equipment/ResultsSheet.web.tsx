import React, { useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import type { ResultsSheetProps } from "./ResultsSheet";

// Pointer capture keeps a mouse/touch drag attached to the handle when it
// crosses the map. Native uses Gesture Handler and Reanimated instead.
export default function ResultsSheet({
  height,
  peekHeight,
  expanded,
  onExpandedChange,
  docked,
  header,
  children,
}: ResultsSheetProps) {
  const sheet = useRef<HTMLDivElement>(null);
  const handle = useRef<HTMLButtonElement>(null);
  const drag = useRef<{
    id: number;
    startY: number;
    offset: number;
    lastY: number;
    time: number;
    velocity: number;
  } | null>(null);
  const moved = useRef(false);
  const [headerHeight, setHeaderHeight] = useState(76);
  const [reducedMotion, setReducedMotion] = useState(false);
  const travel = Math.max(0, height - peekHeight);
  const offset = docked || expanded ? 0 : travel;
  const snap = (value: number) => {
    if (!sheet.current) return;
    sheet.current.style.transition = reducedMotion
      ? "none"
      : "transform 220ms ease-out";
    sheet.current.style.transform = `translateY(${value}px)`;
  };
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    const element = handle.current;
    if (!element) return;
    const observer = new ResizeObserver(() =>
      setHeaderHeight(element.getBoundingClientRect().height),
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    drag.current = null;
    // A resize or a new selection also cancels an in-progress drag.
    if (sheet.current)
      sheet.current.style.transform = `translateY(${offset}px)`;
  }, [offset, height, docked, expanded]);
  return (
    <div
      ref={sheet}
      style={{
        position: "absolute",
        left: docked ? 14 : 0,
        right: docked ? undefined : 0,
        bottom: docked ? 14 : 0,
        width: docked ? 360 : undefined,
        height,
        display: "flex",
        flexDirection: "column",
        boxSizing: "border-box",
        background: "white",
        border: "1px solid #D8E2DC",
        borderRadius: docked ? 18 : "24px 24px 0 0",
        overflow: "hidden",
        boxShadow: "0 -3px 20px #203C2B14",
        transform: `translateY(${offset}px)`,
        transition: reducedMotion ? "none" : "transform 220ms ease-out",
      }}
    >
      <button
        ref={handle}
        type="button"
        disabled={docked}
        aria-label={expanded ? "Collapse results" : "Expand results"}
        aria-expanded={docked || expanded}
        onClick={() => {
          if (!moved.current) onExpandedChange(!expanded);
        }}
        onPointerDown={(e) => {
          if (docked || e.button !== 0) return;
          moved.current = false;
          const currentY = sheet.current
            ? new DOMMatrixReadOnly(getComputedStyle(sheet.current).transform)
                .m42
            : offset;
          drag.current = {
            id: e.pointerId,
            startY: e.clientY,
            offset: currentY,
            lastY: e.clientY,
            time: e.timeStamp,
            velocity: 0,
          };
          e.currentTarget.setPointerCapture(e.pointerId);
          if (sheet.current) sheet.current.style.transition = "none";
        }}
        onPointerMove={(e) => {
          const d = drag.current;
          if (!d || d.id !== e.pointerId) return;
          const delta = e.clientY - d.startY;
          if (Math.abs(delta) > 6) moved.current = true;
          const elapsed = e.timeStamp - d.time;
          if (elapsed > 0)
            d.velocity = ((e.clientY - d.lastY) / elapsed) * 1000;
          d.lastY = e.clientY;
          d.time = e.timeStamp;
          if (sheet.current)
            sheet.current.style.transform = `translateY(${Math.max(0, Math.min(travel, d.offset + delta))}px)`;
        }}
        onPointerUp={(e) => {
          const d = drag.current;
          if (!d || d.id !== e.pointerId) return;
          drag.current = null;
          if (!moved.current) {
            snap(offset);
            return;
          }
          const position = Math.max(
            0,
            Math.min(travel, d.offset + e.clientY - d.startY),
          );
          const velocity = e.timeStamp - d.time > 100 ? 0 : d.velocity;
          const open = position + velocity * 0.15 < travel / 2;
          snap(open ? 0 : travel);
          onExpandedChange(open);
        }}
        onPointerCancel={() => {
          drag.current = null;
          moved.current = false;
          snap(offset);
        }}
        style={{
          flexShrink: 0,
          border: 0,
          background: "white",
          color: "inherit",
          textAlign: "left",
          padding: "10px 18px 12px",
          minHeight: 64,
          touchAction: "none",
          cursor: docked ? "default" : "ns-resize",
          font: "inherit",
        }}
      >
        {!docked && <View style={styles.handle} />}
        {header}
      </button>
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
    </div>
  );
}

const styles = StyleSheet.create({
  handle: {
    alignSelf: "center",
    marginHorizontal: "auto",
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#BCCBC2",
    marginBottom: 12,
  },
  content: { flex: 1, minHeight: 0, overflow: "hidden" },
});
