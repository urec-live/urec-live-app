import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { LeagueInfoResponse } from '@/services/leagueAPI';

const TIER_COLORS: Record<string, string> = {
  BRONZE:   '#CD7F32',
  SILVER:   '#A0A0A0',
  GOLD:     '#FFD700',
  PLATINUM: '#E8E8E8',
};

const TIER_TEXT_COLORS: Record<string, string> = {
  BRONZE:   '#fff',
  SILVER:   '#fff',
  GOLD:     '#1a1a1a',
  PLATINUM: '#1a1a1a',
};

function formatVolume(lbs: number): string {
  if (lbs >= 1000) return `${(lbs / 1000).toFixed(1)}K`;
  return String(Math.round(lbs));
}

interface Props {
  info: LeagueInfoResponse;
}

export default function LeagueCard({ info }: Props) {
  const tierColor = TIER_COLORS[info.tier] ?? '#CD7F32';
  const textColor = TIER_TEXT_COLORS[info.tier] ?? '#fff';

  const progressPct = info.nextTierThreshold
    ? Math.min((info.weeklyScore / info.nextTierThreshold) * 100, 100)
    : 100;

  return (
    <View style={[styles.card, { backgroundColor: tierColor }]}>
      <View style={styles.header}>
        <Text style={[styles.tierName, { color: textColor }]}>{info.tier}</Text>
        <Text style={[styles.score, { color: textColor }]}>
          {formatVolume(info.weeklyScore)} lbs
        </Text>
      </View>

      <Text style={[styles.rank, { color: textColor }]}>
        {info.rankInTier != null
          ? `Rank #${info.rankInTier} of ${info.totalInTier}`
          : `${info.totalInTier} active this week`}
      </Text>

      {info.nextTierThreshold != null && (
        <View style={styles.progressSection}>
          <View style={styles.progressBg}>
            <View style={[styles.progressFill, { width: `${progressPct}%` as any }]} />
          </View>
          <Text style={[styles.progressLabel, { color: textColor }]}>
            {formatVolume(info.nextTierThreshold - info.weeklyScore)} lbs to next tier
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  tierName: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 1,
  },
  score: {
    fontSize: 18,
    fontWeight: '700',
  },
  rank: {
    fontSize: 14,
    fontWeight: '600',
    opacity: 0.85,
    marginBottom: 12,
  },
  progressSection: {
    gap: 4,
  },
  progressBg: {
    height: 6,
    backgroundColor: 'rgba(0,0,0,0.15)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: 3,
  },
  progressLabel: {
    fontSize: 11,
    fontWeight: '600',
    opacity: 0.8,
  },
});
