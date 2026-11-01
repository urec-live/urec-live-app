import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { exerciseAPI, Exercise } from "@/services/exerciseAPI";
import { useGym } from "@/contexts/GymContext";
import { usePlan } from "@/contexts/PlanContext";
import { useWorkout } from "@/contexts/WorkoutContext";
import TodayGoalCard from "@/components/TodayGoalCard";

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>["name"];
const colors = {
  canvas: "#F3F5F6",
  paper: "#FFFFFF",
  ink: "#1B3029",
  muted: "#6C7C75",
  green: "#216C50",
  forest: "#193F32",
  pale: "#E8F1EB",
  line: "#E1E7E3",
};
const categories: { value: string; label: string; icon: IconName }[] = [
  { value: "", label: "All exercises", icon: "view-grid-outline" },
  { value: "STRENGTH", label: "Strength", icon: "dumbbell" },
  { value: "CARDIO", label: "Cardio", icon: "heart-pulse" },
  { value: "MOBILITY", label: "Mobility", icon: "yoga" },
];
const muscles = [
  "Chest",
  "Back",
  "Shoulders",
  "Biceps",
  "Triceps",
  "Quads",
  "Hamstrings",
  "Glutes",
  "Calves",
  "Core",
  "Forearms",
  "Full Body",
];
const equipment = [
  "BARBELL",
  "DUMBBELL",
  "CABLE",
  "MACHINE",
  "BODYWEIGHT",
  "KETTLEBELL",
  "NONE",
  "BICYCLE",
  "POOL",
  "OTHER",
];
const equipmentLabels: Record<string, string> = {
  BARBELL: "Barbell",
  DUMBBELL: "Dumbbell",
  CABLE: "Cable",
  MACHINE: "Machine",
  BODYWEIGHT: "Bodyweight",
  KETTLEBELL: "Kettlebell",
  NONE: "No equipment",
  BICYCLE: "Bicycle",
  POOL: "Pool",
  OTHER: "Other",
};
const metricLabels = {
  WEIGHT_REPS: "Weight & reps",
  REPS: "Repetitions",
  DURATION: "Time",
  DISTANCE_DURATION: "Distance & time",
};
function exerciseAppearance(exercise: Exercise): {
  icon: IconName;
  background: string;
  color: string;
} {
  if (exercise.trainingType === "CARDIO")
    return {
      icon:
        exercise.equipmentType === "POOL"
          ? "swim"
          : exercise.equipmentType === "BICYCLE"
            ? "bike"
            : "run",
      background: "#EAF0F8",
      color: "#416994",
    };
  if (exercise.trainingType === "MOBILITY")
    return { icon: "yoga", background: "#F7EFE4", color: "#9A6B36" };
  const icons: Record<string, IconName> = {
    BARBELL: "weight-lifter",
    DUMBBELL: "dumbbell",
    BODYWEIGHT: "human-handsup",
    KETTLEBELL: "kettlebell",
    CABLE: "weight",
    MACHINE: "weight-lifter",
  };
  return {
    icon: icons[exercise.equipmentType] || "dumbbell",
    background: "#EAF1EC",
    color: "#3C7058",
  };
}

export default function WorkoutCatalog() {
  const { muscle, training } = useLocalSearchParams<{
    muscle?: string;
    training?: string;
  }>();
  const { todayPlan, refreshTodayPlan } = usePlan();
  const { currentSession } = useWorkout();
  const router = useRouter();
  const { gym } = useGym();
  const { width } = useWindowDimensions();
  const desktop = width >= 1000;
  const twoColumns = width >= 720;
  const [search, setSearch] = useState("");
  const [muscleGroup, setMuscle] = useState(muscle || "");
  const [equipmentType, setEquipment] = useState("");
  const [trainingType, setTraining] = useState(training || "");
  const [atMyGym, setAtGym] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [items, setItems] = useState<Exercise[]>([]);
  const [page, setPage] = useState(0);
  const [pages, setPages] = useState(0);
  const [total, setTotal] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const generation = useRef(0);
  const filterCount =
    Number(!!muscleGroup) + Number(!!equipmentType) + Number(!!gym && atMyGym);
  const load = useCallback(
    async (next = 0) => {
      const version = ++generation.current;
      setLoading(true);
      setError("");
      try {
        const data = await exerciseAPI.list({
          search,
          muscleGroup,
          equipmentType,
          trainingType,
          atMyGym: !!gym?.id && atMyGym,
          page: next,
        });
        if (version !== generation.current) return;
        setItems((old) => (next ? [...old, ...data.content] : data.content));
        setPage(next);
        setPages(data.totalPages);
        setTotal(data.totalElements);
      } catch {
        if (version === generation.current)
          setError(
            "Could not load exercises. Check your connection and retry.",
          );
      } finally {
        if (version === generation.current) setLoading(false);
      }
    },
    [search, muscleGroup, equipmentType, trainingType, atMyGym, gym?.id],
  );
  useFocusEffect(
    useCallback(() => {
      const timer = setTimeout(() => {
        void load();
      }, 250);
      return () => {
        clearTimeout(timer);
        generation.current++;
      };
    }, [load]),
  );
  useFocusEffect(
    useCallback(() => {
      void refreshTodayPlan();
    }, [refreshTodayPlan]),
  );
  useEffect(() => {
    setAtGym(false);
    setItems([]);
    setTotal(null);
  }, [gym?.id]);
  useEffect(() => {
    setMuscle(muscle || "");
    setTraining(training || "");
  }, [muscle, training]);
  const clearFilters = () => {
    setMuscle("");
    setEquipment("");
    setAtGym(false);
  };
  const createExercise = () => router.push("/exercise/custom");
  const renderChoices = (
    values: string[],
    selected: string,
    set: (value: string) => void,
    labels?: Record<string, string>,
  ) => (
    <View style={styles.choices}>
      {["", ...values].map((value) => (
        <Pressable
          key={value}
          accessibilityRole="button"
          accessibilityState={{ selected: selected === value }}
          onPress={() => set(value)}
          style={({ pressed }) => [
            styles.choice,
            selected === value && styles.choiceSelected,
            pressed && styles.pressed,
          ]}
        >
          <Text
            style={[
              styles.choiceText,
              selected === value && styles.choiceTextSelected,
            ]}
          >
            {value ? labels?.[value] || value : "Any"}
          </Text>
        </Pressable>
      ))}
    </View>
  );
  const filters = (
    <>
      <View style={styles.filterTitleRow}>
        <Text style={styles.panelTitle}>Filters</Text>
        {filterCount > 0 && (
          <Pressable
            accessibilityRole="button"
            onPress={clearFilters}
            hitSlop={8}
          >
            <Text style={styles.clearText}>Reset</Text>
          </Pressable>
        )}
      </View>
      {gym && (
        <View style={styles.gymFilter}>
          <View style={{ flex: 1 }}>
            <Text style={styles.filterLabel}>At my gym</Text>
            <Text style={styles.smallText}>{gym.name} equipment</Text>
          </View>
          <Switch
            accessibilityLabel="At my gym"
            value={atMyGym}
            onValueChange={setAtGym}
            trackColor={{ false: "#DCE4DF", true: "#7DB79B" }}
            thumbColor={colors.paper}
          />
        </View>
      )}
      <Text style={styles.filterLabel}>Muscle group</Text>
      {renderChoices(muscles, muscleGroup, setMuscle)}
      <View style={styles.filterDivider} />
      <Text style={styles.filterLabel}>Equipment</Text>
      {renderChoices(equipment, equipmentType, setEquipment, equipmentLabels)}
      <View style={styles.customPrompt}>
        <MaterialCommunityIcons
          name="pencil-plus-outline"
          size={22}
          color={colors.green}
        />
        <Text style={styles.promptTitle}>Make it your own</Text>
        <Text style={styles.smallText}>
          Add an exercise that fits the way you train.
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={createExercise}
          style={styles.promptLink}
        >
          <Text style={styles.clearText}>Create an exercise</Text>
          <MaterialCommunityIcons
            name="arrow-right"
            size={16}
            color={colors.green}
          />
        </Pressable>
      </View>
    </>
  );
  const selectedCategory =
    categories.find((c) => c.value === trainingType)?.label || "All exercises";
  const listHeader = (
    <>
      <View
        style={[styles.libraryHeading, !desktop && styles.libraryHeadingMobile]}
      >
        <View>
          <Text style={styles.libraryTitle}>Exercise library</Text>
          <Text style={styles.smallText}>
            {total === null
              ? "Find a movement that works for you"
              : `${total} ${total === 1 ? "exercise" : "exercises"}${trainingType ? ` in ${selectedCategory.toLowerCase()}` : " to explore"}`}
          </Text>
        </View>
        {desktop && (
          <View style={styles.viewBadge}>
            <MaterialCommunityIcons
              name="view-grid-outline"
              size={16}
              color={colors.muted}
            />
            <Text style={styles.viewBadgeText}>Browse</Text>
          </View>
        )}
      </View>
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <MaterialCommunityIcons
            name="magnify"
            size={23}
            color={colors.muted}
          />
          <TextInput
            accessibilityLabel="Search exercises"
            style={styles.searchInput}
            placeholder="Search exercises…"
            placeholderTextColor="#839089"
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
            autoCorrect={false}
          />
          {!!search && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Clear search"
              onPress={() => setSearch("")}
              hitSlop={8}
            >
              <MaterialCommunityIcons
                name="close-circle"
                size={18}
                color={colors.muted}
              />
            </Pressable>
          )}
        </View>
        {!desktop && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Filters${filterCount ? `, ${filterCount} active` : ""}`}
            onPress={() => setFiltersOpen(true)}
            style={[
              styles.filterButton,
              filterCount > 0 && styles.filterButtonActive,
            ]}
          >
            <MaterialCommunityIcons
              name="tune-variant"
              size={22}
              color={colors.green}
            />
            {filterCount > 0 && (
              <Text style={styles.clearText}>{filterCount}</Text>
            )}
          </Pressable>
        )}
      </View>
      {filterCount > 0 && (
        <View style={styles.activeFilters}>
          {muscleGroup && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Remove ${muscleGroup} filter`}
              style={styles.activeFilter}
              onPress={() => setMuscle("")}
            >
              <Text style={styles.activeFilterText}>{muscleGroup}</Text>
              <MaterialCommunityIcons
                name="close"
                size={13}
                color={colors.green}
              />
            </Pressable>
          )}
          {equipmentType && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Remove ${equipmentLabels[equipmentType]} filter`}
              style={styles.activeFilter}
              onPress={() => setEquipment("")}
            >
              <Text style={styles.activeFilterText}>
                {equipmentLabels[equipmentType]}
              </Text>
              <MaterialCommunityIcons
                name="close"
                size={13}
                color={colors.green}
              />
            </Pressable>
          )}
          {!!gym && atMyGym && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Remove gym filter"
              style={styles.activeFilter}
              onPress={() => setAtGym(false)}
            >
              <Text style={styles.activeFilterText}>At {gym.name}</Text>
              <MaterialCommunityIcons
                name="close"
                size={13}
                color={colors.green}
              />
            </Pressable>
          )}
        </View>
      )}
      {!!error && (
        <View accessibilityRole="alert" style={styles.errorBox}>
          <MaterialCommunityIcons name="wifi-off" size={22} color="#A24F3D" />
          <View style={{ flex: 1 }}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable accessibilityRole="button" onPress={() => load()}>
              <Text style={styles.clearText}>Try again</Text>
            </Pressable>
          </View>
        </View>
      )}
      {!loading && !error && items.length > 0 && (
        <View style={styles.resultsLabel}>
          <Text style={styles.resultsText}>
            {search ? `Results for “${search}”` : "Explore the library"}
          </Text>
          <Text style={styles.resultsHint}>Select an exercise to start</Text>
        </View>
      )}
    </>
  );
  const pageHeader = (
    <>
      <View style={styles.topbar}>
        <View style={{ flex: 1 }}>
          <Text
            accessibilityRole="header"
            style={[styles.title, !desktop && styles.titleMobile]}
          >
            Workout
          </Text>
          <Text style={styles.subtitle}>A little progress, every session.</Text>
        </View>
      </View>
      <View style={styles.contextRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            gym ? `Manage gym: ${gym.name}` : "Manage optional gym connection"
          }
          onPress={() => router.push("/settings/gym")}
          style={styles.contextBadge}
        >
          <MaterialCommunityIcons
            name={gym ? "map-marker-outline" : "earth"}
            size={15}
            color={colors.green}
          />
          <Text style={styles.contextText}>
            {gym ? gym.name : "Independent training"}
          </Text>
          {gym && <View style={styles.connectedDot} />}
        </Pressable>
        <Text style={styles.contextHint}>
          {gym
            ? "Your library. Your gym. Your pace."
            : "Your workouts, wherever you are."}
        </Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Open weekly workout plan"
        onPress={() => router.push("/settings/plan")}
        style={({ pressed }) => [
          styles.planBanner,
          !desktop && styles.planBannerMobile,
          pressed && styles.pressed,
        ]}
      >
        <View style={[styles.planIcon, !desktop && styles.planIconMobile]}>
          <MaterialCommunityIcons
            name="calendar-check-outline"
            size={29}
            color="#D9EBDF"
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.planTitle, !desktop && styles.planTitleMobile]}>
            {todayPlan?.planName || "A good week starts with a plan."}
          </Text>
          <Text style={styles.planDescription}>
            {todayPlan?.items.length
              ? `${todayPlan.items.length} ${todayPlan.items.length === 1 ? "target" : "targets"} on your plan today`
              : "Give your training a little direction."}
          </Text>
        </View>
        <View style={styles.planAction}>
          {desktop && <Text style={styles.planActionText}>Weekly plan</Text>}
          <MaterialCommunityIcons
            name="arrow-top-right"
            size={24}
            color="#E0EDE3"
          />
        </View>
      </Pressable>
      <View style={styles.categoryRow}>
        {categories.map((category) => {
          const selected = category.value === trainingType;
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected }}
              key={category.value}
              onPress={() => setTraining(category.value)}
              style={({ pressed }) => [
                styles.category,
                selected && styles.categorySelected,
                pressed && styles.pressed,
              ]}
            >
              {width >= 420 && (
                <MaterialCommunityIcons
                  name={category.icon}
                  size={20}
                  color={selected ? colors.green : colors.muted}
                />
              )}
              <Text
                numberOfLines={1}
                style={[
                  styles.categoryText,
                  selected && styles.categoryTextSelected,
                ]}
              >
                {!desktop && category.value === "" ? "All" : category.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </>
  );
  return (
    <View style={styles.page}>
      <View style={[styles.shell, !desktop && styles.shellMobile]}>
        {desktop && pageHeader}
        <View style={styles.workspace}>
          {desktop && (
            <View style={styles.sidebar}>
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.sidebarContent}
              >
                {filters}
              </ScrollView>
            </View>
          )}
          <View style={styles.library}>
            <FlatList
              key={twoColumns ? "grid" : "list"}
              data={items}
              numColumns={twoColumns ? 2 : 1}
              keyExtractor={(item) => String(item.id)}
              columnWrapperStyle={twoColumns ? styles.gridRow : undefined}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{
                paddingBottom: currentSession ? 440 : 30,
              }}
              keyboardShouldPersistTaps="handled"
              ListHeaderComponent={
                <>
                  {!desktop && pageHeader}
                  {listHeader}
                  {(todayPlan?.items || []).length > 0 && (
                    <View style={styles.goals}>
                      <Text style={styles.filterLabel}>Today’s targets</Text>
                      {todayPlan!.items.map((item) => (
                        <TodayGoalCard key={item.muscleGroup} item={item} />
                      ))}
                    </View>
                  )}
                </>
              }
              renderItem={({ item }) => {
                const appearance = exerciseAppearance(item);
                return (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${item.name}, ${item.muscleGroup}, ${metricLabels[item.loggingMode]}`}
                    onPress={() =>
                      router.push({
                        pathname: "/exercise/[id]",
                        params: { id: item.id },
                      })
                    }
                    style={({ pressed }) => [
                      styles.exerciseCard,
                      twoColumns && styles.exerciseCardGrid,
                      pressed && styles.exerciseCardPressed,
                    ]}
                  >
                    <View
                      style={[
                        styles.exerciseIcon,
                        { backgroundColor: appearance.background },
                      ]}
                    >
                      <MaterialCommunityIcons
                        name={appearance.icon}
                        size={30}
                        color={appearance.color}
                      />
                    </View>
                    <View style={styles.exerciseInfo}>
                      <View style={styles.exerciseTitleRow}>
                        <Text style={styles.exerciseName} numberOfLines={2}>
                          {item.name}
                        </Text>
                        {item.custom && (
                          <MaterialCommunityIcons
                            name="pencil-outline"
                            size={13}
                            color={colors.green}
                          />
                        )}
                      </View>
                      <Text style={styles.exerciseMeta} numberOfLines={1}>
                        {item.muscleGroup}
                        <Text style={styles.metaDivider}> / </Text>
                        {equipmentLabels[item.equipmentType] ||
                          item.equipmentType}
                      </Text>
                      <View style={styles.metricRow}>
                        <MaterialCommunityIcons
                          name={
                            item.loggingMode === "DURATION" ||
                            item.loggingMode === "DISTANCE_DURATION"
                              ? "timer-outline"
                              : "format-list-numbered"
                          }
                          size={12}
                          color={colors.muted}
                        />
                        <Text style={styles.metricText}>
                          {metricLabels[item.loggingMode]}
                        </Text>
                        {item.custom && (
                          <Text style={styles.customTag}>Custom</Text>
                        )}
                      </View>
                    </View>
                    <MaterialCommunityIcons
                      name="chevron-right"
                      size={21}
                      color="#94A29A"
                    />
                  </Pressable>
                );
              }}
              ListEmptyComponent={
                loading ? (
                  <View style={styles.loadingState}>
                    <ActivityIndicator color={colors.green} />
                    <Text style={styles.smallText}>
                      Finding your exercises…
                    </Text>
                  </View>
                ) : error ? null : (
                  <View style={styles.emptyState}>
                    <View style={styles.emptyIcon}>
                      <MaterialCommunityIcons
                        name="magnify"
                        size={32}
                        color={colors.green}
                      />
                    </View>
                    <Text style={styles.emptyTitle}>
                      Let’s try a different angle.
                    </Text>
                    <Text style={styles.emptyText}>
                      Try another search or loosen your filters. You can also
                      add an exercise of your own.
                    </Text>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => {
                        setSearch("");
                        clearFilters();
                        setTraining("");
                      }}
                      style={styles.emptyButton}
                    >
                      <Text style={styles.clearText}>Show all exercises</Text>
                    </Pressable>
                  </View>
                )
              }
              ListFooterComponent={
                items.length > 0 ? (
                  loading ? (
                    <ActivityIndicator
                      style={{ marginVertical: 20 }}
                      color={colors.green}
                    />
                  ) : page + 1 < pages ? (
                    <Pressable
                      accessibilityRole="button"
                      style={styles.loadMore}
                      onPress={() => load(page + 1)}
                    >
                      <Text style={styles.loadMoreText}>
                        Explore more exercises
                      </Text>
                      <MaterialCommunityIcons
                        name="arrow-down"
                        size={17}
                        color={colors.green}
                      />
                    </Pressable>
                  ) : (
                    <Text style={styles.endNote}>
                      Your next personal best starts with showing up.
                    </Text>
                  )
                ) : null
              }
            />
          </View>
        </View>
        <Modal
          visible={filtersOpen && !desktop}
          transparent
          animationType="fade"
          onRequestClose={() => setFiltersOpen(false)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.filterSheet}>
              <View style={styles.sheetHeader}>
                <Text style={styles.panelTitle}>Find your focus</Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Close filters"
                  onPress={() => setFiltersOpen(false)}
                  hitSlop={12}
                >
                  <MaterialCommunityIcons
                    name="close"
                    size={24}
                    color={colors.ink}
                  />
                </Pressable>
              </View>
              <ScrollView contentContainerStyle={{ padding: 24 }}>
                {filters}
              </ScrollView>
              <Pressable
                accessibilityRole="button"
                onPress={() => setFiltersOpen(false)}
                style={styles.sheetDone}
              >
                <Text style={styles.createButtonText}>Show exercises</Text>
                <MaterialCommunityIcons
                  name="arrow-right"
                  size={20}
                  color={colors.paper}
                />
              </Pressable>
            </View>
          </View>
        </Modal>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.canvas },
  shell: {
    width: "100%",
    maxWidth: 1240,
    alignSelf: "center",
    flex: 1,
    paddingHorizontal: 36,
    paddingTop: 30,
  },
  shellMobile: { paddingHorizontal: 20, paddingTop: 20 },
  topbar: { flexDirection: "row", alignItems: "center", gap: 16 },
  title: {
    fontFamily: Platform.OS === "ios" ? "Avenir Next" : undefined,
    fontSize: 38,
    lineHeight: 46,
    fontWeight: "800",
    letterSpacing: -1.4,
    color: colors.ink,
  },
  titleMobile: { fontSize: 32, lineHeight: 40 },
  subtitle: { fontSize: 14, color: colors.muted, lineHeight: 22, marginTop: 2 },
  createButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.green,
    paddingHorizontal: 20,
    paddingVertical: 13,
    borderRadius: 13,
    minHeight: 46,
  },
  createButtonMobile: { paddingHorizontal: 13 },
  createButtonText: { color: colors.paper, fontSize: 14, fontWeight: "700" },
  contextRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 16,
    marginBottom: 22,
    flexWrap: "wrap",
  },
  contextBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: "#E6EDE7",
    borderRadius: 8,
  },
  contextText: { fontSize: 12, color: colors.green, fontWeight: "600" },
  contextHint: { fontSize: 12, color: colors.muted },
  connectedDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#37855F",
    marginLeft: 3,
  },
  planBanner: {
    backgroundColor: colors.forest,
    flexDirection: "row",
    alignItems: "center",
    gap: 18,
    padding: 24,
    borderRadius: 18,
  },
  planBannerMobile: { padding: 15, gap: 12 },
  planTitleMobile: { fontSize: 16, lineHeight: 22 },
  planIconMobile: { width: 44, height: 48 },
  planIcon: {
    width: 52,
    height: 52,
    borderRadius: 15,
    backgroundColor: "#2B5141",
    alignItems: "center",
    justifyContent: "center",
  },
  planTitle: {
    fontSize: 19,
    lineHeight: 25,
    fontWeight: "700",
    color: "#F5FAF6",
    letterSpacing: -0.4,
  },
  planDescription: {
    fontSize: 13,
    lineHeight: 20,
    marginTop: 4,
    color: "#C0D5C9",
  },
  planAction: { flexDirection: "row", alignItems: "center", gap: 12 },
  planActionText: { fontSize: 13, fontWeight: "600", color: "#E0EDE3" },
  categoryRow: {
    flexDirection: "row",
    marginTop: 22,
    marginBottom: 22,
    borderBottomWidth: 1,
    borderColor: "#DDE5DF",
    gap: 4,
  },
  category: {
    flexDirection: "row",
    flex: 1,
    maxWidth: 190,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
    gap: 7,
    paddingVertical: 14,
    borderBottomWidth: 3,
    borderBottomColor: "transparent",
  },
  categorySelected: { borderBottomColor: colors.green },
  categoryText: {
    fontSize: 13,
    color: colors.muted,
    fontWeight: "500",
    flexShrink: 1,
  },
  categoryTextSelected: { color: colors.green, fontWeight: "700" },
  workspace: { flex: 1, flexDirection: "row", gap: 28 },
  sidebar: {
    width: 242,
    backgroundColor: colors.paper,
    borderRadius: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.line,
  },
  sidebarContent: { padding: 20 },
  filterTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  panelTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.ink,
    letterSpacing: -0.4,
  },
  clearText: {
    color: colors.green,
    fontWeight: "600",
    fontSize: 13,
    lineHeight: 22,
  },
  filterLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.ink,
    marginBottom: 12,
  },
  choices: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  choice: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 8,
    minHeight: 36,
    justifyContent: "center",
  },
  choiceSelected: { backgroundColor: colors.green, borderColor: colors.green },
  choiceText: { fontSize: 12, color: "#566B60" },
  choiceTextSelected: { color: colors.paper, fontWeight: "600" },
  filterDivider: {
    height: 1,
    backgroundColor: colors.line,
    marginVertical: 24,
  },
  gymFilter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 24,
  },
  smallText: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  customPrompt: {
    marginTop: 28,
    padding: 16,
    backgroundColor: "#F0F5F1",
    borderRadius: 12,
    gap: 8,
  },
  promptTitle: { fontSize: 14, color: colors.ink, fontWeight: "700" },
  promptLink: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 2,
  },
  library: { flex: 1, minWidth: 0 },
  libraryHeading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  libraryHeadingMobile: { marginBottom: 14 },
  libraryTitle: {
    fontSize: 22,
    lineHeight: 30,
    color: colors.ink,
    fontWeight: "700",
    letterSpacing: -0.6,
    marginBottom: 3,
  },
  viewBadge: { flexDirection: "row", alignItems: "center", gap: 7 },
  viewBadgeText: { fontSize: 12, color: colors.muted },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
  },
  searchBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.paper,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D9E2DC",
    paddingHorizontal: 15,
    minHeight: 50,
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 14,
    fontSize: 14,
    color: colors.ink,
  },
  filterButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    minHeight: 50,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D9E2DC",
    backgroundColor: colors.paper,
  },
  filterButtonActive: { backgroundColor: colors.pale, borderColor: "#B5D0BF" },
  activeFilters: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
    marginBottom: 16,
  },
  activeFilter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 9,
    borderRadius: 7,
    backgroundColor: colors.pale,
  },
  activeFilterText: { fontSize: 12, color: colors.green, fontWeight: "500" },
  resultsLabel: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 12,
  },
  resultsText: {
    fontSize: 12,
    color: "#5B7064",
    fontWeight: "600",
    flexShrink: 1,
  },
  resultsHint: { fontSize: 11, color: "#7D8C84" },
  gridRow: { gap: 12 },
  exerciseCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
    padding: 16,
    backgroundColor: colors.paper,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    marginBottom: 10,
    minHeight: 112,
  },
  exerciseCardGrid: { flex: 1, maxWidth: "50%" },
  exerciseCardPressed: { backgroundColor: "#EBF3ED", borderColor: "#A1C3AF" },
  exerciseIcon: {
    width: 56,
    height: 62,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  exerciseInfo: { flex: 1, minWidth: 0 },
  exerciseTitleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  exerciseName: {
    flexShrink: 1,
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 21,
    color: colors.ink,
    letterSpacing: -0.2,
  },
  exerciseMeta: {
    fontSize: 12,
    color: "#6B7D72",
    marginTop: 5,
    lineHeight: 17,
  },
  metaDivider: { color: "#BDC7C0" },
  metricRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 9,
  },
  metricText: { color: colors.muted, fontSize: 11 },
  customTag: {
    fontSize: 10,
    color: colors.green,
    marginLeft: 5,
    fontWeight: "600",
  },
  goals: { marginBottom: 18 },
  loadingState: { padding: 38, alignItems: "center", gap: 12 },
  emptyState: {
    alignItems: "center",
    paddingVertical: 34,
    paddingHorizontal: 24,
  },
  emptyIcon: {
    padding: 18,
    borderRadius: 22,
    backgroundColor: colors.pale,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 19,
    fontWeight: "700",
    color: colors.ink,
    textAlign: "center",
  },
  emptyText: {
    fontSize: 14,
    lineHeight: 22,
    color: colors.muted,
    textAlign: "center",
    maxWidth: 320,
    marginTop: 9,
  },
  emptyButton: { padding: 14, marginTop: 12 },
  errorBox: {
    flexDirection: "row",
    gap: 12,
    padding: 16,
    backgroundColor: "#FBEEE9",
    borderRadius: 12,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 13,
    lineHeight: 20,
    color: "#914C3A",
    marginBottom: 6,
  },
  loadMore: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginTop: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#CBDCD1",
    borderRadius: 12,
  },
  loadMoreText: { color: colors.green, fontSize: 13, fontWeight: "700" },
  endNote: {
    fontSize: 12,
    color: colors.muted,
    textAlign: "center",
    paddingVertical: 24,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(20,40,29,0.38)",
  },
  filterSheet: {
    maxHeight: "88%",
    backgroundColor: colors.paper,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    width: "100%",
    maxWidth: 600,
    alignSelf: "center",
    paddingBottom: 20,
  },
  sheetHeader: {
    padding: 24,
    borderBottomWidth: 1,
    borderColor: colors.line,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sheetDone: {
    backgroundColor: colors.green,
    marginHorizontal: 24,
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  pressed: { opacity: 0.8 },
});
