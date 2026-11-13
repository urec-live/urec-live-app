import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Line, Polyline, Text as SvgText } from "react-native-svg";
import { formatValue } from "@/utils/exerciseInsights";

export default function ExerciseProgressChart({ points, unit }: { points: { date: string; value: number }[]; unit: string }) {
  const [selected, setSelected] = useState(points.length - 1);
  useEffect(() => { setSelected(points.length - 1); }, [points]);
  const [containerWidth, setContainerWidth] = useState(300);
  if (!points.length) return <View style={s.empty}><Text style={s.emptyTitle}>Your progress starts here</Text><Text style={s.caption}>No recorded values in this range. Complete an exercise or choose a wider range.</Text></View>;
  const index = Math.max(0, Math.min(selected, points.length - 1));
  const current = points[index];
  const width = Math.max(containerWidth, points.length * 64 + 64);
  const left = 55, right = 24, top = 18, bottom = 170;
  const min = Math.min(...points.map(p => p.value));
  const max = Math.max(...points.map(p => p.value));
  const low = Math.max(0, min - (max - min || max || 1) * 0.15);
  const high = max + (max - min || max || 1) * 0.15;
  const x = (i: number) => points.length === 1 ? (width + left - right) / 2 : left + i * (width - left - right) / (points.length - 1);
  const y = (value: number) => bottom - (value - low) / (high - low) * (bottom - top);
  const dateLabel = (date: string) => new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return <View onLayout={event => setContainerWidth(event.nativeEvent.layout.width)}>
    <View style={s.readout}><Text style={s.value}>{formatValue(current.value)} <Text style={s.caption}>{unit}</Text></Text><Text style={s.caption}>{new Date(current.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</Text></View>
    <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={{ flexGrow: 1 }}>
      <View>
        <Svg width={width} height={205} accessibilityLabel="Exercise progress chart">
          {[0, 1, 2, 3].map(i => {
            const value = low + (high - low) * i / 3;
            return <React.Fragment key={i}><Line x1={left} x2={width - right} y1={y(value)} y2={y(value)} stroke="#E1E7E3" /><SvgText x={left - 8} y={y(value) + 4} fill="#6C7C75" textAnchor="end" fontSize={10}>{formatValue(value)}</SvgText></React.Fragment>;
          })}
          <Polyline points={points.map((p, i) => `${x(i)},${y(p.value)}`).join(" ")} fill="none" stroke="#216C50" strokeWidth={2.5} />
          <Line x1={x(index)} x2={x(index)} y1={top} y2={bottom} stroke="#216C50" strokeDasharray="4 4" opacity={0.4} />
          {points.map((point, i) => <React.Fragment key={point.date}>
            <Circle cx={x(i)} cy={y(point.value)} r={i === index ? 7 : 4} fill="#216C50" />
            <Circle cx={x(i)} cy={y(point.value)} r={20} fill="transparent" onPress={() => setSelected(i)} />
            <SvgText x={x(i)} y={194} fill="#6C7C75" textAnchor="middle" fontSize={10}>{dateLabel(point.date)}</SvgText>
          </React.Fragment>)}
        </Svg>
      </View>
    </ScrollView>
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      {points.map((point, i) => <Pressable key={point.date} accessibilityRole="button" accessibilityLabel={`View ${dateLabel(point.date)}: ${formatValue(point.value)} ${unit}`} accessibilityState={{ selected: index === i }} onPress={() => setSelected(i)} style={[s.point, index === i && s.selected]}><Text style={s.caption}>{dateLabel(point.date)}</Text></Pressable>)}
    </ScrollView>
  </View>;
}
const s = StyleSheet.create({
  readout: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16, gap: 10 },
  value: { fontSize: 25, fontWeight: "800", color: "#1B3029" },
  caption: { fontSize: 12, color: "#6C7C75", lineHeight: 20 },
  point: { padding: 9, borderRadius: 8, marginRight: 6 },
  selected: { backgroundColor: "#E8F1EB" },
  empty: { paddingVertical: 35, alignItems: "center", gap: 10 },
  emptyTitle: { color: "#1B3029", fontSize: 18, fontWeight: "700" },
});
