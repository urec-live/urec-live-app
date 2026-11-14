import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import MapView, {
  Marker,
  Overlay,
  Polygon,
  PROVIDER_GOOGLE,
  type Region,
} from "react-native-maps";
import type { FloorMapProps } from "@/components/FloorMap";
import { markerColor } from "@/components/EquipmentMarker";
import type {
  FloorPlanResponse,
  MachineDto,
  MapPoint,
} from "@/services/machineAPI";
import { areaBounds, areaColors } from "@/utils/equipmentMap";
import { UREC_BUILDING_BOUNDARY } from "@/constants/googleFloorMaps";
import {
  buildingCameraRegion,
  constrainMapRegion,
  sameMapRegion,
} from "@/utils/mapCameraBounds";
import {
  areaPoints,
  floorCoordinate,
  type FloorGeography,
} from "@/utils/floorGeography";

export interface GoogleFloorMapProps {
  floor: FloorPlanResponse;
  equipment: MachineDto[];
  geography: FloorGeography;
  focus: (MapPoint & { key: string }) | null;
  options: FloorMapProps;
  onSelectEquipment: (machine: MachineDto) => void;
  onFallback: () => void;
}

// Briefly refresh native marker snapshots after a status/selection change.
function TrackedMarker({
  refreshKey,
  children,
  ...props
}: React.ComponentProps<typeof Marker> & { refreshKey: string }) {
  const [tracking, setTracking] = useState(true);
  useEffect(() => {
    setTracking(true);
    const timer = setTimeout(() => setTracking(false), 500);
    return () => clearTimeout(timer);
  }, [refreshKey]);
  return (
    <Marker {...props} tracksViewChanges={tracking}>
      {children}
    </Marker>
  );
}

export default function GoogleFloorMap({
  floor,
  equipment,
  geography,
  focus,
  options: p,
  onSelectEquipment,
  onFallback,
}: GoogleFloorMapProps) {
  const map = useRef<MapView>(null);
  const [ready, setReady] = useState(false);
  const [viewport, setViewport] = useState({ width: 300, height: 300 });
  const width = floor.width,
    height = floor.height;
  const coordinate = useCallback(
    (point: MapPoint) => floorCoordinate(point, { width, height }, geography),
    [width, height, geography],
  );
  const sw = geography.southwest,
    ne = geography.northeast;
  const fitted = useMemo(
    () => buildingCameraRegion(geography, viewport.width, viewport.height),
    [geography, viewport.width, viewport.height],
  );
  const region = useRef(fitted);
  const animate = useCallback(
    (next: Region, duration = 200) => {
      const limited = constrainMapRegion(next, fitted);
      region.current = limited;
      map.current?.animateToRegion(limited, duration);
    },
    [fitted],
  );
  const fit = () => animate(fitted);
  const focusX = focus?.x,
    focusY = focus?.y,
    focusKey = focus?.key;
  useEffect(() => {
    if (!ready) return;
    // Native Google target restriction handles dragging; the completed-region
    // clamp below also bounds the visible span and programmatic camera moves.
    map.current?.setMapBoundaries(
      {
        latitude: fitted.latitude + fitted.latitudeDelta / 2,
        longitude: fitted.longitude + fitted.longitudeDelta / 2,
      },
      {
        latitude: fitted.latitude - fitted.latitudeDelta / 2,
        longitude: fitted.longitude - fitted.longitudeDelta / 2,
      },
    );
    if (focusX !== undefined && focusY !== undefined) {
      animate(
        {
          ...coordinate({ x: focusX, y: focusY }),
          latitudeDelta: (ne.latitude - sw.latitude) / 3,
          longitudeDelta: (ne.longitude - sw.longitude) / 3,
        },
        300,
      );
    } else {
      animate(fitted, 300);
    }
  }, [ready, focusKey, focusX, focusY, coordinate, ne, sw, fitted, animate]);
  useEffect(() => {
    if (ready) return;
    const timer = setTimeout(onFallback, 15000);
    return () => clearTimeout(timer);
  }, [ready, onFallback]);
  const zoom = (factor: number) => {
    const current = region.current;
    animate({
      ...current,
      latitudeDelta: current.latitudeDelta * factor,
      longitudeDelta: current.longitudeDelta * factor,
    });
  };
  return (
    <View
      style={s.container}
      onLayout={(event) => {
        const { width, height } = event.nativeEvent.layout;
        if (width > 0 && height > 0) setViewport({ width, height });
      }}
    >
      <MapView
        ref={map}
        testID="google-floor-map"
        style={StyleSheet.absoluteFill}
        provider={PROVIDER_GOOGLE}
        initialRegion={fitted}
        onMapReady={() => setReady(true)}
        onRegionChangeComplete={(next) => {
          const limited = constrainMapRegion(next, fitted);
          region.current = limited;
          if (!sameMapRegion(next, limited))
            map.current?.animateToRegion(limited, 0);
        }}
        maxZoomLevel={22}
        minZoomLevel={Math.min(
          22,
          Math.log2((360 * viewport.width) / (256 * fitted.longitudeDelta)) -
            0.25,
        )}
        showsIndoorLevelPicker={false}
        showsIndoors={false}
        showsBuildings={false}
        rotateEnabled={false}
        pitchEnabled={false}
        showsUserLocation={false}
        showsMyLocationButton={false}
        toolbarEnabled={false}
        moveOnMarkerPress={false}
        mapPadding={{ top: 54, left: 0, right: 0, bottom: 64 }}
      >
        {floor.imageUrl && (
          <Overlay
            image={{ uri: floor.imageUrl }}
            bounds={[
              [sw.latitude, sw.longitude],
              [ne.latitude, ne.longitude],
            ]}
          />
        )}
        {(floor.layout?.areas ?? []).map((area) => {
          const points = areaPoints(area);
          if (
            points.length < 3 ||
            points.some(
              (pt) => !Number.isFinite(pt.x) || !Number.isFinite(pt.y),
            )
          )
            return null;
          const bounds = areaBounds(area);
          const selected = area.id === p.selectedAreaId;
          const matching = p.matchingAreaIds?.has(area.id);
          const color = selected ? "#193D75" : matching ? "#216C50" : "#C5D0CA";
          return (
            <React.Fragment key={area.id}>
              <Polygon
                testID={`google-area-${area.id}`}
                coordinates={points.map(coordinate)}
                fillColor={areaColors[area.kind] ?? "#EDF1EF"}
                strokeColor={color}
                strokeWidth={selected ? 3 : 1}
                tappable
                onPress={() => p.onSelectArea?.(area, floor)}
                zIndex={1}
              />
              <TrackedMarker
                coordinate={coordinate({
                  x: bounds.x + bounds.width / 2,
                  y: bounds.y + bounds.height / 2,
                })}
                refreshKey={`${area.name}:${selected}:${matching}`}
                title={area.name}
                accessibilityLabel={area.name}
                onPress={() => p.onSelectArea?.(area, floor)}
                zIndex={2}
              >
                <View style={[s.area, { borderColor: color }]}>
                  <Text style={s.areaText}>{area.name}</Text>
                </View>
              </TrackedMarker>
            </React.Fragment>
          );
        })}
        {equipment.map((machine) => {
          const selected = machine.id === p.highlightedEquipmentId;
          const groups =
            p.muscleGroupsByEquipment?.[machine.id] ??
            machine.muscleGroups ??
            [];
          const dimmed = p.matchingEquipmentIds
            ? !p.matchingEquipmentIds.has(machine.id)
            : !!p.selectedMuscleGroup &&
              !groups.some(
                (group) =>
                  group.toLowerCase() === p.selectedMuscleGroup?.toLowerCase(),
              );
          const label = `${machine.floorLabel || machine.name} · ${machine.status}`;
          const matched = p.matchingEquipmentIds?.has(machine.id);
          return (
            <TrackedMarker
              key={machine.id}
              testID={`google-equipment-${machine.id}`}
              coordinate={coordinate({
                x: machine.floorX!,
                y: machine.floorY!,
              })}
              refreshKey={`${label}:${selected}:${dimmed}:${matched}`}
              title={machine.name}
              description={machine.status}
              accessibilityLabel={label}
              onPress={() => onSelectEquipment(machine)}
              opacity={dimmed ? 0.22 : 1}
              zIndex={selected ? 20 : 10}
              anchor={{ x: 0.5, y: 0.5 }}
            >
              <View style={s.markerTarget}>
                <View
                  style={[
                    s.pin,
                    {
                      backgroundColor: markerColor(machine.status),
                      borderColor: selected
                        ? "#193D75"
                        : matched
                          ? "#216C50"
                          : "white",
                      width: selected ? 24 : 16,
                      height: selected ? 24 : 16,
                    },
                  ]}
                />
              </View>
            </TrackedMarker>
          );
        })}
        <Polygon
          testID="urec-building-boundary"
          coordinates={UREC_BUILDING_BOUNDARY}
          fillColor="transparent"
          strokeColor="#216C50"
          strokeWidth={3}
          zIndex={100}
          tappable={false}
        />
      </MapView>
      <View style={s.notice}>
        <Text style={s.noticeText}>Demo floor placement · approximate</Text>
        <Text
          accessibilityRole="link"
          accessibilityLabel="Building boundary copyright OpenStreetMap contributors"
          style={s.noticeText}
          onPress={() =>
            void Linking.openURL("https://www.openstreetmap.org/copyright")
          }
        >
          Boundary © OpenStreetMap contributors
        </Text>
      </View>
      <Pressable
        accessibilityRole="button"
        onPress={onFallback}
        style={s.fallback}
      >
        <Text style={s.controlText}>Use floor map</Text>
      </Pressable>
      <View style={s.controls}>
        {[
          ["Zoom out", "−", () => zoom(1.25)],
          ["Fit floor", "Fit", fit],
          ["Zoom in", "+", () => zoom(0.8)],
        ].map(([label, text, action]) => (
          <Pressable
            key={String(label)}
            accessibilityRole="button"
            accessibilityLabel={String(label)}
            onPress={action as () => void}
            style={s.control}
          >
            <Text style={s.controlText}>{String(text)}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, minHeight: 120, overflow: "hidden", borderRadius: 14 },
  notice: {
    position: "absolute",
    top: 4,
    left: 8,
    right: 8,
    alignItems: "flex-start",
  },
  noticeText: {
    fontSize: 11,
    color: "#526B5C",
    backgroundColor: "white",
    padding: 4,
    borderRadius: 4,
  },
  fallback: {
    position: "absolute",
    bottom: 8,
    left: 8,
    minHeight: 44,
    padding: 8,
    justifyContent: "center",
    backgroundColor: "white",
    borderRadius: 8,
  },
  controls: {
    position: "absolute",
    right: 8,
    bottom: 8,
    flexDirection: "row",
    gap: 4,
    padding: 4,
    borderRadius: 10,
    backgroundColor: "white",
  },
  control: {
    minWidth: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F0F5F2",
    borderRadius: 6,
  },
  controlText: { color: "#216C50", fontWeight: "700", fontSize: 12 },
  markerTarget: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  pin: { borderWidth: 2, borderRadius: 5 },
  area: {
    maxWidth: 140,
    borderWidth: 1,
    backgroundColor: "#FFFFFFEE",
    padding: 3,
    borderRadius: 4,
  },
  areaText: { fontSize: 10, color: "#21362C", textAlign: "center" },
});
