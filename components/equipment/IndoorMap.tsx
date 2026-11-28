import Mapbox, {
  Camera,
  CircleLayer,
  CircleLayerStyle,
  FillExtrusionLayer,
  FillLayer,
  FillLayerStyle,
  LineLayer,
  MapView,
  ShapeSource,
  StyleImport,
  SymbolLayer,
} from "@rnmapbox/maps";
import React, { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { markerColor } from "@/components/EquipmentMarker";
import {
  INDOOR_GEOJSON,
  INDOOR_WALLS,
  LEVEL_1,
  polygon,
  toLngLat,
  VENUE_BOUNDS,
  WALL_H,
} from "@/constants/indoorVenue";
import type { MachineDto } from "@/services/machineAPI";
import { areaColors, ViewInsets } from "@/utils/equipmentMap";
import { footprint, placeEquipment } from "@/utils/indoorPlacement";

const token = process.env.EXPO_PUBLIC_MAPBOX_TOKEN;
/** Without a token the Equipment tab keeps the SVG floor map. */
export const indoorMapEnabled = !!token;
if (token) {
  void Mapbox.setAccessToken(token);
  Mapbox.setTelemetryEnabled(false);
}

const EDGE = 16;
const PITCH_3D = 50;
const ALL_ZOOMS = { minZoomLevel: 0, maxZoomLevel: 24 }; // rnmapbox types make these required on FillExtrusionLayer
const FOCUS_M = 12; // metres shown around a selected machine
const MARGIN = 0.003; // degrees of panning room around the building
const MAX_BOUNDS = {
  ne: [VENUE_BOUNDS.ne[0] + MARGIN, VENUE_BOUNDS.ne[1] + MARGIN],
  sw: [VENUE_BOUNDS.sw[0] - MARGIN, VENUE_BOUNDS.sw[1] - MARGIN],
};
const ROOM_COLOR = [
  "match",
  ["get", "class"],
  ...Object.entries(areaColors).flat(),
  "wall",
  "#A9B5AE",
  areaColors.room,
] as unknown as FillLayerStyle["fillColor"];
const DOT_RADIUS: CircleLayerStyle["circleRadius"] = [
  "interpolate",
  ["linear"],
  ["zoom"],
  17,
  2,
  19,
  4.5,
  21,
  10,
];

interface Props {
  machines: MachineDto[];
  floorId: string;
  insets: ViewInsets;
  matchingEquipmentIds?: Set<number>;
  highlightedEquipmentId?: number | null;
  onSelectEquipment: (machine: MachineDto) => void;
}

export default function IndoorMap(p: Props) {
  const [is3d, setIs3d] = useState(true);
  const [rotate, setRotate] = useState(false);
  const placed = useMemo(() => placeEquipment(p.machines), [p.machines]);
  const equipment = useMemo<GeoJSON.FeatureCollection>(
    () => ({
      type: "FeatureCollection",
      // Each machine is a point (2D dot, 3D floor ring) and a footprint polygon (3D box).
      features: placed.flatMap(({ machine, at }) => {
        const properties = {
          id: machine.id,
          floor_id: LEVEL_1.id,
          color: markerColor(machine.status),
          dim:
            !!p.matchingEquipmentIds && !p.matchingEquipmentIds.has(machine.id),
          selected: machine.id === p.highlightedEquipmentId,
        };
        return [
          {
            type: "Feature",
            geometry: { type: "Point", coordinates: toLngLat(at) },
            properties,
          },
          { type: "Feature", geometry: polygon(footprint(at)), properties },
        ] as const;
      }),
    }),
    [placed, p.matchingEquipmentIds, p.highlightedEquipmentId],
  );
  // Camera props are compared by identity, so keep them stable across live status updates.
  // Focus is a bounds fit too: on Android a bounds fit keeps the map's current padding and adds its
  // own, so a padded centre/zoom stop in between would double the insets on the next fit.
  const [sx, sy] = placed.find((e) => e.machine.id === p.highlightedEquipmentId)
    ?.at ?? [undefined, undefined];
  const focus = useMemo(
    () =>
      sx === undefined || sy === undefined
        ? undefined
        : {
            sw: toLngLat([sx - FOCUS_M, sy + FOCUS_M]),
            ne: toLngLat([sx + FOCUS_M, sy - FOCUS_M]),
          },
    [sx, sy],
  );
  const { top, bottom } = p.insets;
  const padding = useMemo(
    () => ({
      paddingTop: top + EDGE,
      paddingBottom: bottom + EDGE,
      paddingLeft: EDGE,
      paddingRight: EDGE,
    }),
    [top, bottom],
  );
  const onFloor = ["==", ["get", "floor_id"], p.floorId] as const;
  const rooms = ["all", ["==", ["get", "type"], "room"], onFloor] as const;
  const floor = ["==", ["get", "id"], p.floorId] as const;
  const points = ["all", onFloor, ["==", ["geometry-type"], "Point"]] as const;
  const boxes = ["all", onFloor, ["==", ["geometry-type"], "Polygon"]] as const;
  const toggles = [
    ["3D view", "3D", is3d, setIs3d],
    ["Rotate map", "Rotate", rotate, setRotate],
  ] as const;
  return (
    <>
      <MapView
        style={StyleSheet.absoluteFill}
        styleURL="mapbox://styles/mapbox/standard"
        pitchEnabled={is3d}
        rotateEnabled={rotate}
        scaleBarEnabled={false}
        logoPosition={{ bottom: bottom + 8, left: 8 }}
        attributionPosition={{ bottom: bottom + 8, right: 8 }}
      >
        <StyleImport
          id="basemap"
          existing
          config={{ show3dObjects: false, showPointOfInterestLabels: false }}
        />
        <Camera
          bounds={focus ?? VENUE_BOUNDS}
          padding={padding}
          pitch={is3d ? PITCH_3D : 0}
          // Unset keeps the member's rotation on every fit; turning rotation off turns the map back north.
          heading={rotate ? undefined : 0}
          animationDuration={500}
          minZoomLevel={16}
          maxZoomLevel={22}
          maxBounds={MAX_BOUNDS}
        />
        <ShapeSource id="indoor" shape={INDOOR_GEOJSON}>
          <FillLayer
            id="indoor-floor"
            filter={floor}
            style={{ fillColor: "#F7F8F7" }}
          />
          <FillLayer
            id="indoor-rooms"
            filter={rooms}
            style={{ fillColor: ROOM_COLOR }}
          />
          <LineLayer
            id="indoor-outlines"
            filter={["any", floor, rooms] as const}
            style={{ lineColor: "#B8C4BD", lineWidth: 1 }}
          />
          <SymbolLayer
            id="indoor-labels"
            filter={rooms}
            minZoomLevel={17}
            style={{
              textField: ["get", "name"] as const,
              textSize: 12,
              textColor: "#4F6158",
              textHaloColor: "#FFFFFF",
              textHaloWidth: 1,
              symbolZOffset: is3d ? WALL_H + 0.3 : 0,
            }}
          />
        </ShapeSource>
        {is3d && (
          <ShapeSource id="indoor-walls" shape={INDOOR_WALLS}>
            <FillExtrusionLayer
              {...ALL_ZOOMS}
              id="indoor-walls"
              filter={onFloor}
              style={{
                fillExtrusionColor: "#C9D2CC",
                fillExtrusionHeight: WALL_H,
                fillExtrusionBase: 0,
                fillExtrusionOpacity: 0.85,
                fillExtrusionAmbientOcclusionIntensity: 0.3,
              }}
            />
          </ShapeSource>
        )}
        <ShapeSource
          id="equipment"
          shape={equipment}
          onPress={(e) => {
            const id = e.features[0]?.properties?.id;
            const machine = p.machines.find((m) => m.id === id);
            if (machine) p.onSelectEquipment(machine);
          }}
        >
          {is3d ? (
            <>
              {/* fill-extrusion opacity can't vary per feature, so faded boxes need their own layer. */}
              {([false, true] as const).map((dim) => (
                <FillExtrusionLayer
                  {...ALL_ZOOMS}
                  key={String(dim)}
                  id={dim ? "equipment-boxes-dim" : "equipment-boxes"}
                  filter={["all", boxes, ["==", ["get", "dim"], dim]] as const}
                  style={{
                    fillExtrusionColor: ["get", "color"] as const,
                    fillExtrusionHeight: [
                      "case",
                      ["==", ["get", "selected"], true],
                      1.8,
                      1,
                    ] as const,
                    fillExtrusionHeightTransition: { duration: 300, delay: 0 },
                    fillExtrusionOpacity: dim ? 0.3 : 1,
                  }}
                />
              ))}
              <CircleLayer
                id="equipment-selected"
                filter={
                  ["all", points, ["==", ["get", "selected"], true]] as const
                }
                style={{
                  circlePitchAlignment: "map",
                  circleColor: "transparent",
                  circleRadius: DOT_RADIUS,
                  circleStrokeColor: "#16382A",
                  circleStrokeWidth: 3,
                }}
              />
            </>
          ) : (
            <CircleLayer
              id="equipment-dots"
              filter={points}
              style={{
                circleColor: ["get", "color"] as const,
                circleRadius: DOT_RADIUS,
                circleOpacity: [
                  "case",
                  ["==", ["get", "dim"], true],
                  0.25,
                  1,
                ] as const,
                circleStrokeColor: [
                  "case",
                  ["==", ["get", "selected"], true],
                  "#16382A",
                  "#FFFFFF",
                ] as const,
                circleStrokeWidth: [
                  "case",
                  ["==", ["get", "selected"], true],
                  3,
                  1,
                ] as const,
              }}
            />
          )}
        </ShapeSource>
      </MapView>
      <View style={[s.toggles, { top: top + 12 }]}>
        {toggles.map(([label, text, on, set]) => (
          <Pressable
            key={label}
            accessibilityRole="switch"
            accessibilityLabel={label}
            accessibilityState={{ checked: on }}
            onPress={() => set(!on)}
            style={[s.toggle, on && s.toggleOn]}
          >
            <Text style={[s.toggleText, on && s.toggleTextOn]}>{text}</Text>
          </Pressable>
        ))}
      </View>
    </>
  );
}

// Same look as the SVG map's zoom buttons (MapViewport).
const s = StyleSheet.create({
  toggles: {
    position: "absolute",
    right: 12,
    gap: 4,
    backgroundColor: "white",
    padding: 4,
    borderRadius: 10,
  },
  toggle: {
    minWidth: 44,
    height: 44,
    paddingHorizontal: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F0F5F2",
    borderRadius: 6,
  },
  toggleOn: { backgroundColor: "#216C50" },
  toggleText: { color: "#216C50", fontWeight: "700" },
  toggleTextOn: { color: "white" },
});
