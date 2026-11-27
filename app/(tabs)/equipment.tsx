import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useFocusEffect, useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useGym } from "@/contexts/GymContext";
import {
  useCachedResource,
  useCachedResources,
} from "@/hooks/useCachedResource";
import {
  cacheKeys,
  fetchFloorPlans,
  STALE_MS,
} from "@/services/cachedResources";
import { peekCached, subscribeCached } from "@/services/resourceCache";
import { machineAPI, MachineDto, Exercise } from "@/services/machineAPI";
import websocketService from "@/services/websocketService";
import FloorMap from "@/components/FloorMap";
import EquipmentFilters from "@/components/equipment/EquipmentFilters";
import MapTopPanel from "@/components/equipment/MapTopPanel";
import ResultsSheet from "@/components/equipment/ResultsSheet";
import { markerColor } from "@/components/EquipmentMarker";
import { isPositioned, MapResult, searchEquipment } from "@/utils/equipmentMap";

export default function Equipment() {
  const { gym, loading } = useGym(),
    router = useRouter();
  if (loading)
    return (
      <View style={s.center}>
        <ActivityIndicator color="#216C50" />
      </View>
    );
  if (!gym)
    return (
      <View style={s.center}>
        <Text style={s.heading}>Connect to your gym</Text>
        <Text style={s.muted}>
          Choose a gym to explore its equipment and floor map.
        </Text>
        <Pressable style={s.primary} onPress={() => router.push("/profile")}>
          <Text style={s.primaryText}>Choose gym</Text>
        </Pressable>
      </View>
    );
  return <ConnectedEquipment key={gym.id} gymName={gym.name} />;
}
function ConnectedEquipment({ gymName }: { gymName: string }) {
  const router = useRouter();
  const [query, setQuery] = useState(""),
    [muscle, setMuscle] = useState(""),
    [status, setStatus] = useState(""),
    [area, setArea] = useState("");
  const [floorId, setFloorId] = useState<number | null>(null),
    [selectedKey, setSelectedKey] = useState<string | null>(null);
  // The map fills the screen; the search panel starts open over its top, the results sheet
  // starts closed at its bottom.
  const [topOpen, setTopOpen] = useState(true),
    [sheetOpen, setSheetOpen] = useState(false);
  const [pageHeight, setPageHeight] = useState(0),
    [topCover, setTopCover] = useState(0),
    [peek, setPeek] = useState(0);
  const machineResource = useCachedResource<MachineDto[]>(
    cacheKeys.machines,
    machineAPI.listAll,
    { live: true, staleTime: STALE_MS.live },
  );
  const floorResource = useCachedResource(
    cacheKeys.floorPlans,
    fetchFloorPlans,
    { staleTime: 0, live: true },
  );
  const { revalidate: revalidateMachines, refresh: refreshMachines } =
    machineResource;
  const { refresh: refreshFloors } = floorResource;
  useFocusEffect(
    useCallback(() => {
      revalidateMachines();
      void refreshFloors();
    }, [revalidateMachines, refreshFloors]),
  );
  const connected = useSyncExternalStore(
    websocketService.onConnectionChange,
    () => websocketService.getConnectedSince(),
    () => null,
  );
  useEffect(() => {
    if (connected) void refreshMachines();
  }, [connected, refreshMachines]);
  const key = cacheKeys.machines;
  const timestamp = useSyncExternalStore(
    useCallback((cb) => subscribeCached(key, cb), [key]),
    () => peekCached(key)?.updatedAt ?? 0,
    () => 0,
  );
  const live =
    connected !== null && timestamp >= connected && !machineResource.error;
  const raw = useMemo(() => machineResource.data ?? [], [machineResource.data]);
  const requests = useMemo(
    () =>
      raw
        .filter((m) => m.exerciseNames === undefined)
        .map((m) => ({
          key: cacheKeys.machineExercises(m.id),
          fetcher: () => machineAPI.getExercisesByEquipmentId(m.id),
        })),
    [raw],
  );
  const { data: legacy } = useCachedResources<Exercise[]>(requests, {
    staleTime: STALE_MS.catalog,
  });
  const machines = useMemo(
    () =>
      raw.map((m) => {
        const exercises = legacy[cacheKeys.machineExercises(m.id)];
        return m.exerciseNames !== undefined || !exercises
          ? m
          : {
              ...m,
              exerciseNames: exercises.map((e) => e.name),
              muscleGroups: [...new Set(exercises.map((e) => e.muscleGroup))],
            };
      }),
    [raw, legacy],
  );
  const floors = useMemo(
    () =>
      (floorResource.data ?? [])
        .filter((f) => f.id !== 0)
        .sort((a, b) => a.floorNumber - b.floorNumber),
    [floorResource.data],
  );
  const floor = floors.find((f) => f.id === floorId) ?? floors[0];
  const filters = useMemo(
    () => ({ query, muscle, status, area }),
    [query, muscle, status, area],
  );
  // A new search starts at the top of the list, not wherever the last one was scrolled to.
  const list = useRef<FlatList<MapResult>>(null);
  useEffect(() => {
    list.current?.scrollToOffset({ offset: 0, animated: false });
  }, [filters]);
  const allResults = useMemo(
    () =>
      searchEquipment(machines, floors, {
        query: "",
        muscle: "",
        status: "",
        area: "",
      }),
    [machines, floors],
  );
  const matches = useMemo(
    () => searchEquipment(machines, floors, filters),
    [machines, floors, filters],
  );
  const results = useMemo(
    () =>
      [...matches].sort(
        (a, b) =>
          Number(b.floor?.id === floor?.id) -
            Number(a.floor?.id === floor?.id) || a.name.localeCompare(b.name),
      ),
    [matches, floor?.id],
  );
  const selected = allResults.find((r) => r.key === selectedKey);
  const active = !!(query || muscle || status || area);
  const matchingIds = useMemo(
    () => new Set(matches.flatMap((r) => (r.machine ? [r.machine.id] : []))),
    [matches],
  );
  const matchingAreas = useMemo(
    () =>
      new Set(
        matches
          .filter((r) => !r.machine && r.floor?.id === floor?.id)
          .flatMap((r) => (r.area ? [r.area.id] : [])),
      ),
    [matches, floor?.id],
  );
  const choose = (r: MapResult) => {
    if (r.floor) setFloorId(r.floor.id);
    setSelectedKey(r.key);
    setSheetOpen(false);
  };
  const clear = () => {
    setQuery("");
    setMuscle("");
    setStatus("");
    setArea("");
    setSelectedKey(null);
  };
  const refresh = () => {
    void Promise.all([refreshMachines(), refreshFloors()]);
  };
  const muscleOptions = [
    ...new Set(machines.flatMap((m) => m.muscleGroups ?? [])),
  ].sort();
  const statuses = [...new Set(machines.map((m) => m.status))].sort();
  const meta = (r: MapResult) =>
    r.machine
      ? `${r.floor?.name ?? ""}${r.area ? ` · ${r.area.name}` : ""}${!isPositioned(r.machine, r.floor) ? " · Location not mapped" : ""}`.replace(
          /^ · /,
          "",
        )
      : `${r.floor?.name} · Place`;
  const onFloorCount = matches.filter((r) => r.floor?.id === floor?.id).length;
  const selectionPanel = selected ? (
    <View style={s.detail}>
      <View style={{ flex: 1 }}>
        <Text style={s.detailTitle}>{selected.name}</Text>
        <Text style={s.muted}>{meta(selected)}</Text>
        {selected.machine && (
          <>
            <Text
              style={{
                color: markerColor(selected.machine.status),
                fontWeight: "700",
                marginTop: 5,
              }}
            >
              {selected.machine.status}
            </Text>
            <Text numberOfLines={2} style={s.muted}>
              {(
                selected.machine.exerciseNames ?? [selected.machine.exercise]
              ).join(", ")}
            </Text>
          </>
        )}
      </View>
      <View style={{ gap: 8 }}>
        <Pressable
          accessibilityLabel="Close selection"
          onPress={() => setSelectedKey(null)}
          style={{ alignSelf: "flex-end", padding: 4 }}
        >
          <MaterialCommunityIcons name="close" size={20} color="#6B7D72" />
        </Pressable>
        {selected.machine && (
          <Pressable
            style={s.primary}
            onPress={() =>
              router.push({
                pathname: "/machine/[id]",
                params: { id: String(selected.machine!.id) },
              })
            }
          >
            <Text style={s.primaryText}>View equipment</Text>
          </Pressable>
        )}
      </View>
    </View>
  ) : null;
  return (
    <GestureHandlerRootView
      testID="equipment-screen"
      style={s.page}
      onLayout={(e) => setPageHeight(e.nativeEvent.layout.height)}
    >
      <View style={StyleSheet.absoluteFill}>
        <FloorMap
          floors={floors}
          allMachines={machines}
          selectedFloorId={floor?.id}
          hideFloorPicker
          fullScreen
          insets={{ top: topCover, bottom: peek }}
          matchingEquipmentIds={active ? matchingIds : undefined}
          matchingAreaIds={active ? matchingAreas : undefined}
          highlightedEquipmentId={selected?.machine?.id}
          selectedAreaId={
            selected && !selected.machine ? selected.area?.id : null
          }
          onSelectEquipment={(m) =>
            choose(
              allResults.find((r) => r.machine?.id === m.id) ?? {
                key: `machine:${m.id}`,
                name: m.name,
                machine: m,
                floor: floors.find((f) =>
                  f.equipment.some((eq) => eq.id === m.id),
                ),
              },
            )
          }
          onSelectArea={(a, f) =>
            choose({
              key: `area:${f.id}:${a.id}`,
              name: a.name,
              area: a,
              floor: f,
            })
          }
        />
      </View>
      <MapTopPanel
        open={topOpen}
        onOpenChange={setTopOpen}
        onCoverChange={setTopCover}
        collapsedLabel={[floor?.name ?? "Search", query && `“${query}”`]
          .filter(Boolean)
          .join(" · ")}
      >
        <View style={s.header}>
          <View style={{ flex: 1 }}>
            <Text style={s.gym}>{gymName}</Text>
            <Text style={s.heading}>Explore your gym</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push("/scan")}
            style={s.scan}
          >
            <MaterialCommunityIcons
              name="qrcode-scan"
              size={18}
              color="#216C50"
            />
            <Text style={s.link}>Scan QR</Text>
          </Pressable>
        </View>
        <View style={s.search}>
          <MaterialCommunityIcons name="magnify" size={23} color="#687E70" />
          <TextInput
            accessibilityLabel="Search equipment, exercises, or places"
            placeholder="Search equipment, exercises, or places"
            placeholderTextColor="#7E8C84"
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={() => setSheetOpen(true)}
            style={s.input}
            returnKeyType="search"
          />
          {query ? (
            <Pressable
              accessibilityLabel="Clear search"
              onPress={() => setQuery("")}
              style={{ padding: 10 }}
            >
              <Text>✕</Text>
            </Pressable>
          ) : null}
          <EquipmentFilters
            count={[muscle, status, area].filter(Boolean).length}
            onClear={() => {
              setMuscle("");
              setStatus("");
              setArea("");
              setSelectedKey(null);
            }}
          >
            <EquipmentFilters.Group
              label="Muscle group"
              value={muscle}
              onChange={setMuscle}
              options={[
                { value: "", label: "All muscles" },
                ...muscleOptions.map((v) => ({ value: v, label: v })),
              ]}
            />
            <EquipmentFilters.Group
              label="Availability"
              value={status}
              onChange={setStatus}
              options={[
                { value: "", label: "Any availability" },
                ...statuses.map((v) => ({ value: v, label: v })),
              ]}
            />
            <EquipmentFilters.Group
              label="Area"
              value={area}
              onChange={setArea}
              options={[
                { value: "", label: "All areas" },
                ...floors.flatMap((f) =>
                  (f.layout?.areas ?? [])
                    .filter((a) => a.kind !== "void")
                    .map((a) => ({
                      value: `${f.id}:${a.id}`,
                      label: `${f.name} · ${a.name}`,
                    })),
                ),
              ]}
            />
          </EquipmentFilters>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={s.floors}
          contentContainerStyle={{ gap: 6 }}
        >
          {floors.map((f) => (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: f.id === floor?.id }}
              key={f.id}
              onPress={() => {
                setFloorId(f.id);
                setSelectedKey(null);
              }}
              style={[s.floorTab, f.id === floor?.id && s.floorActive]}
            >
              <Text
                style={[s.floorText, f.id === floor?.id && { color: "white" }]}
              >
                {f.name}{" "}
                <Text style={{ opacity: 0.7 }}>
                  {" "}
                  {matches.filter((r) => r.floor?.id === f.id).length}
                </Text>
              </Text>
            </Pressable>
          ))}
        </ScrollView>
        <View style={s.statusRow}>
          <Text style={[s.sync, { color: live ? "#216C50" : "#6C7E72" }]}>
            {live
              ? "● Live availability"
              : timestamp
                ? `Saved copy · synced ${new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                : "Connecting…"}
          </Text>
          <Pressable accessibilityRole="button" onPress={refresh}>
            <Text style={s.link}>
              {machineResource.refreshing ? "Refreshing…" : "Refresh"}
            </Text>
          </Pressable>
        </View>
        {machineResource.error || floorResource.error ? (
          <Text accessibilityRole="alert" style={s.notice}>
            Couldn’t refresh {machineResource.error ? "equipment" : "the map"}.
            Check your connection and try Refresh.
          </Text>
        ) : null}
        {floor?.illustrative && (
          <Text style={s.illustrative}>
            Illustrative university gym · room and equipment locations are
            fictional
          </Text>
        )}
      </MapTopPanel>
      <ResultsSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        maxHeight={pageHeight - topCover - 8}
        onPeekChange={setPeek}
        title={active ? "Search results" : "Equipment & places"}
        count={matches.length}
        subtitle={
          floor
            ? `${onFloorCount} on ${floor.name} · ${matches.length - onFloorCount} elsewhere`
            : "Equipment in your gym"
        }
        peek={selectionPanel}
      >
        <View style={s.legend}>
          {["Available", "In Use", "Reserved", "Out of Order"].map((v) => (
            <View key={v} style={s.legendItem}>
              <View style={[s.dot, { backgroundColor: markerColor(v) }]} />
              <Text style={s.legendText}>{v}</Text>
            </View>
          ))}
        </View>
        {machineResource.loading ? (
          <View style={s.center}>
            <ActivityIndicator color="#216C50" />
            <Text style={s.muted}>Loading machines...</Text>
          </View>
        ) : (
          <FlatList
            ref={list}
            data={results}
            keyExtractor={(r) => r.key}
            keyboardShouldPersistTaps="handled"
            refreshing={machineResource.refreshing}
            onRefresh={refresh}
            ListEmptyComponent={
              <View style={{ padding: 24 }}>
                <Text style={s.detailTitle}>
                  {active ? "No matches" : "No equipment yet"}
                </Text>
                <Text style={s.muted}>
                  {active
                    ? "Try another exercise or clear your filters."
                    : "Equipment will appear when your gym adds it."}
                </Text>
                {active && (
                  <Pressable onPress={clear} style={{ paddingTop: 14 }}>
                    <Text style={s.link}>Clear filters</Text>
                  </Pressable>
                )}
              </View>
            }
            renderItem={({ item: r }) => (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${r.name}, ${r.machine?.status ?? "Place"}, ${meta(r)}`}
                onPress={() => choose(r)}
                style={[
                  s.resultRow,
                  r.key === selectedKey && { backgroundColor: "#EAF3ED" },
                ]}
              >
                <View
                  style={[
                    s.resultIcon,
                    { backgroundColor: r.machine ? "#EEF4F0" : "#EDF1F6" },
                  ]}
                >
                  <MaterialCommunityIcons
                    name={
                      r.machine
                        ? "dumbbell"
                        : r.area?.kind === "pool"
                          ? "pool"
                          : r.area?.kind === "court"
                            ? "basketball"
                            : "map-marker-outline"
                    }
                    size={20}
                    color={
                      r.machine ? markerColor(r.machine.status) : "#57718B"
                    }
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.resultName}>{r.name}</Text>
                  {r.machine && (
                    <Text
                      style={{
                        fontSize: 12,
                        color: markerColor(r.machine.status),
                        fontWeight: "600",
                      }}
                    >
                      {r.machine.status}
                    </Text>
                  )}
                  <Text style={s.resultMeta}>{meta(r)}</Text>
                </View>
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={18}
                  color="#8A9B90"
                />
              </Pressable>
            )}
          />
        )}
      </ResultsSheet>
    </GestureHandlerRootView>
  );
}
const s = StyleSheet.create({
  // Clips the panels as they slide off the top and bottom.
  page: { flex: 1, backgroundColor: "#F4F6F5", overflow: "hidden" },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 14,
  },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 14 },
  gym: { fontSize: 13, fontWeight: "600", color: "#62796B", marginBottom: 3 },
  heading: { fontSize: 26, fontWeight: "800", color: "#1D3828" },
  scan: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    padding: 12,
    borderWidth: 1,
    borderColor: "#D4E2D8",
    borderRadius: 10,
    backgroundColor: "white",
  },
  link: { fontSize: 13, color: "#216C50", fontWeight: "600" },
  search: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: "#CEDCD2",
    backgroundColor: "white",
    borderRadius: 12,
    paddingLeft: 14,
    paddingRight: 4,
    minHeight: 50,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: "#203C2B",
    paddingVertical: 12,
    minWidth: 0,
  },
  floors: { flexGrow: 0, marginTop: 10, marginBottom: 7 },
  floorTab: {
    minHeight: 42,
    justifyContent: "center",
    paddingHorizontal: 15,
    borderRadius: 9,
    backgroundColor: "#EBF0EC",
  },
  floorActive: { backgroundColor: "#216C50" },
  floorText: { fontSize: 13, fontWeight: "600", color: "#516A5B" },
  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 6,
  },
  sync: { fontSize: 12 },
  illustrative: { fontSize: 11, color: "#77877C", paddingBottom: 4 },
  legend: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderColor: "#F0F3F1",
  },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  dot: { width: 8, height: 8, borderRadius: 3 },
  legendText: { fontSize: 10, color: "#65796C" },
  muted: { fontSize: 12, color: "#708175", marginTop: 3 },
  resultRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    gap: 10,
    borderBottomWidth: 1,
    borderColor: "#F0F3F1",
    minHeight: 78,
  },
  resultIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  resultName: { fontSize: 14, fontWeight: "600", color: "#263D2E" },
  resultMeta: { fontSize: 11, color: "#7A897F", marginTop: 4 },
  detail: {
    flexDirection: "row",
    gap: 12,
    padding: 14,
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#CEDCD2",
    borderRadius: 12,
  },
  detailTitle: { fontSize: 16, fontWeight: "700", color: "#23432E" },
  primary: {
    paddingHorizontal: 14,
    paddingVertical: 11,
    backgroundColor: "#216C50",
    borderRadius: 8,
  },
  primaryText: { fontSize: 12, color: "white", fontWeight: "700" },
  notice: { fontSize: 12, color: "#925A22", paddingBottom: 8 },
});
