import { render, screen } from "@testing-library/react-native";
import React from "react";

import RootLayout from "@/app/_layout";
import { cacheKeys, setCacheGymScope } from "@/services/cachedResources";

let mockUser: { username: string } | null = null;
let mockGym: { id: number; name: string } | null = null;
let mockGymLoading = false;
let mockPathname = "/";
const mockLiveUpdates = jest.fn();

const passThrough = ({ children }: { children?: React.ReactNode }) => <>{children}</>;

jest.mock("expo-router", () => {
  const { Text: RNText } = jest.requireActual("react-native");
  const Stack = ({ children }: { children?: React.ReactNode }) => <>{children}</>;
  function Screen({ name }: { name: string }) {
    return <RNText>{`screen:${name}`}</RNText>;
  }
  function Protected({ guard, children }: { guard: boolean; children?: React.ReactNode }) {
    return guard ? <>{children}</> : null;
  }
  Stack.Screen = Screen;
  Stack.Protected = Protected;
  return {
    Stack,
    usePathname: () => mockPathname,
    Link: ({ children }: { children?: React.ReactNode }) => <RNText>{children}</RNText>,
  };
});
jest.mock("../contexts/AuthContext", () => ({
  AuthProvider: passThrough,
  useAuth: () => ({ loading: false, user: mockUser }),
}));
jest.mock("@/contexts/GymContext", () => ({
  GymProvider: passThrough,
  useGym: () => ({ gym: mockGym, loading: mockGymLoading }),
}));
jest.mock("../contexts/WorkoutContext", () => ({ WorkoutProvider: passThrough }));
jest.mock("../contexts/PlanContext", () => ({ PlanProvider: passThrough }));
jest.mock("../contexts/HelpRequestContext", () => ({ HelpRequestProvider: passThrough }));
jest.mock("@/hooks/useLiveMachineUpdates", () => ({
  useLiveMachineUpdates: (...args: unknown[]) => mockLiveUpdates(...args),
}));
jest.mock("../components/BackendUnreachableNotice", () =>
  function BackendUnreachableNotice() {
    const { Text: RNText } = jest.requireActual("react-native");
    return <RNText>backend notice</RNText>;
  },
);
jest.mock("../components/HelpRequestBanner", () => () => null);
jest.mock("../components/DailyWorkoutSummary", () => () => null);
jest.mock("../components/ActiveExerciseTracker", () => () => null);
jest.mock("react-native-reanimated", () => ({}));
jest.mock("expo-status-bar", () => ({ StatusBar: () => null }));
jest.mock("react-native-safe-area-context", () => ({ SafeAreaProvider: passThrough, SafeAreaView: passThrough }));
jest.mock("@/hooks/use-color-scheme", () => ({ useColorScheme: () => "light" }));
jest.mock("@react-native-async-storage/async-storage", () =>
  jest.requireActual("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

/** The root layout after merging main's gym settings (#24) with this branch */
describe("Root layout", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUser = { username: "sam" };
    mockGym = { id: 7, name: "UREC" };
    mockGymLoading = false;
    mockPathname = "/";
    setCacheGymScope(null);
  });

  it("keys saved machine data by the member's gym", () => {
    render(<RootLayout />);
    expect(cacheKeys.machines).toBe("machines@7");

    mockGym = null;
    render(<RootLayout />);
    expect(cacheKeys.machines).toBe("machines@none");
  });

  it("keeps machine statuses live for a signed-in member", () => {
    render(<RootLayout />);
    expect(mockLiveUpdates).toHaveBeenLastCalledWith(true);
  });

  it("shows the unreachable notice on the sign-in screen", () => {
    mockUser = null;
    render(<RootLayout />);

    expect(screen.getByText("backend notice")).toBeTruthy();
    expect(screen.getByText("screen:(auth)")).toBeTruthy();
    expect(mockLiveUpdates).toHaveBeenLastCalledWith(false);
  });

  it("shows it on main's connect-to-a-gym screen too", () => {
    mockGym = null;
    mockPathname = "/equipment";
    render(<RootLayout />);

    expect(screen.getByText("Connect to a gym to use equipment, maps and QR check-in.")).toBeTruthy();
    expect(screen.getByText("backend notice")).toBeTruthy();
  });

  it("still shows main's loading message while the gym loads", () => {
    mockGym = null;
    mockGymLoading = true;
    mockPathname = "/machine/12";
    render(<RootLayout />);

    expect(screen.getByText("Loading your gym…")).toBeTruthy();
    expect(screen.queryByText(/screen:/)).toBeNull();
  });
});
