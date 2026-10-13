import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import LeagueCard from "../../components/LeagueCard";
import { leagueAPI, LeagueInfoResponse, LeaderboardResponse } from "@/services/leagueAPI";

function formatVolume(lbs: number): string {
  if (lbs >= 1000) return `${(lbs / 1000).toFixed(1)}K`;
  return String(Math.round(lbs));
}

export default function League() {
  const router = useRouter();
  const [leagueInfo, setLeagueInfo] = useState<LeagueInfoResponse | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      const load = async () => {
        try {
          const [info, board] = await Promise.all([
            leagueAPI.getMyLeagueInfo(),
            leagueAPI.getLeaderboard(),
          ]);
          if (!cancelled) {
            setLeagueInfo(info);
            setLeaderboard(board);
          }
        } catch {
          // silently handle
        } finally {
          if (!cancelled) setLoading(false);
        }
      };
      setLoading(true);
      load();
      return () => { cancelled = true; };
    }, [])
  );

  const noWorkouts = leagueInfo?.weeklyScore === 0;

  return (
    <LinearGradient colors={["#ffffff", "#f5f5f5", "#ffffff"]} style={{ flex: 1 }}>
      <View style={styles.header}>
        <MaterialCommunityIcons name="trophy" size={24} color="#4CAF50" />
        <Text style={styles.headerTitle}>Leagues</Text>
        <Pressable style={styles.chatBtn} onPress={() => router.push("/chat/community" as any)}>
          <MaterialCommunityIcons name="chat-outline" size={22} color="#4CAF50" />
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#4CAF50" />
        </View>
      ) : (
        <FlatList
          contentContainerStyle={styles.content}
          ListHeaderComponent={
            <>
              {leagueInfo && <LeagueCard info={leagueInfo} />}

              {noWorkouts && (
                <View style={styles.emptyBanner}>
                  <MaterialCommunityIcons name="dumbbell" size={20} color="#4CAF50" />
                  <Text style={styles.emptyText}>
                    Log a session this week to join the competition!
                  </Text>
                </View>
              )}

              <Text style={styles.sectionLabel}>
                {leaderboard?.tier ?? "—"} Leaderboard
              </Text>
            </>
          }
          data={leaderboard?.entries ?? []}
          keyExtractor={(_, i) => String(i)}
          renderItem={({ item }) => (
            <Pressable
              style={[styles.row, item.me && styles.rowMe]}
              onPress={() => router.push(`/users/${item.username}` as any)}
            >
              <Text style={[styles.rankNum, item.me && styles.rankNumMe]}>
                #{item.rank}
              </Text>
              <Text style={[styles.rowUsername, item.me && styles.rowUsernameMe]} numberOfLines={1}>
                {item.username}{item.me ? " (you)" : ""}
              </Text>
              <Text style={[styles.rowScore, item.me && styles.rowScoreMe]}>
                {formatVolume(item.weeklyScore)} lbs
              </Text>
            </Pressable>
          )}
          ListFooterComponent={
            leaderboard?.myEntry && !leaderboard.entries.some(e => e.me) ? (
              <View style={styles.myRowSeparator}>
                <Text style={styles.separatorText}>· · ·</Text>
                <View style={[styles.row, styles.rowMe]}>
                  <Text style={[styles.rankNum, styles.rankNumMe]}>
                    #{leaderboard.myEntry.rank}
                  </Text>
                  <Text style={[styles.rowUsername, styles.rowUsernameMe]} numberOfLines={1}>
                    {leaderboard.myEntry.username} (you)
                  </Text>
                  <Text style={[styles.rowScore, styles.rowScoreMe]}>
                    {formatVolume(leaderboard.myEntry.weeklyScore)} lbs
                  </Text>
                </View>
              </View>
            ) : null
          }
        />
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 30,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "900",
    color: "#1a1a1a",
    flex: 1,
  },
  chatBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#e8f5e9",
    borderRadius: 20,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  emptyBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#e8f5e9",
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  emptyText: {
    flex: 1,
    fontSize: 13,
    color: "#2e7d32",
    fontWeight: "600",
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#999",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  rowMe: {
    borderColor: "#4CAF50",
    backgroundColor: "#f1f8f1",
  },
  rankNum: {
    fontSize: 14,
    fontWeight: "700",
    color: "#999",
    width: 36,
  },
  rankNumMe: {
    color: "#4CAF50",
  },
  rowUsername: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: "#1a1a1a",
  },
  rowUsernameMe: {
    color: "#2e7d32",
  },
  rowScore: {
    fontSize: 14,
    fontWeight: "700",
    color: "#666",
  },
  rowScoreMe: {
    color: "#4CAF50",
  },
  myRowSeparator: {
    alignItems: "center",
    gap: 6,
  },
  separatorText: {
    fontSize: 16,
    color: "#ccc",
    letterSpacing: 4,
    marginBottom: 4,
  },
});
