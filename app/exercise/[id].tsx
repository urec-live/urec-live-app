import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Platform, Pressable, ScrollView, Share, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { Link, useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { exerciseMediaUrl } from "@/utils/exerciseMedia";
import { exerciseAPI } from "@/services/exerciseAPI";
import { useWorkout } from "@/contexts/WorkoutContext";
import { useGym } from "@/contexts/GymContext";
import { useAuth } from "@/contexts/AuthContext";
import { useCachedResource } from "@/hooks/useCachedResource";
import { cacheKeys, fetchExerciseHistory, STALE_MS } from "@/services/cachedResources";
import { chartPoints, exerciseSessions, formatSet, formatValue, metricLabels, metricsFor, metricUnit, personalRecords, setRecords, Metric } from "@/utils/exerciseInsights";
import PinnedExerciseNote from "@/components/exercise/PinnedExerciseNote";
import ExerciseProgressChart from "@/components/exercise/ExerciseProgressChart";

const ranges = [{ label: "3 months", months: 3 }, { label: "6 months", months: 6 }, { label: "1 year", months: 12 }, { label: "All time", months: null }];
const pretty = (value: string) => value.toLowerCase().replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());

export default function ExerciseDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { gym } = useGym();
  const { user } = useAuth();
  const { currentSession, checkIn } = useWorkout();
  const exerciseId = Number(id);
  const validId = Number.isSafeInteger(exerciseId) && exerciseId > 0;
  const detail = useCachedResource(user && validId ? cacheKeys.exerciseDetail(user.username, exerciseId) : null, () => exerciseAPI.get(exerciseId), { staleTime: STALE_MS.catalog });
  const history = useCachedResource(user && validId ? cacheKeys.exerciseHistory(user.username) : null, fetchExerciseHistory, { staleTime: STALE_MS.user });
  const revalidateDetail = detail.revalidate;
  const revalidateHistory = history.revalidate;
  useFocusEffect(useCallback(() => { revalidateDetail(); revalidateHistory(); }, [revalidateDetail, revalidateHistory]));
  useEffect(() => { revalidateHistory(); }, [currentSession?.startTime, revalidateHistory]);
  const exercise = detail.data;
  const mediaUrl = exerciseMediaUrl(exercise?.gifUrl);
  const wide = useWindowDimensions().width >= 1000;
  const [guideOpen, setGuideOpen] = useState(false);
  const [rangeOpen, setRangeOpen] = useState(false);
  const [metric, setMetric] = useState<Metric | null>(null);
  const [range, setRange] = useState(0);
  const [recordsOpen, setRecordsOpen] = useState(false);
  const [recordInfo, setRecordInfo] = useState(false);
  const [visibleSessions, setVisibleSessions] = useState(3);
  const [expandedSession, setExpandedSession] = useState<number | null>(null);
  const [mediaPaused, setMediaPaused] = useState(false);
  const [failedMedia, setFailedMedia] = useState<string | null>(null);
  const [shareMessage, setShareMessage] = useState("");
  const sessions = useMemo(() => exercise ? exerciseSessions(history.data || [], exercise) : [], [history.data, exercise]);
  const metrics = exercise ? metricsFor(exercise.loggingMode) : [];
  const activeMetric = metric && metrics.includes(metric) ? metric : metrics[0] || "weight";
  const points = useMemo(() => chartPoints(sessions, activeMetric, ranges[range].months), [sessions, activeMetric, range]);
  const records = useMemo(() => exercise ? personalRecords(sessions, exercise.loggingMode) : [], [exercise, sessions]);
  const repRecords = useMemo(() => setRecords(sessions), [sessions]);
  const steps = exercise?.instructions?.split(/\n+|[.!?]\s+/).map(step => step.trim().replace(/^\d+[.)]\s*/, "")).filter(Boolean) || [];
  const share = async () => {
    if (!exercise) return;
    const message = `${exercise.name}\nPrimary: ${exercise.muscleGroup}\nEquipment: ${pretty(exercise.equipmentType)}${exercise.instructions ? "\n\n" + exercise.instructions : ""}`;
    try {
      if (Platform.OS === "web") {
        if (navigator.share) await navigator.share({ title: exercise.name, text: message });
        else if (navigator.clipboard) { await navigator.clipboard.writeText(message); setShareMessage("Exercise details copied."); }
        else setShareMessage("Sharing isn’t available in this browser.");
      } else await Share.share({ title: exercise.name, message });
    } catch (error) {
      if (!(error instanceof Error && error.name === "AbortError")) setShareMessage("Couldn’t share. Please try again.");
    }
  };
  return <View style={s.page}>
    <ScrollView contentContainerStyle={[s.content, { paddingBottom: currentSession ? 460 : 40 }]} keyboardShouldPersistTaps="handled">
      <View style={s.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back to exercises" onPress={() => router.canGoBack() ? router.back() : router.replace("/workout")} style={s.back}>
          <MaterialCommunityIcons name="arrow-left" size={20} color="#315547" /><Text style={s.link}>Exercise library</Text>
        </Pressable>
        {exercise && <Pressable accessibilityRole="button" accessibilityLabel="Share exercise" onPress={() => void share()} style={s.iconButton}><MaterialCommunityIcons name="share-variant-outline" size={21} color="#315547" /></Pressable>}
      </View>
      {!!shareMessage && <Text accessibilityLiveRegion="polite" style={s.muted}>{shareMessage}</Text>}
      {!validId && <Text style={s.error}>This exercise link is invalid. Return to the exercise library.</Text>}
      {detail.loading && <ActivityIndicator color="#216C50" style={{ margin: 40 }} />}
      {!!detail.error && <View style={s.card}><Text style={s.error}>Couldn’t load exercise details. Check your connection.</Text><Pressable onPress={() => void detail.refresh()}><Text style={s.link}>Retry exercise</Text></Pressable></View>}
      {exercise && <>
        <View style={[s.hero, wide && s.heroWide]}>
          <View style={s.heroCopy}>
            <View style={s.heroType}><MaterialCommunityIcons name={exercise.trainingType === "CARDIO" ? "heart-pulse" : exercise.trainingType === "MOBILITY" ? "yoga" : "dumbbell"} size={20} color="#CAE4D7" /><Text style={s.heroTypeText}>{pretty(exercise.trainingType)}{exercise.custom ? " · Your exercise" : ""}</Text></View>
            <Text accessibilityRole="header" style={s.title}>{exercise.name}</Text>
            <View style={s.heroFacts}><Text style={s.heroFact}>{exercise.muscleGroup}</Text><View style={s.factDot} /><Text style={s.heroFact}>{pretty(exercise.equipmentType)}</Text></View>
          </View>
          <View style={[s.launch, wide && s.launchWide]}>
            <Pressable accessibilityRole="button" style={[s.start, !!currentSession && s.disabled]} disabled={!!currentSession} onPress={() => checkIn(exercise.name, undefined, exercise.muscleGroup, exercise.id, exercise.loggingMode)}>
              <Text style={s.startText}>{currentSession ? "Exercise in progress" : "Start exercise"}</Text>
              <MaterialCommunityIcons name={currentSession ? "timer-sand" : "arrow-top-right"} size={23} color="#193F32" />
            </Pressable>
            <Text style={s.launchHint}>{currentSession ? "Finish your current exercise before starting another." : sessions.length ? `Last trained ${new Date(sessions[0].startedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : "Ready when you are."}</Text>
          </View>
        </View>

        <View style={[s.workspace, wide && s.workspaceWide]}>
          <View style={s.mainColumn}>
            {!!history.error && <View style={s.card}><Text style={s.error}>Couldn’t refresh workout history.{history.data ? " Showing saved workouts." : ""}</Text><Pressable onPress={() => void history.refresh()}><Text style={s.link}>Retry history</Text></Pressable></View>}
            <View style={s.progressPanel}>
              <View style={s.heading}><View style={{ flex: 1 }}><Text style={s.sectionTitle}>Progress over time</Text><Text style={s.caption}>{sessions.length} completed workout{sessions.length === 1 ? "" : "s"}</Text></View>
                <Pressable accessibilityRole="button" accessibilityLabel="Choose progress date range" accessibilityState={{ expanded: rangeOpen }} onPress={() => setRangeOpen(!rangeOpen)} style={s.rangeButton}><Text style={s.link}>{ranges[range].label}</Text><MaterialCommunityIcons name="chevron-down" size={18} color="#315547" /></Pressable>
              </View>
              {rangeOpen && <View style={s.rangeOptions}>{ranges.map((value, index) => <Pressable key={value.label} accessibilityRole="button" accessibilityState={{ selected: index === range }} onPress={() => { setRange(index); setRangeOpen(false); }} style={[s.rangeOption, index === range && s.selectedRange]}><Text style={s.link}>{value.label}</Text></Pressable>)}</View>}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.metricScroll}>{metrics.map(value => <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected: activeMetric === value }} onPress={() => setMetric(value)} style={[s.metricButton, activeMetric === value && s.metricSelected]}><Text style={activeMetric === value ? s.metricSelectedText : s.metricText}>{metricLabels[value]}</Text></Pressable>)}</ScrollView>
              {history.loading ? <ActivityIndicator color="#216C50" style={{ margin: 20 }} /> : (!history.error || history.data) && <ExerciseProgressChart points={points} unit={metricUnit[activeMetric]} />}
              <Text style={s.chartFootnote}>Daily best · Select a date to explore your progress.</Text>
            </View>

            <View style={s.logSection}>
              <View style={s.heading}><View><Text style={s.sectionTitle}>Training log</Text><Text style={s.caption}>Your sessions, one step at a time.</Text></View><MaterialCommunityIcons name="history" size={23} color="#6C7C75" /></View>
              {!sessions.length && !history.loading && !history.error && <View style={s.empty}><Text style={s.sessionTitle}>A fresh start</Text><Text style={s.muted}>Finish this exercise to add your first entry.</Text></View>}
              {sessions.slice(0, visibleSessions).map((session, sessionIndex) => {
                const date = new Date(session.startedAt);
                const expanded = expandedSession === session.id;
                return <View key={session.id} style={s.timelineEntry}>
                  <View style={s.dateRail}><View style={[s.timelineDot, sessionIndex === 0 && s.latestDot]} /><View style={s.timelineLine} /></View>
                  <View style={s.logEntry}>
                    <Pressable accessibilityRole="button" accessibilityLabel={`Workout details ${date.toLocaleString()}`} accessibilityState={{ expanded }} onPress={() => setExpandedSession(expanded ? null : session.id)} style={s.heading}>
                      <View style={{ flex: 1 }}><Text style={s.sessionTitle}>{date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</Text><Text style={s.caption}>{session.setDetails?.length || 0} sets · {Math.floor(session.durationSeconds / 60)} min · {session.machineName || "Independent"}</Text></View>
                      <MaterialCommunityIcons name={expanded ? "minus" : "plus"} size={22} color="#315547" />
                    </Pressable>
                    {expanded && <View style={s.sessionDetails}>
                      <Text style={s.caption}>{date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })} · {session.durationSeconds} seconds</Text>
                      <View style={s.setGrid}>{(session.setDetails || []).map((set, index) => <View key={index} style={s.setTile}><Text style={s.setLabel}>Set {set.setNumber || index + 1}</Text><Text style={s.setValue}>{formatSet(set, exercise.loggingMode)}</Text></View>)}</View>
                      {!session.setDetails?.length && <Text style={s.muted}>No individual sets recorded.</Text>}
                      {!!session.notes && <Text style={s.body}>{session.notes}</Text>}
                    </View>}
                  </View>
                </View>;
              })}
              {sessions.length > visibleSessions && <Pressable accessibilityRole="button" onPress={() => setVisibleSessions(count => count + 10)} style={s.loadMore}><Text style={s.link}>Load older workouts</Text><MaterialCommunityIcons name="arrow-down" size={18} color="#315547" /></Pressable>}
            </View>
          </View>

          <View style={[s.sideColumn, wide && s.sideColumnWide]}>
            <View style={s.bestsPanel}>
              <View style={s.heading}><Text style={s.sectionTitle}>Lifetime bests</Text><Pressable accessibilityRole="button" accessibilityLabel="Explain personal records" onPress={() => setRecordInfo(!recordInfo)} style={s.infoButton}><MaterialCommunityIcons name="information-outline" size={21} color="#6C7C75" /></Pressable></View>
              {recordInfo && <Text style={s.caption}>These records use all completed workouts. Volume is weight × reps, summed across sets for session volume. Estimated 1RM uses the Epley formula for 1–12 reps; it is an estimate, not a tested maximum.</Text>}
              <View style={s.recordGrid}>{records.map(record => <View key={record.metric} style={s.recordTile}><Text style={s.recordLabel}>{metricLabels[record.metric]}</Text><Text style={s.recordValue}>{record.value === null ? "—" : formatValue(record.value)}<Text style={s.recordUnit}>{record.value === null ? "" : ` ${metricUnit[record.metric]}`}</Text></Text></View>)}</View>
              {!sessions.length && !history.loading && !history.error && <Text style={s.caption}>Your first workout establishes your starting point.</Text>}
              {exercise.loggingMode === "WEIGHT_REPS" && <>
                <Pressable accessibilityRole="button" accessibilityState={{ expanded: recordsOpen }} onPress={() => setRecordsOpen(!recordsOpen)} style={s.recordToggle}><Text style={s.link}>Set records</Text><MaterialCommunityIcons name={recordsOpen ? "chevron-up" : "chevron-down"} size={20} color="#315547" /></Pressable>
                {recordsOpen && <View style={s.repGrid}>{repRecords.length ? repRecords.map(record => <View key={record.reps} style={s.repRecord}><Text style={s.caption}>{record.reps} rep{record.reps === 1 ? "" : "s"}</Text><Text style={s.repValue}>{formatValue(record.weight)} lbs</Text></View>) : <Text style={s.muted}>No weighted set records yet.</Text>}</View>}
              </>}
            </View>

            <View style={s.coachPanel}>
              <Pressable accessibilityRole="button" accessibilityLabel="Movement guide" accessibilityState={{ expanded: guideOpen }} onPress={() => setGuideOpen(!guideOpen)} style={s.heading}>
                <MaterialCommunityIcons name="human-handsup" size={24} color="#805D24" /><View style={{ flex: 1 }}><Text style={s.coachTitle}>Movement guide</Text><Text style={s.coachCaption}>Form cues & muscle focus</Text></View><MaterialCommunityIcons name={guideOpen ? "minus" : "plus"} size={23} color="#805D24" />
              </Pressable>
              {guideOpen && <>
                <View style={s.muscleFocus}><Text style={s.coachCaption}>Primary focus</Text><Text style={s.focusValue}>{exercise.muscleGroup}</Text><Text style={s.coachCaption}>Supporting muscles</Text><Text style={s.body}>{exercise.secondaryMuscles?.length ? exercise.secondaryMuscles.join(", ") : "Not listed in this catalog"}</Text></View>
                {mediaUrl && <View style={s.media}>{failedMedia !== mediaUrl ? <><Image source={{ uri: mediaUrl }} style={s.demo} contentFit="contain" autoplay={!mediaPaused} onError={() => setFailedMedia(mediaUrl)} accessibilityLabel={`${exercise.name} demonstration`} /><Pressable accessibilityRole="button" accessibilityLabel={mediaPaused ? "Play demonstration" : "Pause demonstration"} style={s.pause} onPress={() => setMediaPaused(!mediaPaused)}><MaterialCommunityIcons name={mediaPaused ? "play" : "pause"} size={23} color="#315547" /></Pressable></> : <Pressable onPress={() => setFailedMedia(null)}><Text style={s.link}>Retry demonstration</Text></Pressable>}</View>}
                {!mediaUrl && <Text style={s.coachCaption}>No demonstration available yet.</Text>}
                {steps.length ? steps.map((step, index) => <View key={index} style={s.step}><View style={s.stepMarker}><Text style={s.stepNumber}>{index + 1}</Text></View><Text style={[s.body, { flex: 1 }]}>{step}</Text></View>) : <Text style={s.muted}>Instructions aren’t available for this exercise yet.</Text>}
              </>}
            </View>
            <PinnedExerciseNote key={exercise.id} exerciseId={exercise.id} />
            {gym && <Link href={{ pathname: "/workout/equipment/[exercise]", params: { exercise: exercise.name, exerciseId: exercise.id, loggingMode: exercise.loggingMode, muscle: exercise.muscleGroup } }} style={s.secondary}>Find equipment at {gym.name}</Link>}
            {exercise.custom && <Link href={{ pathname: "/exercise/custom", params: { id: exercise.id } }} style={s.secondary}>Edit or archive exercise</Link>}
          </View>
        </View>
      </>}
    </ScrollView>
  </View>;
}
const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#F3F6F4" },
  content: { width: "100%", maxWidth: 1180, alignSelf: "center", paddingHorizontal: 20 },
  header: { paddingVertical: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  back: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10 },
  iconButton: { padding: 12, backgroundColor: "#E6EEE9", borderRadius: 12 },
  hero: { backgroundColor: "#193F32", borderRadius: 24, padding: 24, gap: 24, marginBottom: 24 },
  heroWide: { flexDirection: "row", alignItems: "center", padding: 32 },
  heroCopy: { flex: 1, gap: 16 },
  heroType: { flexDirection: "row", alignItems: "center", gap: 10 },
  heroTypeText: { fontSize: 13, fontWeight: "600", color: "#CAE4D7" },
  title: { fontSize: 32, lineHeight: 39, letterSpacing: -0.8, fontWeight: "800", color: "#fff" },
  heroFacts: { flexDirection: "row", flexWrap: "wrap", gap: 10, alignItems: "center" },
  heroFact: { color: "#D3E5DB", fontSize: 14 },
  factDot: { width: 4, height: 4, backgroundColor: "#84AD98", borderRadius: 2 },
  launch: { gap: 10 },
  launchWide: { width: 240 },
  start: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 14, backgroundColor: "#D1E9DA", padding: 17, borderRadius: 12 },
  startText: { color: "#193F32", fontSize: 16, fontWeight: "800", flexShrink: 1 },
  disabled: { opacity: 0.6 },
  launchHint: { color: "#BCD3C6", fontSize: 12, lineHeight: 19 },
  workspace: { gap: 24 },
  workspaceWide: { flexDirection: "row", alignItems: "flex-start" },
  mainColumn: { flex: 1, minWidth: 0, gap: 26 },
  sideColumn: { gap: 18, minWidth: 0 },
  sideColumnWide: { width: 330 },
  progressPanel: { backgroundColor: "#fff", padding: 20, borderRadius: 18, gap: 16 },
  heading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  sectionTitle: { color: "#243E33", fontSize: 19, fontWeight: "800", letterSpacing: -0.3 },
  caption: { color: "#6C7C75", fontSize: 12, lineHeight: 20, marginTop: 3 },
  muted: { color: "#6C7C75", fontSize: 14, lineHeight: 23 },
  body: { color: "#344D3F", fontSize: 15, lineHeight: 25 },
  rangeButton: { flexDirection: "row", alignItems: "center", gap: 6, padding: 10, borderRadius: 10, backgroundColor: "#F0F5F1" },
  rangeOptions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  rangeOption: { padding: 10, borderRadius: 8 },
  selectedRange: { backgroundColor: "#E2EDE6" },
  metricScroll: { borderBottomWidth: 1, borderColor: "#E6EEE9" },
  metricButton: { paddingBottom: 12, marginRight: 20, borderBottomWidth: 2, borderColor: "transparent" },
  metricSelected: { borderColor: "#216C50" },
  metricText: { color: "#6C7C75", fontSize: 13 },
  metricSelectedText: { color: "#216C50", fontWeight: "700", fontSize: 13 },
  chartFootnote: { color: "#6C7C75", fontSize: 11, borderTopWidth: 1, borderColor: "#EFF3F0", paddingTop: 12 },
  logSection: { paddingHorizontal: 4, paddingBottom: 8 },
  timelineEntry: { flexDirection: "row", gap: 14 },
  dateRail: { width: 12, alignItems: "center", paddingTop: 24 },
  timelineDot: { width: 9, height: 9, backgroundColor: "#B8CDBF", borderRadius: 5 },
  latestDot: { backgroundColor: "#216C50" },
  timelineLine: { width: 1, flex: 1, minHeight: 35, backgroundColor: "#D5E2D9", marginTop: 5 },
  logEntry: { flex: 1, paddingVertical: 20, borderBottomWidth: 1, borderColor: "#DDE7E0" },
  sessionTitle: { color: "#243E33", fontSize: 16, fontWeight: "700" },
  sessionDetails: { gap: 12, paddingTop: 14 },
  setGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  setTile: { backgroundColor: "#E6EFE9", padding: 12, borderRadius: 9, gap: 4 },
  setLabel: { color: "#6C7C75", fontSize: 11 },
  setValue: { color: "#243E33", fontSize: 14, fontWeight: "700" },
  loadMore: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, padding: 16 },
  bestsPanel: { padding: 20, borderRadius: 18, backgroundColor: "#E6EEE9", gap: 14 },
  infoButton: { padding: 5 },
  recordGrid: { flexDirection: "row", flexWrap: "wrap" },
  recordTile: { width: "50%", paddingVertical: 12, paddingRight: 10, gap: 6 },
  recordLabel: { color: "#536D5D", fontSize: 12, lineHeight: 18 },
  recordValue: { color: "#193F32", fontWeight: "800", fontSize: 24, letterSpacing: -0.6 },
  recordUnit: { fontSize: 12, fontWeight: "500", color: "#536D5D", letterSpacing: 0 },
  recordToggle: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderTopWidth: 1, borderColor: "#CBDDD0", paddingTop: 14 },
  repGrid: { flexDirection: "row", flexWrap: "wrap", gap: 16 },
  repRecord: { gap: 3 },
  repValue: { fontWeight: "700", color: "#193F32", fontSize: 14 },
  coachPanel: { backgroundColor: "#FBF1DC", borderRadius: 16, padding: 20, gap: 20 },
  coachTitle: { fontSize: 17, color: "#624A26", fontWeight: "800" },
  coachCaption: { fontSize: 12, color: "#806D4D", lineHeight: 20 },
  muscleFocus: { gap: 5, borderTopWidth: 1, borderColor: "#EBDCBF", paddingTop: 16 },
  focusValue: { color: "#624A26", fontWeight: "700", fontSize: 18, marginBottom: 8 },
  step: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  stepMarker: { width: 24, height: 24, borderRadius: 7, alignItems: "center", justifyContent: "center", backgroundColor: "#ECDDAB", marginTop: 2 },
  stepNumber: { fontSize: 12, fontWeight: "700", color: "#624A26" },
  media: { backgroundColor: "#fff", borderRadius: 12, overflow: "hidden" },
  demo: { width: "100%", height: 210 },
  pause: { position: "absolute", right: 10, top: 10, padding: 9, borderRadius: 20, backgroundColor: "#E6EEE9" },
  secondary: { color: "#315547", padding: 14, textAlign: "center", fontSize: 14, fontWeight: "600" },
  empty: { padding: 24, gap: 8 },
  card: { backgroundColor: "#fff", borderRadius: 16, padding: 20, gap: 12 },
  error: { color: "#B3261E", fontSize: 14 },
  link: { color: "#315547", fontSize: 13, fontWeight: "700" },
});
