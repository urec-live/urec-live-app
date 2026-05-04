import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { BadgeEntry } from '@/services/badgeAPI';

interface BadgeDef {
  type: string;
  label: string;
  days: number;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  color: string;
}

const BADGE_DEFS: BadgeDef[] = [
  { type: 'STREAK_7',   label: '7-Day Streak',   days: 7,   icon: 'fire',   color: '#FF6B35' },
  { type: 'STREAK_30',  label: '30-Day Streak',  days: 30,  icon: 'star',   color: '#FFB800' },
  { type: 'STREAK_100', label: '100-Day Streak', days: 100, icon: 'medal',  color: '#4CAF50' },
  { type: 'STREAK_365', label: '365-Day Streak', days: 365, icon: 'crown',  color: '#9C27B0' },
];

interface Props {
  earned: BadgeEntry[];
}

export default function BadgeGrid({ earned }: Props) {
  const earnedTypes = new Set(earned.map(b => b.badgeType));

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Achievements</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {BADGE_DEFS.map(def => {
          const isEarned = earnedTypes.has(def.type);
          return (
            <View key={def.type} style={[styles.badge, !isEarned && styles.badgeLocked]}>
              <View style={[styles.iconCircle, { backgroundColor: isEarned ? def.color : '#ccc' }]}>
                <MaterialCommunityIcons name={def.icon} size={22} color="#fff" />
                {!isEarned && (
                  <View style={styles.lockOverlay}>
                    <MaterialCommunityIcons name="lock" size={12} color="rgba(255,255,255,0.9)" />
                  </View>
                )}
              </View>
              <Text style={[styles.badgeLabel, !isEarned && styles.badgeLabelLocked]}>
                {def.label}
              </Text>
            </View>
          );
        })}
      </ScrollView>
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
  row: {
    gap: 16,
    paddingRight: 4,
  },
  badge: {
    alignItems: 'center',
    width: 72,
  },
  badgeLocked: {
    opacity: 0.6,
  },
  iconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  lockOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 8,
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#1a1a1a',
    textAlign: 'center',
  },
  badgeLabelLocked: {
    color: '#aaa',
  },
});
