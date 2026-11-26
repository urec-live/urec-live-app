import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import type { ViewportProps, PinProps } from "./MapViewport.types";
import {
  Camera,
  clampCamera,
  fitCamera,
  zoomCamera,
} from "@/utils/equipmentMap";
const Zoom = createContext({ scale: 1, fit: 1 });
export function MapPin(p: PinProps) {
  const { scale, fit } = useContext(Zoom),
    labels = p.selected || (!p.dimmed && scale >= 0.9);
  return (
    <button
      aria-label={p.label}
      onClick={p.onPress}
      onPointerDown={(e) => e.stopPropagation()}
      style={{
        position: "absolute",
        left: p.x,
        top: p.y,
        width: 44,
        height: 44,
        marginLeft: -22,
        marginTop: -22,
        transform: `scale(${1 / scale})`,
        transformOrigin: "center",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        border: 0,
        background: "transparent",
        cursor: "pointer",
        opacity: p.dimmed ? 0.22 : 1,
        zIndex: p.selected ? 20 : 10,
      }}
    >
      <span
        style={{
          width: p.selected ? 20 : fit < 0.3 ? 8 : 14,
          height: p.selected ? 20 : fit < 0.3 ? 8 : 14,
          background: p.color,
          border: "2px solid white",
          borderRadius: 5,
          boxShadow: p.selected ? "0 0 0 3px #193D75" : p.matched ? "0 0 0 2px #216C50" : "0 1px 3px #0004",
        }}
      />
      {labels && (
        <span
          style={{
            position: "absolute",
            top: 37,
            background: p.selected ? "#193D75" : "white",
            color: p.selected ? "white" : "#21362C",
            padding: "3px 6px",
            borderRadius: 4,
            fontSize: 11,
            whiteSpace: "nowrap",
            maxWidth: 180,
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {p.label}
        </span>
      )}
    </button>
  );
}
export default function MapViewport({
  width,
  height,
  focus,
  children,
}: ViewportProps) {
  const ref = useRef<HTMLDivElement>(null),
    drag = useRef<{ x: number; y: number; c: Camera; id: number } | null>(null);
  const [size, setSize] = useState({ w: 1, h: 1 }),
    [camera, setCamera] = useState<Camera>({ x: 0, y: 0, scale: 1 });
  const fitted = fitCamera(width, height, size.w, size.h);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const r = entries[0].contentRect;
      setSize({ w: r.width, h: r.height });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  useEffect(
    () => setCamera(fitCamera(width, height, size.w, size.h)),
    [width, height, size.w, size.h],
  );
  const focusKey = focus?.key;
  useEffect(() => {
    if (!focus || size.w <= 1) return;
    const scale = fitted.scale * 2.5;
    setCamera(
      clampCamera(
        {
          scale,
          x: size.w / 2 - focus.x * scale,
          y: size.h / 2 - focus.y * scale,
        },
        width,
        height,
        size.w,
        size.h,
      ),
    );
    // Focus once per selection, never when an equipment status changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusKey, size.w, size.h]);
  const zoom = (factor: number, x = size.w / 2, y = size.h / 2) =>
    setCamera((c) =>
      clampCamera(
        zoomCamera(
          c,
          Math.max(fitted.scale, Math.min(fitted.scale * 6, c.scale * factor)),
          { x, y },
        ),
        width,
        height,
        size.w,
        size.h,
      ),
    );
  // A non-passive listener keeps wheel events inside the map only.
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      zoomRef.current(
        Math.exp(-e.deltaY * 0.003),
        e.clientX - r.left,
        e.clientY - r.top,
      );
    };
    el.addEventListener("wheel", wheel, { passive: false });
    return () => el.removeEventListener("wheel", wheel);
  }, []);
  return (
    <div
      ref={ref}
      role="region"
      aria-label="Interactive gym floor map"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "+" || e.key === "=") zoom(1.25);
        if (e.key === "-") zoom(0.8);
        if (e.key === "0") setCamera(fitted);
      }}
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        drag.current = {
          x: e.clientX,
          y: e.clientY,
          c: camera,
          id: e.pointerId,
        };
      }}
      onPointerMove={(e) => {
        const d = drag.current;
        if (!d || d.id !== e.pointerId) return;
        if (Math.abs(e.clientX - d.x) + Math.abs(e.clientY - d.y) > 4)
          e.currentTarget.setPointerCapture(e.pointerId);
        setCamera(
          clampCamera(
            { ...d.c, x: d.c.x + e.clientX - d.x, y: d.c.y + e.clientY - d.y },
            width,
            height,
            size.w,
            size.h,
          ),
        );
      }}
      onPointerUp={() => {
        drag.current = null;
      }}
      onPointerCancel={() => {
        drag.current = null;
      }}
      style={{
        flex: 1,
        minHeight: 120,
        position: "relative",
        overflow: "hidden",
        background: "#F4F6F5",
        touchAction: "none",
        cursor: "grab",
        borderRadius: 14,
      }}
    >
      <Zoom.Provider value={{ scale: camera.scale, fit: fitted.scale }}>
        <div
          style={{
            position: "absolute",
            width,
            height,
            transformOrigin: "0 0",
            transform: `translate(${camera.x}px,${camera.y}px) scale(${camera.scale})`,
          }}
        >
          {children}
        </div>
      </Zoom.Provider>
      <div
        onPointerDown={(e) => e.stopPropagation()}
        style={{
          position: "absolute",
          right: 12,
          bottom: 12,
          display: "flex",
          gap: 4,
          background: "white",
          padding: 4,
          borderRadius: 10,
          boxShadow: "0 2px 8px #0002",
        }}
      >
        {[
          ["Zoom out", "−", () => zoom(0.8)],
          ["Fit floor", "Fit", () => setCamera(fitted)],
          ["Zoom in", "+", () => zoom(1.25)],
        ].map(([label, text, action]) => (
          <button
            key={String(label)}
            aria-label={String(label)}
            onClick={action as () => void}
            style={{
              minWidth: 44,
              height: 40,
              border: 0,
              borderRadius: 6,
              background: "#F0F5F2",
              color: "#216C50",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {String(text)}
          </button>
        ))}
      </div>
    </div>
  );
}
