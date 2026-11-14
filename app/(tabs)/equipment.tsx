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
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
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
import { GestureHandlerRootView } from "react-native-gesture-handler";
import ResultsSheet from "@/components/equipment/ResultsSheet";
import FloorMap from "@/components/FloorMap";
import EquipmentFilters from "@/components/equipment/EquipmentFilters";
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
  const { equipmentId, scanKey } = useLocalSearchParams<{
    equipmentId?: string;
    scanKey?: string;
  }>();
  const appliedScan = useRef<string | null>(null);
  const router = useRouter(),
    wide = useWindowDimensions().width >= 900;
  const [query, setQuery] = useState(""),
    [muscle, setMuscle] = useState(""),
    [status, setStatus] = useState(""),
    [area, setArea] = useState("");
  const [floorId, setFloorId] = useState<number | null>(null),
    [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [pageHeight, setPageHeight] = useState(640);
  const [controlsHeight, setControlsHeight] = useState(168);
  const [detailHeight, setDetailHeight] = useState(160);
  const listRef = useRef<FlatList<MapResult>>(null);
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
  useEffect(() => {
    // Selection details and new searches must begin at the top, even after
    // browsing a long list or changing the sheet's visible height.
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
  }, [selectedKey, floor?.id, query, muscle, status, area, expanded]);
  const filters = useMemo(
    () => ({ query, muscle, status, area }),
    [query, muscle, status, area],
  );
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
  useEffect(() => {
    const key = `${equipmentId}:${scanKey}`;
    if (!equipmentId || appliedScan.current === key) return;
    const result = allResults.find(
      (r) => String(r.machine?.id) === equipmentId,
    );
    if (!result || (!result.floor && floorResource.loading)) return;
    appliedScan.current = key;
    setQuery("");
    setMuscle("");
    setStatus("");
    setArea("");
    if (result.floor) setFloorId(result.floor.id);
    setSelectedKey(result.key);
    setExpanded(false);
    Keyboard.dismiss();
  }, [equipmentId, scanKey, allResults, floorResource.loading]);
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
    setExpanded(false);
    Keyboard.dismiss();
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
      : `${r.floor?.name ?? ""} · Place`;
  const onFloorCount = matches.filter((r) => r.floor?.id === floor?.id).length;
  const sheetHeight = Math.max(100, pageHeight - controlsHeight - 52);
  const peekHeight = Math.min(sheetHeight, selected ? detailHeight + 78 : 164);
  const selectionPanel = selected ? (
    <View
      style={s.detail}
      onLayout={(e) => setDetailHeight(e.nativeEvent.layout.height)}
    >
      <View style={s.detailTop}>
        <View style={{ flex: 1 }}>
          <Text style={s.detailTitle}>{selected.name}</Text>
          <Text style={s.muted}>{meta(selected)}</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close selection"
          onPress={() => setSelectedKey(null)}
          style={s.iconButton}
        >
          <MaterialCommunityIcons name="close" size={20} color="#526B5E" />
        </Pressable>
      </View>
      {selected.machine && (
        <>
          <Text
            style={[
              s.availability,
              { color: markerColor(selected.machine.status) },
            ]}
          >
            {selected.machine.status}
          </Text>
          <Text numberOfLines={2} style={s.muted}>
            {(
              selected.machine.exerciseNames ?? [selected.machine.exercise]
            ).join(", ")}
          </Text>
          <Pressable
            accessibilityRole="button"
            style={s.primary}
            onPress={() =>
              router.push({
                pathname: "/machine/[id]",
                params: { id: String(selected.machine!.id) },
              })
            }
          >
            <Text style={s.primaryText}>View equipment</Text>
            <MaterialCommunityIcons
              name="arrow-right"
              size={18}
              color="white"
            />
          </Pressable>
        </>
      )}
      {!selected.machine && (
        <Text style={s.muted}>Highlighted on {selected.floor?.name}.</Text>
      )}
    </View>
  ) : null;
  const resultsList = (
    <FlatList
      ref={listRef}
      data={selected && !expanded && !wide ? [] : results}
      keyExtractor={(r) => r.key}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      style={{ flex: 1 }}
      ListHeaderComponent={selectionPanel}
      refreshing={machineResource.refreshing}
      onRefresh={refresh}
      ListEmptyComponent={
        selected ? null : (
          <View style={s.emptyResults}>
            {machineResource.loading ? (
              <>
                <ActivityIndicator color="#216C50" />
                <Text style={s.muted}>Loading equipment…</Text>
              </>
            ) : (
              <>
                <Text style={s.detailTitle}>
                  {active
                    ? "No matches"
                    : machineResource.error
                      ? "Equipment unavailable"
                      : "No equipment yet"}
                </Text>
                <Text style={s.muted}>
                  {active
                    ? "Try another exercise or clear your filters."
                    : machineResource.error
                      ? "Check your connection, then try Refresh."
                      : "Equipment will appear when your gym adds it."}
                </Text>
                {active && (
                  <Pressable
                    accessibilityRole="button"
                    onPress={clear}
                    style={s.textButton}
                  >
                    <Text style={s.link}>Clear filters</Text>
                  </Pressable>
                )}
              </>
            )}
          </View>
        )
      }
      renderItem={({ item: r }) => (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${r.name}, ${r.machine?.status ?? "Place"}, ${meta(r)}`}
          accessibilityState={{ selected: r.key === selectedKey }}
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
              color={r.machine ? markerColor(r.machine.status) : "#57718B"}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.resultName}>{r.name}</Text>
            {r.machine && (
              <Text
                style={[
                  s.availability,
                  { color: markerColor(r.machine.status) },
                ]}
              >
                {r.machine.status}
              </Text>
            )}
            <Text style={s.resultMeta}>{meta(r)}</Text>
          </View>
          <MaterialCommunityIcons
            name="chevron-right"
            size={20}
            color="#819589"
          />
        </Pressable>
      )}
    />
  );
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View
          style={s.page}
          onLayout={(e) => setPageHeight(e.nativeEvent.layout.height)}
        >
          <View
            style={[
              s.mapPane,
              {
                top: wide ? 12 : controlsHeight + 4,
                bottom: wide ? 72 : peekHeight + 94,
                left: wide ? 388 : 8,
              },
            ]}
          >
            {floorResource.loading && !floor ? (
              <View style={s.center}>
                <ActivityIndicator color="#216C50" />
                <Text style={s.muted}>Loading floor map…</Text>
              </View>
            ) : (
              <FloorMap
                enableGoogleMaps
                floors={floors}
                allMachines={machines}
                selectedFloorId={floor?.id}
                hideFloorPicker
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
            )}
          </View>

          <View
            style={[s.controls, wide && { width: 360, right: undefined }]}
            onLayout={(e) =>
              setControlsHeight(e.nativeEvent.layout.height + 12)
            }
          >
            <View style={s.header}>
              <View style={{ flex: 1 }}>
                <Text style={s.gym} numberOfLines={1}>
                  {gymName}
                </Text>
                <Text style={s.heading}>Explore your gym</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Scan equipment QR code"
                onPress={() => router.push("/scan")}
                style={s.scan}
              >
                <MaterialCommunityIcons
                  name="qrcode-scan"
                  size={20}
                  color="#216C50"
                />
                <Text style={s.link}>Scan QR</Text>
              </Pressable>
            </View>
            <View style={s.search}>
              <MaterialCommunityIcons
                name="magnify"
                size={23}
                color="#627D6D"
              />
              <TextInput
                accessibilityLabel="Search equipment, exercises, or places"
                placeholder="Equipment, exercises, or places"
                placeholderTextColor="#718578"
                value={query}
                onChangeText={(text) => {
                  setQuery(text);
                  setSelectedKey(null);
                }}
                style={s.input}
                returnKeyType="search"
                onSubmitEditing={() => {
                  setExpanded(true);
                  Keyboard.dismiss();
                }}
              />
              {!!query && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Clear search"
                  onPress={() => {
                    setQuery("");
                    setSelectedKey(null);
                  }}
                  style={s.iconButton}
                >
                  <MaterialCommunityIcons
                    name="close"
                    size={20}
                    color="#526B5E"
                  />
                </Pressable>
              )}
              <EquipmentFilters count={[muscle, status, area].filter(Boolean).length} onClear={() => {
                setMuscle(""); setStatus(""); setArea(""); setSelectedKey(null);
              }}>
              <EquipmentFilters.Group
                label="Muscle group"
                value={muscle}
                onChange={(v) => {
                  setMuscle(v);
                  setSelectedKey(null);
                }}
                options={[
                  { value: "", label: "All muscles" },
                  ...muscleOptions.map((v) => ({ value: v, label: v })),
                ]}
              />
              <EquipmentFilters.Group
                label="Availability"
                value={status}
                onChange={(v) => {
                  setStatus(v);
                  setSelectedKey(null);
                }}
                options={[
                  { value: "", label: "Any availability" },
                  ...statuses.map((v) => ({ value: v, label: v })),
                ]}
              />
              <EquipmentFilters.Group
                label="Area"
                value={area}
                onChange={(v) => {
                  setArea(v);
                  setSelectedKey(null);
                }}
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
            {!!(machineResource.error || floorResource.error) && (
              <View style={s.notice}>
                <Text accessibilityRole="alert" style={s.noticeText}>
                  Couldn’t refresh{" "}
                  {machineResource.error ? "equipment" : "the map"}. Check your
                  connection and try Refresh.
                </Text>
              </View>
            )}
          </View>

          {!!floors.length && (
            <View
              style={[
                s.floorPicker,
                {
                  top: wide ? 20 : controlsHeight + 12,
                  maxHeight: Math.max(
                    60,
                    pageHeight - controlsHeight - peekHeight - 90,
                  ),
                },
              ]}
            >
              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                {floors.map((f) => (
                  <Pressable
                    key={f.id}
                    accessibilityRole="button"
                    accessibilityLabel={`Show ${f.name}, ${matches.filter((r) => r.floor?.id === f.id).length} results`}
                    accessibilityState={{ selected: f.id === floor?.id }}
                    onPress={() => {
                      setFloorId(f.id);
                      setSelectedKey(null);
                      setExpanded(false);
                      Keyboard.dismiss();
                    }}
                    style={[s.floorTab, f.id === floor?.id && s.floorActive]}
                  >
                    <Text
                      style={[
                        s.floorText,
                        f.id === floor?.id && { color: "white" },
                      ]}
                    >
                      {/^ground$/i.test(f.name)
                        ? "G"
                        : (f.name.match(/^level\s+(\d+)$/i)?.[1] ?? f.name)}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}

          <View
            style={[
              s.mapFooter,
              { bottom: wide ? 16 : peekHeight + 52, left: wide ? 400 : 16 },
            ]}
          >
            {floor?.illustrative && (
              <Text style={s.illustrative}>
                Illustrative map · fictional locations
              </Text>
            )}
            <View style={s.legend}>
              {["Available", "In Use", "Reserved", "Out of Order"].map((v) => (
                <View key={v} style={s.legendItem}>
                  <View style={[s.dot, { backgroundColor: markerColor(v) }]} />
                  <Text style={s.legendText}>{v}</Text>
                </View>
              ))}
            </View>
          </View>

          <View
            style={[
              s.sheetSlot,
              { height: sheetHeight },
              wide && { right: undefined, width: 388 },
            ]}
            pointerEvents="box-none"
          >
            <ResultsSheet
              height={sheetHeight - (wide ? 14 : 0)}
              peekHeight={peekHeight}
              expanded={expanded}
              onExpandedChange={setExpanded}
              docked={wide}
              header={
                <View style={s.resultHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.resultTitle}>
                      {active ? "Search results" : "Equipment & places"} (
                      {matches.length})
                    </Text>
                    <Text style={s.muted}>
                      {floor
                        ? `${onFloorCount} on ${floor.name} · ${matches.length - onFloorCount} elsewhere`
                        : "Equipment in your gym"}
                    </Text>
                  </View>
                  {!wide && (
                    <MaterialCommunityIcons
                      name={expanded ? "chevron-down" : "chevron-up"}
                      size={24}
                      color="#216C50"
                    />
                  )}
                </View>
              }
            >
              {resultsList}
            </ResultsSheet>
          </View>
          <View
            style={[
              s.liveBar,
              wide && { left: 14, width: 360, right: undefined },
            ]}
          >
            <View
              style={[s.dot, { backgroundColor: live ? "#216C50" : "#8B9C91" }]}
            />
            <Text style={s.sync} numberOfLines={1}>
              {live
                ? "Live availability"
                : timestamp
                  ? `Saved · ${new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                  : "Connecting…"}
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={refresh}
              style={s.refresh}
            >
              <Text style={s.link}>
                {machineResource.refreshing ? "Refreshing…" : "Refresh"}
              </Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </GestureHandlerRootView>
  );
}
const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#EDF2EE", overflow: "hidden" },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 14,
  },
  controls: { position: "absolute", top: 12, left: 14, right: 14, gap: 9 },
  header: { flexDirection: "row", alignItems: "center", gap: 8 },
  gym: { fontSize: 11, fontWeight: "600", color: "#526E5D", marginBottom: 2 },
  heading: { fontSize: 21, fontWeight: "800", color: "#1D3828" },
  scan: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minHeight: 46,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#D4E2D8",
    borderRadius: 14,
    backgroundColor: "white",
  },
  link: { fontSize: 13, color: "#216C50", fontWeight: "600" },
  search: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "white",
    borderRadius: 16,
    paddingLeft: 14,
    paddingRight: 4,
    minHeight: 52,
    borderWidth: 1,
    borderColor: "#D4E2D8",
    boxShadow: "0 3px 12px #203C2B0D",
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: "#203C2B",
    paddingVertical: 14,
    minWidth: 0,
  },
  iconButton: {
    minWidth: 44,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  textButton: {
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  floorPicker: {
    position: "absolute",
    right: 16,
    width: 48,
    borderRadius: 16,
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#D4E2D8",
    overflow: "hidden",
    boxShadow: "0 3px 12px #203C2B12",
  },
  floorTab: {
    minHeight: 44,
    paddingHorizontal: 5,
    paddingVertical: 7,
    alignItems: "center",
    justifyContent: "center",
  },
  floorActive: { backgroundColor: "#216C50" },
  floorText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#516A5B",
    textAlign: "center",
  },
  mapPane: { position: "absolute", right: 8, minHeight: 100 },
  mapFooter: { position: "absolute", right: 12, gap: 5 },
  illustrative: { fontSize: 10, color: "#526B5C" },
  legend: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  legendText: { fontSize: 10, color: "#526B5C" },
  sheetSlot: { position: "absolute", bottom: 44, left: 0, right: 0 },
  resultHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  resultTitle: { fontSize: 15, fontWeight: "700", color: "#254B34" },
  muted: { fontSize: 12, color: "#63796B", marginTop: 3, lineHeight: 17 },
  resultRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 18,
    gap: 12,
    borderTopWidth: 1,
    borderColor: "#EDF1EE",
    minHeight: 82,
  },
  resultIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  resultName: { fontSize: 14, fontWeight: "600", color: "#263D2E" },
  resultMeta: { fontSize: 11, color: "#63796B", marginTop: 4 },
  availability: { fontSize: 12, fontWeight: "600", marginTop: 3 },
  detail: { paddingHorizontal: 18, paddingTop: 4, paddingBottom: 16 },
  detailTop: { flexDirection: "row", gap: 8, alignItems: "flex-start" },
  detailTitle: { fontSize: 18, fontWeight: "700", color: "#23432E" },
  primary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    minHeight: 46,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#216C50",
    borderRadius: 12,
    marginTop: 12,
  },
  primaryText: { fontSize: 14, color: "white", fontWeight: "700" },
  emptyResults: { paddingHorizontal: 18, paddingVertical: 10 },
  notice: { padding: 10, borderRadius: 12, backgroundColor: "#FFF4DF" },
  noticeText: { fontSize: 12, color: "#825018" },
  liveBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingLeft: 18,
    paddingRight: 6,
    backgroundColor: "white",
  },
  sync: { flex: 1, fontSize: 11, color: "#526B5C" },
  refresh: { minHeight: 44, paddingHorizontal: 12, justifyContent: "center" },
});
