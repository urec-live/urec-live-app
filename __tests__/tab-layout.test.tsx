import { render } from "@testing-library/react-native";
import React from "react";
import { Platform, StyleSheet, type ViewStyle } from "react-native";

import TabLayout from "@/app/(tabs)/_layout";

type ScreenProps = { name: string; options?: { href?: string | null } };
let mockTabs: { screenOptions: { tabBarStyle: ViewStyle }; screens: ScreenProps[] };
let mockGym: { id: number; name: string } | null = null;

jest.mock("expo-router", () => {
  const ReactActual = jest.requireActual("react");
  function Tabs({ screenOptions, children }: { screenOptions: { tabBarStyle: ViewStyle }; children?: React.ReactNode }) {
    const screens: ScreenProps[] = [];
    ReactActual.Children.forEach(children, (child: React.ReactElement<ScreenProps>) => screens.push(child.props));
    mockTabs = { screenOptions, screens };
    return null;
  }
  Tabs.Screen = function Screen() {
    return null;
  };
  return { Tabs };
});
jest.mock("@/contexts/GymContext", () => ({ useGym: () => ({ gym: mockGym }) }));
jest.mock("expo-blur", () => ({ BlurView: () => null }));

// What React Navigation 7's BottomTabBar does: its own height and safe-area inset first, the app's
// tabBarStyle last, so a key in tabBarStyle wins even when its value is undefined
const tabBarAsDrawn = (): ViewStyle =>
  StyleSheet.flatten([{ height: 83, paddingBottom: 34 }, mockTabs.screenOptions.tabBarStyle]);

const asPlatform = (os: typeof Platform.OS) => jest.replaceProperty(Platform, "OS", os);

beforeEach(() => {
  mockGym = null;
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("tab bar", () => {
  it.each(["android", "ios"] as const)("keeps React Navigation's height and bottom inset on %s", (os) => {
    asPlatform(os);
    render(<TabLayout />);

    // #24 set both to undefined on phones, and the bar collapsed to nothing: no way to reach Profile
    expect(tabBarAsDrawn()).toMatchObject({ height: 83, paddingBottom: 34 });
  });

  it("is a fixed 64 px with its own padding on web", () => {
    asPlatform("web");
    render(<TabLayout />);

    expect(tabBarAsDrawn()).toMatchObject({ height: 64, paddingBottom: 8 });
  });

  it("always shows Workout, History, League and Profile; Equipment only with a gym", () => {
    asPlatform("android");
    render(<TabLayout />);
    const shown = () => mockTabs.screens.filter((s) => s.options?.href !== null).map((s) => s.name);

    expect(shown()).toEqual(["workout", "history", "league", "profile"]);

    mockGym = { id: 1, name: "UREC" };
    render(<TabLayout />);
    expect(shown()).toEqual(["workout", "equipment", "history", "league", "profile"]);
  });
});
