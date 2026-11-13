import React, { useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Keyboard, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Image } from "expo-image";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { exerciseMediaUrl } from "@/utils/exerciseMedia";
import { Exercise } from "@/services/exerciseAPI";
import { useAuth } from "@/contexts/AuthContext";
import { useCachedResource } from "@/hooks/useCachedResource";
import { cacheKeys, fetchPlanCatalog, STALE_MS } from "@/services/cachedResources";

export default function PlanExercisePicker({ existingIds, dayName, onClose, onAdd }: {
  existingIds: number[]; dayName: string; onClose: () => void; onAdd: (items: Exercise[]) => void;
}) {
  const { user } = useAuth();
  const catalog = useCachedResource(user ? cacheKeys.planCatalog(user.username) : null, fetchPlanCatalog, { staleTime: STALE_MS.catalog });
  const [search, setSearch] = useState("");
  const [muscle, setMuscle] = useState("");
  const [equipment, setEquipment] = useState("");
  const [filter, setFilter] = useState<"muscleGroup" | "equipmentType" | null>(null);
  const [selected, setSelected] = useState<Exercise[]>([]);
  const [detail, setDetail] = useState<Exercise | null>(null);
  const exercises = useMemo(() => catalog.data ?? [], [catalog.data]);
  const results = useMemo(() => exercises.filter(e =>
    e.name.toLowerCase().includes(search.trim().toLowerCase()) &&
    (!muscle || e.muscleGroup === muscle) && (!equipment || e.equipmentType === equipment)
  ), [exercises, search, muscle, equipment]);
  const options = filter ? [...new Set(exercises.map(e => e[filter]))].sort() : [];
  const pretty = (s: string) => s.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
  const openFilter = (type: "muscleGroup" | "equipmentType") => {
    Keyboard.dismiss();
    setFilter(type);
  };
  return (
    <Modal visible animationType="slide" onRequestClose={() => filter ? setFilter(null) : onClose()}>
      <SafeAreaView style={s.screen}>
        <View style={s.content} accessibilityElementsHidden={!!filter} importantForAccessibility={filter ? "no-hide-descendants" : "auto"}>
        <View style={s.header}>
          <View style={{ flex: 1, gap: 6 }}><Text style={s.caption}>Build your {dayName.toLowerCase()}</Text><Text style={s.title}>Choose your movements</Text></View>
          <Pressable accessibilityRole="button" accessibilityLabel="Close exercise library" onPress={onClose} style={s.close}><MaterialCommunityIcons name="close" size={23} color="#315547" /></Pressable>
        </View>
        <View style={s.search}>
          <MaterialCommunityIcons name="magnify" size={24} color="#6C7C75" />
          <TextInput accessibilityLabel="Search exercises" placeholder="Search exercises" value={search} onChangeText={setSearch} style={s.input} autoCorrect={false} />
          {!!search && <Pressable accessibilityLabel="Clear search" onPress={() => setSearch("")}><MaterialCommunityIcons name="close" size={22} /></Pressable>}
        </View>
        <View style={s.filters}>
          <Pressable accessibilityRole="button" style={s.filter} onPress={() => openFilter("equipmentType")}><Text style={s.link}>{pretty(equipment) || "Equipment"} ▾</Text></Pressable>
          <Pressable accessibilityRole="button" style={s.filter} onPress={() => openFilter("muscleGroup")}><Text style={s.link}>{muscle || "Muscle focus"} ▾</Text></Pressable>
        </View>
        <View style={s.summary}><Text style={s.caption}>{results.length} exercises</Text>
          {!!(search || muscle || equipment) && <Pressable onPress={() => { setSearch(""); setMuscle(""); setEquipment(""); }}><Text style={s.link}>Clear filters</Text></Pressable>}
        </View>
        {catalog.loading ? <ActivityIndicator color="#216C50" style={{ margin: 24 }} /> : null}
        {!!catalog.error && <View style={s.message}><Text>Couldn’t refresh exercises. Check your connection and try again.</Text><Pressable onPress={() => void catalog.refresh()}><Text style={s.link}>Retry</Text></Pressable></View>}
        <FlatList style={s.results} data={results} keyExtractor={e => String(e.id)} keyboardShouldPersistTaps="handled"
          ListEmptyComponent={!catalog.loading && !catalog.error ? <Text style={s.message}>No exercises match. Try another search or clear the filters.</Text> : null}
          renderItem={({ item }) => {
            const added = existingIds.includes(item.id);
            const checked = added || selected.some(e => e.id === item.id);
            return <View style={s.row}>
              <Pressable style={s.exercise} accessibilityRole="checkbox" accessibilityState={{ checked, disabled: added }} accessibilityLabel={item.name} disabled={added} onPress={() => setSelected(prev => checked ? prev.filter(e => e.id !== item.id) : [...prev, item])}>
                <View style={s.thumbnail}>{exerciseMediaUrl(item.gifUrl) ? <Image source={{ uri: exerciseMediaUrl(item.gifUrl)! }} style={{ width: 52, height: 52 }} contentFit="contain" /> : <MaterialCommunityIcons name="dumbbell" size={26} color="#216C50" />}</View>
                <View style={{ flex: 1 }}><Text style={s.name}>{item.name}</Text><Text style={s.caption}>{item.muscleGroup} · {pretty(item.equipmentType)}{added ? " · Added" : ""}</Text></View>
                <MaterialCommunityIcons name={checked ? "checkbox-marked-circle" : "plus-circle-outline"} size={25} color={checked ? "#216C50" : "#89968F"} />
              </Pressable>
              <Pressable accessibilityLabel={`Details for ${item.name}`} style={s.info} onPress={() => setDetail(detail?.id === item.id ? null : item)}><MaterialCommunityIcons name="information-outline" size={23} color="#6C7C75" /></Pressable>
            </View>;
          }} />
        {detail && <View style={s.message}><View style={s.summary}><Text style={s.name}>{detail.name}</Text><Pressable accessibilityLabel="Close exercise details" onPress={() => setDetail(null)}><MaterialCommunityIcons name="close" size={24} /></Pressable></View><Text>{detail.instructions || "No instructions available for this exercise."}</Text></View>}
        <View style={s.footer}>
          {selected.length > 0 && <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxHeight: 56, flexGrow: 0 }} contentContainerStyle={{ gap: 8, paddingBottom: 12 }}>{selected.map(item => <Pressable key={item.id} accessibilityLabel={`Deselect ${item.name}`} onPress={() => setSelected(prev => prev.filter(e => e.id !== item.id))} style={s.selection}><Text style={s.selectionText}>{item.name}</Text><MaterialCommunityIcons name="close" size={15} color="#315547" /></Pressable>)}</ScrollView>}
          <View style={s.footerRow}><View style={{ flex: 1 }}><Text style={s.selectionCount}>{selected.length} selected</Text><Text style={s.caption}>For {dayName}</Text></View><Pressable accessibilityRole="button" disabled={!selected.length} style={[s.add, !selected.length && { opacity: 0.45 }]} onPress={() => onAdd(selected)}><Text style={s.addText}>Add to day</Text><MaterialCommunityIcons name="arrow-right" size={20} color="#fff" /></Pressable></View>
        </View>
        </View>
        {filter && <View style={s.filterOverlay}>
          <Pressable style={StyleSheet.absoluteFill} accessibilityRole="button" accessibilityLabel="Dismiss filter options" onPress={() => setFilter(null)} />
          <View style={s.filterPanel} accessibilityViewIsModal>
            <View style={s.panelHeader}>
              <Text accessibilityRole="header" style={s.panelTitle}>{filter === "muscleGroup" ? "Choose muscle focus" : "Choose equipment"}</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="Close filter options" onPress={() => setFilter(null)} style={s.close}><MaterialCommunityIcons name="close" size={23} color="#315547" /></Pressable>
            </View>
            <ScrollView key={filter} style={s.options} keyboardShouldPersistTaps="handled" contentContainerStyle={s.optionsContent}>
              {["", ...options].map(value => {
                const active = value === (filter === "muscleGroup" ? muscle : equipment);
                return <Pressable key={value} style={[s.option, active && s.activeOption]} accessibilityRole="radio" accessibilityState={{ selected: active }} onPress={() => { if (filter === "muscleGroup") setMuscle(value); else setEquipment(value); setFilter(null); }}>
                  <Text style={[s.name, s.optionLabel]}>{value ? pretty(value) : filter === "muscleGroup" ? "All muscles" : "All equipment"}</Text>
                  <MaterialCommunityIcons name={active ? "radiobox-marked" : "radiobox-blank"} size={24} color={active ? "#216C50" : "#89968F"} />
                </Pressable>;
              })}
            </ScrollView>
          </View>
        </View>}
      </SafeAreaView>
    </Modal>
  );
}
const s = StyleSheet.create({
  close: { backgroundColor: "#E3EDE6", padding: 12, borderRadius: 12 },
  selection: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#E3EDE6", padding: 10, borderRadius: 8 },
  selectionText: { color: "#315547", fontSize: 12, fontWeight: "600" },
  selectionCount: { color: "#193F32", fontSize: 18, fontWeight: "800" },
  footerRow: { flexDirection: "row", alignItems: "center", gap: 16 },
  screen: { flex: 1, backgroundColor: "#F3F6F4" },
  content: { flex: 1, minHeight: 0 },
  header: { padding: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  title: { fontSize: 25, fontWeight: "800", color: "#1B3029" },
  link: { color: "#216C50", fontSize: 15, fontWeight: "600" },
  caption: { color: "#6C7C75", fontSize: 13, marginTop: 4 },
  search: { marginHorizontal: 20, paddingHorizontal: 12, borderRadius: 12, backgroundColor: "#fff", flexDirection: "row", alignItems: "center", gap: 8 },
  input: { flex: 1, paddingVertical: 14, fontSize: 16, color: "#1B3029" },
  filters: { flexDirection: "row", gap: 10, padding: 20, paddingBottom: 8 },
  filter: { flex: 1, padding: 13, backgroundColor: "#E3EDE6", borderRadius: 10, alignItems: "center" },
  filterOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(16, 35, 27, 0.45)", justifyContent: "center", alignItems: "center", padding: 16 },
  filterPanel: { width: "100%", maxWidth: 480, height: "75%", maxHeight: 600, backgroundColor: "#F3F6F4", borderRadius: 20, overflow: "hidden" },
  panelHeader: { flexDirection: "row", alignItems: "center", gap: 12, padding: 20, borderBottomWidth: 1, borderColor: "#D5E2D9" },
  panelTitle: { flex: 1, fontSize: 21, fontWeight: "800", color: "#1B3029" },
  options: { flex: 1, minHeight: 0 },
  optionsContent: { padding: 12, gap: 6 },
  results: { flex: 1, minHeight: 0 },
  option: { minHeight: 56, padding: 16, flexDirection: "row", alignItems: "center", gap: 16, backgroundColor: "#fff", borderRadius: 12 },
  activeOption: { backgroundColor: "#E3EDE6" },
  optionLabel: { flex: 1 },
  summary: { paddingHorizontal: 20, paddingVertical: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  row: { flexDirection: "row", alignItems: "center", borderBottomWidth: StyleSheet.hairlineWidth, borderColor: "#E1E7E3", paddingHorizontal: 20, marginHorizontal: 16, backgroundColor: "#fff", borderRadius: 12, marginBottom: 6 },
  exercise: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 15 },
  thumbnail: { width: 52, height: 52, backgroundColor: "#E3EDE6", borderRadius: 12, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  name: { fontSize: 16, fontWeight: "600", color: "#1B3029", flexShrink: 1 },
  info: { padding: 16 },
  message: { padding: 20, gap: 10 },
  footer: { padding: 20, borderTopWidth: 1, borderColor: "#D5E2D9", backgroundColor: "#fff" },
  add: { padding: 16, borderRadius: 12, backgroundColor: "#193F32", alignItems: "center", flexDirection: "row", gap: 16 },
  addText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
