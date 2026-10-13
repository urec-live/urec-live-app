import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

interface Props {
  workoutDates: string[]; // ISO date strings e.g. "2026-04-28"
}

const WEEK_COUNT = 52;
const DAY_SIZE = 11;
const DAY_GAP = 2;
const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

function colorForCount(count: number): string {
  if (count === 0) return '#f0f0f0';
  if (count === 1) return '#A5D6A7';
  if (count === 2) return '#4CAF50';
  return '#1B5E20';
}

function getMonday(d: Date): Date {
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function toDateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export default function StreakCalendar({ workoutDates }: Props) {
  const dateCountMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const d of workoutDates) {
      map[d] = (map[d] ?? 0) + 1;
    }
    return map;
  }, [workoutDates]);

  // Build 52 weeks × 7 days grid ending on the current week
  const weeks = useMemo(() => {
    const today = new Date();
    const currentMonday = getMonday(today);
    const startMonday = new Date(currentMonday);
    startMonday.setDate(currentMonday.getDate() - (WEEK_COUNT - 1) * 7);

    const result: string[][] = [];
    const cursor = new Date(startMonday);
    for (let w = 0; w < WEEK_COUNT; w++) {
      const week: string[] = [];
      for (let d = 0; d < 7; d++) {
        week.push(toDateKey(cursor));
        cursor.setDate(cursor.getDate() + 1);
      }
      result.push(week);
    }
    return result;
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Workout Calendar</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.grid}>
          {/* Day labels column */}
          <View style={styles.dayLabels}>
            {DAYS.map((label, i) => (
              <Text key={i} style={styles.dayLabel}>{label}</Text>
            ))}
          </View>
          {/* Week columns */}
          <View style={styles.weeksRow}>
            {weeks.map((week, wi) => (
              <View key={wi} style={styles.weekCol}>
                {week.map((dateKey, di) => (
                  <View
                    key={di}
                    style={[
                      styles.cell,
                      { backgroundColor: colorForCount(dateCountMap[dateKey] ?? 0) },
                    ]}
                  />
                ))}
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
      <View style={styles.legend}>
        <Text style={styles.legendLabel}>Less</Text>
        {[0, 1, 2, 3].map(n => (
          <View key={n} style={[styles.legendCell, { backgroundColor: colorForCount(n) }]} />
        ))}
        <Text style={styles.legendLabel}>More</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  grid: {
    flexDirection: 'row',
  },
  dayLabels: {
    marginRight: 4,
    justifyContent: 'space-between',
    paddingVertical: 1,
  },
  dayLabel: {
    fontSize: 8,
    color: '#999',
    height: DAY_SIZE + DAY_GAP,
    lineHeight: DAY_SIZE,
  },
  weeksRow: {
    flexDirection: 'row',
    gap: DAY_GAP,
  },
  weekCol: {
    gap: DAY_GAP,
  },
  cell: {
    width: DAY_SIZE,
    height: DAY_SIZE,
    borderRadius: 2,
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
    alignSelf: 'flex-end',
  },
  legendCell: {
    width: 10,
    height: 10,
    borderRadius: 2,
  },
  legendLabel: {
    fontSize: 10,
    color: '#999',
  },
});
