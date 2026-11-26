import { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Line, Path, Text as SvgText } from "react-native-svg";
import { useBodyMeasurements } from "@/hooks/useBodyMeasurements";
import { WeightEntry } from "@/services/bodyMeasurements";
import { addDays, calendarDate, dateKey } from "@/utils/historyCalendar";

const shortDate = (date: string) => calendarDate(date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
const displayWeight = (kg: number, unit: "kg" | "lb") => (unit === "lb" ? kg / 0.45359237 : kg).toLocaleString("en-US", { maximumFractionDigits: 1 });

export default function WeightProgressCard({ username }: { username: string }) {
  const { data, loading, error, refresh } = useBodyMeasurements(username);
  const [showEntries, setShowEntries] = useState(false);
  const [range, setRange] = useState<30 | 90 | null>(null);
  const [unit, setUnit] = useState<"kg" | "lb">("kg");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const today = dateKey(new Date());
  const entries = useMemo(() => (data?.weightHistory ?? []).filter(entry =>
    range == null || entry.date >= addDays(today, -(range - 1))), [data?.weightHistory, range, today]);
  const first = entries[0], latest = entries.at(-1);
  const difference = first && latest ? latest.weightKg - first.weightKg : 0;
  const change = Number(displayWeight(Math.abs(difference), unit).replace(/,/g, ""));
  const selected = entries.find(entry => entry.date === selectedDate) ?? latest;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>Weight progress</Text>
        <Pressable accessibilityRole="button" accessibilityLabel={`Show weight progress in ${unit === "kg" ? "pounds" : "kilograms"}`} onPress={() => setUnit(unit === "kg" ? "lb" : "kg")} style={styles.unitButton}><Text style={styles.unitText}>{unit} ⇄</Text></Pressable>
      </View>
      <View style={styles.ranges}>{([{ label: "Month", value: 30 }, { label: "3 months", value: 90 }, { label: "All time", value: null }] as const).map(option =>
        <Pressable key={option.label} accessibilityRole="button" accessibilityState={{ selected: range === option.value }} onPress={() => { setRange(option.value); setSelectedDate(null); }} style={[styles.range, range === option.value && styles.rangeSelected]}><Text style={[styles.rangeText, range === option.value && styles.activeText]}>{option.label}</Text></Pressable>
      )}</View>
      {loading ? <ActivityIndicator accessibilityLabel="Loading weight progress" color="#216C50" />
        : error && !data ? <><Text style={styles.note} accessibilityRole="alert">Couldn’t load weight progress.</Text><Pressable accessibilityRole="button" onPress={refresh} style={styles.retry}><Text style={styles.activeText}>Try again</Text></Pressable></>
        : !latest ? <View style={styles.empty}><Text style={styles.emptyTitle}>{data?.weightHistory?.length ? "No weigh-ins in this period" : "Start your weight timeline"}</Text><Text style={styles.note}>{data?.weightHistory?.length ? "Choose a longer period to see earlier weigh-ins." : "Save your weight in Body measurements above. Add weigh-ins on different days to see your trend."}</Text></View>
        : <>
          <View style={styles.stats}>
            <View style={styles.stat}><Text style={styles.value}>{displayWeight(latest.weightKg, unit)} <Text style={styles.valueUnit}>{unit}</Text></Text><Text style={styles.label}>Latest · {shortDate(latest.date)}</Text></View>
            <View style={styles.stat}><Text style={styles.value}>{entries.length < 2 ? "—" : `${displayWeight(Math.abs(difference), unit)} ${unit}`}</Text><Text style={styles.label}>{entries.length < 2 ? "Add another weigh-in" : change === 0 ? "No change" : difference > 0 ? "Gained in this period" : "Lost in this period"}</Text></View>
          </View>
          <WeightChart entries={entries} unit={unit} onSelect={setSelectedDate} selectedDate={selected?.date} />
          {selected && <Text accessibilityLiveRegion="polite" style={styles.selected}>{shortDate(selected.date)}, {selected.date.slice(0, 4)} · {displayWeight(selected.weightKg, unit)} {unit}</Text>}
          <View style={styles.baseline}><Text style={styles.note}>Starting weight: {displayWeight(first.weightKg, unit)} {unit}</Text><Text style={styles.note}>{entries.length} {entries.length === 1 ? "weigh-in" : "weigh-ins"}</Text></View>
          <Pressable accessibilityRole="button" accessibilityState={{ expanded: showEntries }} onPress={() => setShowEntries(!showEntries)} style={styles.retry}><Text style={styles.activeText}>{showEntries ? "Hide weigh-ins" : "View weigh-ins"}</Text></Pressable>
          {showEntries && <ScrollView style={{ maxHeight: 180 }} nestedScrollEnabled>{[...entries].reverse().map(entry => <Pressable key={entry.date} accessibilityRole="button" accessibilityLabel={`${entry.date}, ${displayWeight(entry.weightKg, unit)} ${unit}`} onPress={() => setSelectedDate(entry.date)} style={styles.entry}><Text style={styles.note}>{shortDate(entry.date)}, {entry.date.slice(0, 4)}</Text><Text style={styles.activeText}>{displayWeight(entry.weightKg, unit)} {unit}</Text></Pressable>)}</ScrollView>}
          {entries.length === 1 && <Text style={styles.note}>Your first weigh-in is recorded. A trend appears after your next day’s entry.</Text>}
        </>}
      <Text style={styles.footnote}>One entry per day; saving again updates today. History stays on this device.</Text>
    </View>
  );
}

function WeightChart({ entries, unit, onSelect, selectedDate }: { entries: WeightEntry[]; unit: "kg" | "lb"; onSelect: (date: string) => void; selectedDate?: string }) {
  const width = 320, height = 170, left = 43, right = 303, top = 18, bottom = 139;
  const weights = entries.map(entry => unit === "lb" ? entry.weightKg / 0.45359237 : entry.weightKg);
  const min = Math.min(...weights), max = Math.max(...weights);
  const padding = Math.max((max - min) * 0.2, unit === "kg" ? 0.5 : 1);
  const low = min - padding, high = max + padding;
  const firstTime = calendarDate(entries[0].date).getTime(), lastTime = calendarDate(entries[entries.length - 1].date).getTime();
  const points = entries.map((entry, i) => ({ ...entry,
    x: firstTime === lastTime ? (left + right) / 2 : left + (calendarDate(entry.date).getTime() - firstTime) / (lastTime - firstTime) * (right - left),
    y: bottom - (weights[i] - low) / (high - low) * (bottom - top),
  }));
  const path = points.map((point, i) => `${i === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
  return (
    <View style={styles.chart}>
      <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
        {[0, 0.5, 1].map(fraction => {
          const y = bottom - fraction * (bottom - top);
          return <ViewGrid key={fraction} y={y} value={low + fraction * (high - low)} left={left} right={right} />;
        })}
        {points.length > 1 && <Path d={path} stroke="#216C50" strokeWidth={2.5} fill="none" />}
        {points.map(point => <Circle key={`dot-${point.date}`} cx={point.x} cy={point.y} r={point.date === selectedDate ? 5 : 3} fill="#216C50" stroke="#FFF" strokeWidth={1.5} />)}
        {points.map(point => <Circle key={point.date} cx={point.x} cy={point.y} r={15} fill="transparent" accessibilityLabel={`${point.date}, ${displayWeight(point.weightKg, unit)} ${unit}`} onPress={() => onSelect(point.date)} />)}
        <SvgText x={left} y={161} fontSize={10} fill="#65756C">{shortDate(entries[0].date)}</SvgText>
        {entries.length > 1 && <SvgText x={right} y={161} textAnchor="end" fontSize={10} fill="#65756C">{shortDate(entries[entries.length - 1].date)}</SvgText>}
      </Svg>
    </View>
  );
}
function ViewGrid({ y, value, left, right }: { y: number; value: number; left: number; right: number }) {
  return <><Line x1={left} x2={right} y1={y} y2={y} stroke="#E4EBE6" strokeDasharray="3 4" /><SvgText x={left - 8} y={y + 3} textAnchor="end" fill="#65756C" fontSize={10}>{value.toFixed(1)}</SvgText></>;
}

const styles = StyleSheet.create({
  card: { backgroundColor: "#FFF", borderWidth: 1, borderColor: "#E1E7E3", borderRadius: 18, padding: 18, marginBottom: 20 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  title: { fontSize: 20, fontWeight: "800", color: "#192D23", flexShrink: 1 },
  unitButton: { minHeight: 44, minWidth: 44, alignItems: "center", justifyContent: "center" },
  unitText: { color: "#216C50", fontSize: 13, fontWeight: "700" },
  ranges: { flexDirection: "row", gap: 6, backgroundColor: "#F3F7F4", borderRadius: 10, padding: 4, marginTop: 8, marginBottom: 18 },
  range: { flex: 1, minHeight: 40, alignItems: "center", justifyContent: "center", borderRadius: 7 },
  rangeSelected: { backgroundColor: "#DDEDE2" },
  rangeText: { color: "#65756C", fontSize: 12, fontWeight: "600" },
  activeText: { color: "#216C50", fontWeight: "700" },
  stats: { flexDirection: "row", gap: 12 },
  stat: { flex: 1 },
  value: { fontSize: 24, fontWeight: "800", color: "#216C50" },
  valueUnit: { fontSize: 13, fontWeight: "600" },
  label: { fontSize: 11, color: "#65756C", marginTop: 5 },
  chart: { marginTop: 14 },
  selected: { fontSize: 12, fontWeight: "600", color: "#216C50", textAlign: "center", marginBottom: 10 },
  baseline: { flexDirection: "row", justifyContent: "space-between", flexWrap: "wrap", gap: 6, paddingTop: 12, borderTopWidth: 1, borderTopColor: "#E8EDE9", marginBottom: 8 },
  note: { color: "#65756C", fontSize: 12, lineHeight: 18 },
  empty: { paddingVertical: 15, gap: 8 },
  emptyTitle: { fontSize: 15, color: "#263C30", fontWeight: "700" },
  footnote: { fontSize: 10, color: "#65756C", lineHeight: 15, marginTop: 12 },
  entry: { minHeight: 44, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, borderBottomWidth: 1, borderBottomColor: "#E8EDE9" },
  retry: { minHeight: 44, justifyContent: "center" },
});
