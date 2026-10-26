import { act, render, screen, waitFor } from "@testing-library/react-native";
import React from "react";

import HistoryScreen from "@/app/(tabs)/history";
import League from "@/app/(tabs)/league";
import Profile from "@/app/(tabs)/profile";
import DMInboxScreen from "@/app/chat/dm/index";
import { clearCache, invalidateCached } from "@/services/resourceCache";

// useFocusEffect runs on mount like the real one; refocus() replays it, as when the tab is reopened
const mockFocusCallbacks = new Set<() => void>();
jest.mock("expo-router", () => {
  const { useEffect } = jest.requireActual("react");
  return {
    useRouter: () => ({ push: jest.fn(), back: jest.fn(), replace: jest.fn() }),
    useFocusEffect: (callback: () => void) => {
      useEffect(() => {
        mockFocusCallbacks.add(callback);
        callback();
        return () => {
          mockFocusCallbacks.delete(callback);
        };
      }, [callback]);
    },
  };
});
const refocus = () => act(() => mockFocusCallbacks.forEach((callback) => callback()));

const mockApi = {
  getMyStats: jest.fn(),
  getMyPRs: jest.fn(),
  getCalendar: jest.fn(),
  getMyHistory: jest.fn(),
  getMyBadges: jest.fn(),
  getMyLeagueInfo: jest.fn(),
  getLeaderboard: jest.fn(),
  getConversations: jest.fn(),
};
// A function declaration, so the (hoisted) mock factories below can use it
function mockForward(name: keyof typeof mockApi) {
  return (...args: unknown[]) => mockApi[name](...args);
}
jest.mock("@/services/sessionAPI", () => ({
  sessionAPI: {
    getMyStats: mockForward("getMyStats"),
    getMyPRs: mockForward("getMyPRs"),
    getCalendar: mockForward("getCalendar"),
    getMyHistory: mockForward("getMyHistory"),
  },
}));
jest.mock("@/services/badgeAPI", () => ({ badgeAPI: { getMyBadges: mockForward("getMyBadges") } }));
jest.mock("@/services/leagueAPI", () => ({
  leagueAPI: { getMyLeagueInfo: mockForward("getMyLeagueInfo"), getLeaderboard: mockForward("getLeaderboard") },
}));
jest.mock("@/services/messagingAPI", () => ({ messagingAPI: { getConversations: mockForward("getConversations") } }));
jest.mock("@/services/socialAPI", () => ({ socialAPI: { updateMyProfile: jest.fn() } }));
jest.mock("@/services/machineAPI", () => ({ machineAPI: {} }));

jest.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { username: "sam", email: "sam@example.com" }, signOut: jest.fn() }),
}));
const mockFlushPending = jest.fn();
let mockLocalHistory: unknown[] = [];
jest.mock("@/contexts/WorkoutContext", () => ({
  useWorkout: () => ({ resetWorkout: jest.fn(), workoutHistory: mockLocalHistory, flushPendingSessions: mockFlushPending }),
}));
jest.mock("@/contexts/PlanContext", () => ({ usePlan: () => ({ activePlan: null }) }));

// Profile's cards print what they were given; the charts and calendars render nothing
jest.mock("@/components/StatsCard", () => function MockStatsCard({ label, value }: { label: string; value: unknown }) {
  const { Text: RNText } = jest.requireActual("react-native");
  return <RNText>{`${label}: ${value}`}</RNText>;
});
jest.mock("@/components/StreakDisplay", () => () => null);
jest.mock("@/components/WeeklyChart", () => () => null);
jest.mock("@/components/PRList", () => () => null);
jest.mock("@/components/BadgeGrid", () => () => null);
jest.mock("@/components/StreakCalendar", () => () => null);
jest.mock("@/components/LeagueCard", () => () => null);
jest.mock("@expo/vector-icons", () => ({ MaterialCommunityIcons: () => null }));
jest.mock("expo-linear-gradient", () => ({ LinearGradient: jest.requireActual("react-native").View }));
jest.mock("@react-native-async-storage/async-storage", () =>
  jest.requireActual("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => (resolve = res));
  return { promise, resolve };
}

const stats = (totalSessions: number) => ({
  totalSessions,
  totalDurationSeconds: 3600,
  topExercises: [],
  sessionsPerWeek: {},
  currentStreak: 2,
  longestStreak: 5,
  totalVolumeLbs: 1000,
  volumePerWeek: {},
  muscleGroupBreakdown: { Chest: 4 },
});
const session = (id: number, exerciseName: string) => ({
  id,
  exerciseName,
  machineName: "Bench 1",
  machineCode: "BP001",
  muscleGroup: "Chest",
  startedAt: "2026-10-15T14:00:00Z",
  endedAt: "2026-10-15T14:10:00Z",
  durationSeconds: 600,
  setDetails: [],
});

let now = 1_700_000_000_000;

beforeEach(async () => {
  jest.clearAllMocks();
  await clearCache();
  mockFocusCallbacks.clear();
  mockLocalHistory = [];
  now = 1_700_000_000_000;
  jest.spyOn(Date, "now").mockImplementation(() => now);
  mockApi.getMyStats.mockResolvedValue(stats(12));
  mockApi.getMyPRs.mockResolvedValue([]);
  mockApi.getCalendar.mockResolvedValue({ workoutDates: [] });
  mockApi.getMyBadges.mockResolvedValue({ earned: [], available: [] });
  mockApi.getMyLeagueInfo.mockResolvedValue({ tier: "BRONZE", weeklyScore: 500, rankInTier: 1, totalInTier: 2, weekStart: "2026-10-12", nextTierThreshold: 1000 });
  mockApi.getLeaderboard.mockResolvedValue({
    tier: "BRONZE",
    weekStart: "2026-10-12",
    entries: [{ rank: 1, username: "alex", weeklyScore: 900, me: false }],
    myEntry: { rank: 2, username: "sam", weeklyScore: 500, me: true },
  });
  mockApi.getConversations.mockResolvedValue([
    { partnerUsername: "alex", lastMessage: "See you at 6", lastSentAt: "2026-10-15T12:00:00Z", unread: true },
  ]);
  mockApi.getMyHistory.mockResolvedValue({ content: [session(1, "Bench Press")], totalPages: 1, totalElements: 1, number: 0 });
  mockFlushPending.mockResolvedValue(undefined);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("Profile", () => {
  it("doesn't reload when reopened soon after", async () => {
    render(<Profile />);
    expect(await screen.findByText("Workouts: 12")).toBeTruthy();
    expect(mockApi.getMyStats).toHaveBeenCalledTimes(1);

    now += 10_000;
    refocus();

    expect(screen.getByText("Workouts: 12")).toBeTruthy();
    await act(async () => {});
    expect(mockApi.getMyStats).toHaveBeenCalledTimes(1);
    expect(mockApi.getMyBadges).toHaveBeenCalledTimes(1);
  });

  it("after a workout, keeps the stats on screen while it fetches the new ones", async () => {
    render(<Profile />);
    await screen.findByText("Workouts: 12");
    const newer = deferred<ReturnType<typeof stats>>();
    mockApi.getMyStats.mockReturnValueOnce(newer.promise);

    now += 1_000;
    invalidateCached("user:sam:"); // what WorkoutContext does once a session is saved
    now += 1_000;
    refocus();

    // No spinner in between: the old numbers stay until the new ones arrive
    expect(screen.getByText("Workouts: 12")).toBeTruthy();
    await act(async () => newer.resolve(stats(13)));
    expect(screen.getByText("Workouts: 13")).toBeTruthy();
    expect(mockApi.getMyStats).toHaveBeenCalledTimes(2);
  });

  it("opens straight from the saved copy after leaving and coming back", async () => {
    const first = render(<Profile />);
    await screen.findByText("Workouts: 12");
    first.unmount();

    render(<Profile />);

    expect(screen.getByText("Workouts: 12")).toBeTruthy();
    await act(async () => {});
    expect(mockApi.getMyStats).toHaveBeenCalledTimes(1);
  });
});

describe("League", () => {
  it("refetches in the background once the saved copy is 30 s old, without a spinner", async () => {
    render(<League />);
    expect(await screen.findByText("alex")).toBeTruthy();

    now += 10_000;
    refocus();
    await act(async () => {});
    expect(mockApi.getLeaderboard).toHaveBeenCalledTimes(1);

    now += 30_000;
    refocus();
    expect(screen.getByText("alex")).toBeTruthy();
    await waitFor(() => expect(mockApi.getLeaderboard).toHaveBeenCalledTimes(2));
  });
});

describe("DM inbox", () => {
  it("checks for new messages on every visit, showing the saved list meanwhile", async () => {
    render(<DMInboxScreen />);
    expect(await screen.findByText("See you at 6")).toBeTruthy();
    expect(mockApi.getConversations).toHaveBeenCalledTimes(1);

    mockApi.getConversations.mockReturnValueOnce(new Promise(() => {}));
    refocus();

    expect(screen.getByText("See you at 6")).toBeTruthy();
    await waitFor(() => expect(mockApi.getConversations).toHaveBeenCalledTimes(2));
  });
});

describe("History", () => {
  it("shows a session saved after the tab was first opened", async () => {
    render(<HistoryScreen />);
    expect(await screen.findByText("Bench Press")).toBeTruthy();

    // The tab stays mounted while the member works out and ends a session
    mockApi.getMyHistory.mockResolvedValue({
      content: [session(2, "Chest Fly"), session(1, "Bench Press")],
      totalPages: 1,
      totalElements: 2,
      number: 0,
    });
    now += 5_000;
    invalidateCached("user:sam:");
    now += 1_000;
    refocus();

    expect(await screen.findByText("Chest Fly")).toBeTruthy();
    expect(mockApi.getMyHistory).toHaveBeenCalledTimes(2);
    // Sessions saved offline go up before each fetch
    expect(mockFlushPending).toHaveBeenCalledTimes(2);
  });

  it("offline, shows the saved history with the offline note", async () => {
    const first = render(<HistoryScreen />);
    await screen.findByText("Bench Press");
    first.unmount();
    mockApi.getMyHistory.mockRejectedValue(new Error("offline"));
    now += 60_000;

    render(<HistoryScreen />);

    expect(screen.getByText("Bench Press")).toBeTruthy();
    expect(await screen.findByText("Showing local data — offline")).toBeTruthy();
  });

  it("offline with nothing saved, falls back to this session's workouts", async () => {
    mockApi.getMyHistory.mockRejectedValue(new Error("offline"));
    mockLocalHistory = [
      {
        date: "2026-10-15",
        muscleGroups: ["Back"],
        sessions: [{ exerciseName: "Lat Pulldown", machineId: "LP001", muscleGroup: "Back", startTime: 0, endTime: 60_000 }],
      },
    ];

    render(<HistoryScreen />);

    expect(await screen.findByText("Lat Pulldown")).toBeTruthy();
    expect(screen.getByText("Showing local data — offline")).toBeTruthy();
  });
});
