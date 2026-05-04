import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { socialAPI, PublicProfileResponse } from "@/services/socialAPI";
import { planAPI, WorkoutPlanResponse } from "@/services/planAPI";
import { usePlan } from "@/contexts/PlanContext";

export default function PublicProfile() {
  const { username } = useLocalSearchParams<{ username: string }>();
  const router = useRouter();
  const { refreshActivePlan } = usePlan();

  const [profile, setProfile] = useState<PublicProfileResponse | null>(null);
  const [publicPlans, setPublicPlans] = useState<WorkoutPlanResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!username) return;
    const load = async () => {
      try {
        const [profileData, plansData] = await Promise.all([
          socialAPI.getPublicProfile(username),
          planAPI.getPublicPlans(username).catch(() => [] as WorkoutPlanResponse[]),
        ]);
        setProfile(profileData);
        setPublicPlans(plansData);
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [username]);

  const handleCopyPlan = async (planId: number, planName: string) => {
    try {
      await planAPI.copyPlan(planId);
      await refreshActivePlan();
      Alert.alert("Plan Copied", `"${planName}" has been added to your plans.`);
    } catch {
      Alert.alert("Error", "Could not copy plan. Please try again.");
    }
  };

  return (
    <LinearGradient colors={["#ffffff", "#f5f5f5", "#ffffff"]} style={{ flex: 1 }}>
      {/* Header */}
      <View style={styles.navHeader}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#1a1a1a" />
        </Pressable>
        <Text style={styles.navTitle}>{username}</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#4CAF50" />
        </View>
      ) : notFound ? (
        <View style={styles.center}>
          <MaterialCommunityIcons name="lock-outline" size={48} color="#ccc" />
          <Text style={styles.notFoundTitle}>Profile is private</Text>
          <Text style={styles.notFoundSub}>This profile is private or does not exist.</Text>
        </View>
      ) : profile ? (
        <ScrollView contentContainerStyle={styles.content}>
          {/* User header */}
          <View style={styles.userSection}>
            <MaterialCommunityIcons name="account-circle" size={64} color="#4CAF50" />
            <Text style={styles.username}>{profile.username}</Text>
            {profile.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}
          </View>

          {/* Streak stats */}
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <MaterialCommunityIcons name="fire" size={22} color="#FF6B35" />
              <Text style={styles.statValue}>{profile.currentStreak}</Text>
              <Text style={styles.statLabel}>Current Streak</Text>
            </View>
            <View style={styles.statCard}>
              <MaterialCommunityIcons name="trophy" size={22} color="#FFB800" />
              <Text style={styles.statValue}>{profile.longestStreak}</Text>
              <Text style={styles.statLabel}>Best Streak</Text>
            </View>
          </View>

          {/* Recent muscle groups */}
          {profile.recentMuscleGroups.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Recent Training</Text>
              <View style={styles.chipRow}>
                {profile.recentMuscleGroups.map(group => (
                  <View key={group} style={styles.chip}>
                    <Text style={styles.chipText}>{group}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Top PRs */}
          {profile.topPRs.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Personal Records</Text>
              <View style={styles.prContainer}>
                {profile.topPRs.map(pr => (
                  <View key={pr.exerciseName} style={styles.prRow}>
                    <Text style={styles.prExercise}>{pr.exerciseName}</Text>
                    <Text style={styles.prWeight}>{pr.maxWeightLbs} lbs</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Public plans */}
          {publicPlans.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Shared Plans</Text>
              {publicPlans.map(plan => (
                <View key={plan.id} style={styles.planRow}>
                  <View style={styles.planInfo}>
                    <MaterialCommunityIcons name="calendar-check" size={20} color="#4CAF50" />
                    <Text style={styles.planName}>{plan.name}</Text>
                  </View>
                  <Pressable
                    style={styles.copyBtn}
                    onPress={() => handleCopyPlan(plan.id, plan.name)}
                  >
                    <MaterialCommunityIcons name="content-copy" size={16} color="#fff" />
                    <Text style={styles.copyBtnText}>Copy</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      ) : null}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  navHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 30,
    paddingBottom: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  navTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1a1a1a",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 40,
  },
  notFoundTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#666",
  },
  notFoundSub: {
    fontSize: 14,
    color: "#aaa",
    textAlign: "center",
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  userSection: {
    alignItems: "center",
    marginBottom: 20,
  },
  username: {
    fontSize: 22,
    fontWeight: "900",
    color: "#1a1a1a",
    marginTop: 8,
  },
  bio: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
    textAlign: "center",
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  statValue: {
    fontSize: 28,
    fontWeight: "900",
    color: "#1a1a1a",
  },
  statLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#888",
    textAlign: "center",
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#999",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    backgroundColor: "#e8f5e9",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#2e7d32",
  },
  prContainer: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    overflow: "hidden",
  },
  prRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  prExercise: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1a1a1a",
  },
  prWeight: {
    fontSize: 14,
    fontWeight: "700",
    color: "#4CAF50",
  },
  planRow: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    marginBottom: 8,
  },
  planInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  planName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1a1a1a",
  },
  copyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#4CAF50",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  copyBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#fff",
  },
});
