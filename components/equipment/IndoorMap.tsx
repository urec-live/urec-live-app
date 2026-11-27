import Mapbox, {
  Camera,
  CircleLayer,
  FillLayer,
  FillLayerStyle,
  LineLayer,
  MapView,
  ShapeSource,
  StyleImport,
  SymbolLayer,
} from "@rnmapbox/maps";
import React, { useMemo } from "react";
import { StyleSheet } from "react-native";
import { markerColor } from "@/components/EquipmentMarker";
import {
  INDOOR_GEOJSON,
  LEVEL_1,
  toLngLat,
  VENUE_BOUNDS,
} from "@/constants/indoorVenue";
import type { MachineDto } from "@/services/machineAPI";
import { areaColors, ViewInsets } from "@/utils/equipmentMap";
import { placeEquipment } from "@/utils/indoorPlacement";

const token = process.env.EXPO_PUBLIC_MAPBOX_TOKEN;
/** Without a token the Equipment tab keeps the SVG floor map. */
export const indoorMapEnabled = !!token;
if (token) {
  void Mapbox.setAccessToken(token);
  Mapbox.setTelemetryEnabled(false);
}

const EDGE = 16;
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

interface Props {
  machines: MachineDto[];
  floorId: string;
  insets: ViewInsets;
  matchingEquipmentIds?: Set<number>;
  highlightedEquipmentId?: number | null;
  onSelectEquipment: (machine: MachineDto) => void;
}

export default function IndoorMap(p: Props) {
  const placed = useMemo(() => placeEquipment(p.machines), [p.machines]);
  const equipment = useMemo<GeoJSON.FeatureCollection>(
    () => ({
      type: "FeatureCollection",
      features: placed.map(({ machine, at }) => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: toLngLat(at) },
        properties: {
          id: machine.id,
          floor_id: LEVEL_1.id,
          color: markerColor(machine.status),
          dim: !!p.matchingEquipmentIds && !p.matchingEquipmentIds.has(machine.id),
          selected: machine.id === p.highlightedEquipmentId,
        },
      })),
    }),
    [placed, p.matchingEquipmentIds, p.highlightedEquipmentId],
  );
  // Camera props are compared by identity, so keep them stable across live status updates.
  // Focus is a bounds fit too: on Android a bounds fit keeps the map's current padding and adds its
  // own, so a padded centre/zoom stop in between would double the insets on the next fit.
  const [sx, sy] = placed.find(
    (e) => e.machine.id === p.highlightedEquipmentId,
  )?.at ?? [undefined, undefined];
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
  return (
    <MapView
      style={StyleSheet.absoluteFill}
      styleURL="mapbox://styles/mapbox/standard"
      pitchEnabled={false}
      rotateEnabled={false}
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
          }}
        />
      </ShapeSource>
      <ShapeSource
        id="equipment"
        shape={equipment}
        onPress={(e) => {
          const id = e.features[0]?.properties?.id;
          const machine = p.machines.find((m) => m.id === id);
          if (machine) p.onSelectEquipment(machine);
        }}
      >
        <CircleLayer
          id="equipment-dots"
          filter={onFloor}
          style={{
            circleColor: ["get", "color"] as const,
            circleRadius: [
              "interpolate",
              ["linear"],
              ["zoom"],
              17,
              2,
              19,
              4.5,
              21,
              10,
            ] as const,
            circleOpacity: ["case", ["==", ["get", "dim"], true], 0.25, 1] as const,
            circleStrokeColor: ["case", ["==", ["get", "selected"], true], "#16382A", "#FFFFFF"] as const,
            circleStrokeWidth: ["case", ["==", ["get", "selected"], true], 3, 1] as const,
          }}
        />
      </ShapeSource>
    </MapView>
  );
}
