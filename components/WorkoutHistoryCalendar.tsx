import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { DailyWorkout } from "@/contexts/WorkoutContext";
import { briefDuration, calendarDate, dateKey, monthWeeks, summarizeWeek, weekHistory, weekLabel } from "@/utils/historyCalendar";

interface Props {
  history: DailyWorkout[];
  month: string;
  selectedWeek: string;
  onSelectWeek: (start: string) => void;
  onChangeMonth: (month: string) => void;
  onToday: () => void;
}

export default function WorkoutHistoryCalendar({ history, month, selectedWeek, onSelectWeek, onChangeMonth, onToday }: Props) {
  const workoutDates = new Set(history.filter(day => day.sessions.length > 0).map(day => day.date));
  const today = dateKey(new Date());
  const moveMonth = (offset: number) => {
    const date = calendarDate(month);
    onChangeMonth(dateKey(new Date(date.getFullYear(), date.getMonth() + offset, 1, 12)));
  };
  return (
    <View style={styles.calendar}>
      <View style={styles.toolbar}>
        <View>
          <Text style={styles.month}>{calendarDate(month).toLocaleDateString("en-US", { month: "long", year: "numeric" })}</Text>
          <View style={styles.legend}>
            <MaterialCommunityIcons name="lightning-bolt" size={15} color="#B57806" />
            <Text style={styles.legendText}>Workout day</Text>
          </View>
        </View>
        <View style={styles.navigation}>
          <Pressable accessibilityRole="button" accessibilityLabel="Previous month" onPress={() => moveMonth(-1)} style={styles.arrow}>
            <MaterialCommunityIcons name="chevron-left" size={25} color="#216C50" />
          </Pressable>
          <Pressable accessibilityRole="button" onPress={onToday} style={styles.todayButton}><Text style={styles.todayText}>Today</Text></Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Next month" onPress={() => moveMonth(1)} style={styles.arrow}>
            <MaterialCommunityIcons name="chevron-right" size={25} color="#216C50" />
          </Pressable>
        </View>
      </View>
      <View style={styles.weekdays}>{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => <Text key={day} style={styles.weekday}>{day}</Text>)}</View>
      {monthWeeks(month).map(week => {
        const selected = week[0] === selectedWeek;
        const summary = summarizeWeek(weekHistory(history, week[0]));
        const muscleGroupLabel = `${summary.muscleGroups.length} muscle ${summary.muscleGroups.length === 1 ? "group" : "groups"}`;
        return (
          <View key={week[0]} style={[styles.week, selected && styles.selectedWeek]}>
            <Pressable accessibilityRole="button" accessibilityLabel={`Week ${weekLabel(week[0])}: ${summary.days} workout days, ${muscleGroupLabel}, ${briefDuration(summary.seconds)}`} accessibilityState={{ selected }} onPress={() => onSelectWeek(week[0])} style={styles.weekBrief}>
              <Text style={[styles.weekCount, selected && styles.selectedText]}>{summary.days} {summary.days === 1 ? "day" : "days"}</Text>
              <Text style={styles.briefText}>{muscleGroupLabel}</Text>
              <View style={styles.time}><MaterialCommunityIcons name="timer-outline" size={13} color="#65756C" /><Text style={styles.briefText}>{briefDuration(summary.seconds)}</Text></View>
              <MaterialCommunityIcons name={selected ? "check-circle" : "chevron-down"} size={15} color={selected ? "#216C50" : "#839088"} />
            </Pressable>
            <View style={styles.dates}>{week.map(key => {
              const workedOut = workoutDates.has(key);
              const isToday = key === today;
              const outside = key.slice(0, 7) !== month.slice(0, 7);
              return (
                <Pressable key={key} accessibilityRole="button" accessibilityLabel={`${calendarDate(key).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}${workedOut ? ", workout day" : ""}${isToday ? ", today" : ""}`} accessibilityHint="Show this week's workout details" accessibilityState={{ selected }} onPress={() => onSelectWeek(week[0])} style={styles.dateCell}>
                  <View style={[styles.dateCircle, workedOut && styles.workoutCircle, isToday && styles.todayCircle]}>
                    <Text style={[styles.dateNumber, outside && styles.outside, isToday && styles.todayNumber]}>{calendarDate(key).getDate()}</Text>
                    {workedOut && <MaterialCommunityIcons name="lightning-bolt" size={16} color={isToday ? "#FFE29A" : "#B57806"} />}
                  </View>
                </Pressable>
              );
            })}</View>
          </View>
        );
      })}
      <Text style={styles.hint}>Tap a week to explore your workouts</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  calendar: { backgroundColor: "#FFF", borderWidth: 1, borderColor: "#E1E7E3", borderRadius: 22, padding: 12, marginBottom: 24 },
  toolbar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 6, paddingHorizontal: 4, marginBottom: 18 },
  month: { color: "#192D23", fontSize: 20, fontWeight: "800" },
  legend: { flexDirection: "row", alignItems: "center", gap: 3, marginTop: 5 },
  legendText: { fontSize: 12, color: "#65756C" },
  navigation: { flexDirection: "row", alignItems: "center" },
  arrow: { width: 36, minHeight: 44, alignItems: "center", justifyContent: "center" },
  todayButton: { minHeight: 44, justifyContent: "center", paddingHorizontal: 8 },
  todayText: { fontSize: 12, fontWeight: "700", color: "#216C50" },
  weekdays: { flexDirection: "row", marginBottom: 8 },
  weekday: { flex: 1, textAlign: "center", fontSize: 11, fontWeight: "600", color: "#65756C" },
  week: { borderRadius: 12, borderWidth: 1, borderColor: "transparent", paddingHorizontal: 3, marginBottom: 3 },
  selectedWeek: { backgroundColor: "#EEF6F0", borderColor: "#B9D5C4" },
  weekBrief: { minHeight: 32, paddingHorizontal: 7, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 4, borderBottomWidth: 1, borderBottomColor: "#E8EDE9" },
  weekCount: { fontSize: 11, fontWeight: "700", color: "#65756C" },
  selectedText: { color: "#216C50" },
  briefText: { fontSize: 11, color: "#65756C" },
  time: { flexDirection: "row", alignItems: "center", gap: 3 },
  dates: { flexDirection: "row", paddingVertical: 3 },
  dateCell: { flex: 1, alignItems: "center", justifyContent: "center", minHeight: 49 },
  dateCircle: { width: "100%", maxWidth: 40, minHeight: 43, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  workoutCircle: { backgroundColor: "#FFF3CF" },
  todayCircle: { backgroundColor: "#216C50" },
  dateNumber: { fontSize: 14, fontWeight: "600", color: "#263C30" },
  outside: { color: "#97A29C" },
  todayNumber: { color: "#FFF", fontWeight: "800" },
  hint: { color: "#65756C", fontSize: 11, textAlign: "center", marginTop: 10, marginBottom: 2 },
});
