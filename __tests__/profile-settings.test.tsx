import { act, fireEvent, render, screen } from "@testing-library/react-native";
import React from "react";
import { Switch, Text } from "react-native";

import Profile from "@/app/(tabs)/profile";

const mockRouter = { push: jest.fn(), replace: jest.fn() };
jest.mock("expo-router", () => {
  const { useEffect } = jest.requireActual("react");
  return {
    useRouter: () => mockRouter,
    // Behave like a first focus: run the effect once on mount
    useFocusEffect: (effect: () => void | (() => void)) => useEffect(effect, [effect]),
  };
});

jest.mock("expo-linear-gradient", () => ({
  LinearGradient: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock("@expo/vector-icons", () => ({ MaterialCommunityIcons: () => null }));

jest.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ signOut: jest.fn(), user: { username: "jdoe", email: "jdoe@example.com" } }),
}));
jest.mock("@/contexts/WorkoutContext", () => ({ useWorkout: () => ({ resetWorkout: jest.fn() }) }));
jest.mock("@/contexts/PlanContext", () => ({ usePlan: () => ({ activePlan: null }) }));

// The stats widgets aren't under test here
jest.mock("@/components/StatsCard", () => ({ __esModule: true, default: () => null }));
jest.mock("@/components/StreakDisplay", () => ({ __esModule: true, default: () => null }));
jest.mock("@/components/WeeklyChart", () => ({ __esModule: true, default: () => null }));
jest.mock("@/components/PRList", () => ({ __esModule: true, default: () => null }));
jest.mock("@/components/BadgeGrid", () => ({ __esModule: true, default: () => null }));
jest.mock("@/components/StreakCalendar", () => ({ __esModule: true, default: () => null }));
jest.mock("@/services/sessionAPI", () => ({
  sessionAPI: {
    getMyStats: () => Promise.resolve(null),
    getMyPRs: () => Promise.resolve([]),
    getCalendar: () => Promise.resolve({ workoutDates: [] }),
  },
}));
jest.mock("@/services/badgeAPI", () => ({ badgeAPI: { getMyBadges: () => Promise.resolve({ earned: [] }) } }));

const mockUpdateMyProfile = jest.fn();
jest.mock("@/services/socialAPI", () => ({
  socialAPI: { updateMyProfile: (...args: unknown[]) => mockUpdateMyProfile(...args) },
}));

/**
 * The Settings section after merging main into equipment-issue-reports: gamify's Public Profile switch and
 * this branch's My Equipment Reports link both sit under Workout Plan.
 */
describe("Profile settings", () => {
  beforeEach(() => jest.clearAllMocks());

  async function renderProfile(): Promise<void> {
    render(<Profile />);
    await screen.findByText("My Equipment Reports");
    await act(async () => {}); // let the stats requests settle
  }

  const texts = (): string[] =>
    screen.UNSAFE_getAllByType(Text).map((node) => [node.props.children].flat().join(""));

  it("lists Public Profile and My Equipment Reports under Workout Plan", async () => {
    await renderProfile();

    const labels = texts();
    const plan = labels.indexOf("Workout Plan");
    expect(plan).toBeGreaterThanOrEqual(0);
    expect(labels.indexOf("Public Profile")).toBeGreaterThan(plan);
    expect(labels.indexOf("My Equipment Reports")).toBeGreaterThan(labels.indexOf("Public Profile"));
  });

  it("opens My Equipment Reports", async () => {
    await renderProfile();

    fireEvent.press(screen.getByText("My Equipment Reports"));

    expect(mockRouter.push).toHaveBeenCalledWith("/my-reports");
  });

  it("saves the Public Profile switch", async () => {
    mockUpdateMyProfile.mockResolvedValue({});
    await renderProfile();
    expect(screen.UNSAFE_getByType(Switch).props.value).toBe(false);

    await act(async () => {
      fireEvent(screen.UNSAFE_getByType(Switch), "valueChange", true);
    });

    expect(mockUpdateMyProfile).toHaveBeenCalledWith({ profileVisibility: "PUBLIC" });
    expect(screen.UNSAFE_getByType(Switch).props.value).toBe(true);
  });

  it("puts the Public Profile switch back if saving fails", async () => {
    mockUpdateMyProfile.mockRejectedValue(new Error("offline"));
    await renderProfile();

    await act(async () => {
      fireEvent(screen.UNSAFE_getByType(Switch), "valueChange", true);
    });

    expect(screen.UNSAFE_getByType(Switch).props.value).toBe(false);
  });
});
