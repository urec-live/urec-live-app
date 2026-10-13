import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import React from "react";
import { Linking, Platform } from "react-native";

import DemoPlayerScreen from "@/app/demo-player";

const mockRouter = { back: jest.fn(), replace: jest.fn(), canGoBack: jest.fn(() => true) };
let mockParams: Record<string, string> = {};
jest.mock("expo-router", () => ({ useRouter: () => mockRouter, useLocalSearchParams: () => mockParams }));

const mockOpenBrowser = jest.fn();
jest.mock("expo-web-browser", () => ({ openBrowserAsync: (...args: unknown[]) => mockOpenBrowser(...args) }));

// expo-image as a plain view that exposes the animation controls and its load events
const mockStartAnimating = jest.fn(() => Promise.resolve());
const mockStopAnimating = jest.fn(() => Promise.resolve());
const mockImageMounts = jest.fn();
jest.mock("expo-image", () => {
  const { Component, createElement } = jest.requireActual("react");
  const { View } = jest.requireActual("react-native");
  class Image extends Component<Record<string, unknown>> {
    startAnimating = mockStartAnimating;
    stopAnimating = mockStopAnimating;
    componentDidMount() {
      mockImageMounts(this.props.source);
    }
    render() {
      const { testID, accessibilityLabel, onLoad, onError } = this.props;
      return createElement(View, { testID, accessibilityLabel, onLoad, onError });
    }
  }
  return { Image };
});

jest.mock("@expo/vector-icons", () => ({ MaterialCommunityIcons: () => null }));

const VIDEO = "https://mdn.github.io/shared-assets/videos/flower.mp4";
const GIF = "https://media.giphy.com/media/KzeZ3OXHoSDVZH9cmy/giphy.gif";

const params = (overrides: Record<string, string> = {}) => ({
  title: "Leg Press",
  show: "video",
  video: VIDEO,
  gif: GIF,
  videoPlaceholder: "1",
  gifPlaceholder: "1",
  ...overrides,
});

const tab = (name: "Video" | "GIF") => screen.getByRole("tab", { name });
const gif = () => screen.getByTestId("demo-gif");
const notice = () => screen.queryByTestId("placeholder-notice");

describe("Demo player screen", () => {
  const originalOS = Platform.OS;

  beforeEach(() => {
    jest.clearAllMocks();
    mockParams = params();
    mockOpenBrowser.mockResolvedValue({ type: "opened" });
  });

  afterEach(() => {
    Platform.OS = originalOS;
  });

  // ── Video ─────────────────────────────────────────────────────────────────

  it("opens on the video the member tapped, labelled as a placeholder", () => {
    render(<DemoPlayerScreen />);

    expect(screen.getByText("Leg Press")).toBeTruthy();
    expect(tab("Video")).toBeSelected();
    expect(tab("GIF")).not.toBeSelected();
    expect(screen.getByRole("button", { name: "Play the Leg Press video" })).toBeTruthy();
    expect(screen.queryByTestId("demo-gif")).toBeNull();
    expect(screen.getByText("Placeholder video: the real how-to demo for Leg Press is coming soon.")).toBeTruthy();
  });

  it("plays the video in the in-app browser's media player", async () => {
    render(<DemoPlayerScreen />);

    fireEvent.press(screen.getByRole("button", { name: "Play the Leg Press video" }));

    await waitFor(() => expect(screen.getByRole("button", { name: "Play the Leg Press video" })).toBeEnabled());
    expect(mockOpenBrowser).toHaveBeenCalledWith(VIDEO, { toolbarColor: "#000000" });
  });

  it("keeps the Play button disabled while the player opens", async () => {
    let finishOpening: (value: unknown) => void = () => {};
    mockOpenBrowser.mockReturnValue(new Promise((resolve) => (finishOpening = resolve)));
    render(<DemoPlayerScreen />);
    const play = screen.getByRole("button", { name: "Play the Leg Press video" });

    fireEvent.press(play);
    expect(play).toBeDisabled();
    fireEvent.press(play);
    expect(mockOpenBrowser).toHaveBeenCalledTimes(1);

    await act(async () => finishOpening({ type: "opened" }));
    expect(play).toBeEnabled();
  });

  it("falls back to the system when the in-app browser can't open", async () => {
    mockOpenBrowser.mockRejectedValue(new Error("no browser"));
    const openURL = jest.spyOn(Linking, "openURL").mockResolvedValue(true);
    render(<DemoPlayerScreen />);

    fireEvent.press(screen.getByRole("button", { name: "Play the Leg Press video" }));

    await waitFor(() => expect(openURL).toHaveBeenCalledWith(VIDEO));
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("says so when the video can't be opened at all", async () => {
    mockOpenBrowser.mockRejectedValue(new Error("no browser"));
    jest.spyOn(Linking, "openURL").mockRejectedValue(new Error("no handler"));
    render(<DemoPlayerScreen />);

    fireEvent.press(screen.getByRole("button", { name: "Play the Leg Press video" }));

    expect(
      await screen.findByText("Couldn't open the video player. Check your connection and try again."),
    ).toBeTruthy();
  });

  // ── GIF ───────────────────────────────────────────────────────────────────

  it("switches to the GIF, which plays inline", () => {
    render(<DemoPlayerScreen />);

    fireEvent.press(tab("GIF"));

    expect(tab("GIF")).toBeSelected();
    expect(gif()).toBeTruthy();
    expect(mockImageMounts).toHaveBeenCalledWith({ uri: GIF });
    expect(screen.getByLabelText("Leg Press GIF demo")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Play the Leg Press video" })).toBeNull();
    expect(screen.getByText("Placeholder GIF: the real how-to demo for Leg Press is coming soon.")).toBeTruthy();
  });

  it("opens on the GIF when that is what the member tapped", () => {
    mockParams = params({ show: "gif" });
    render(<DemoPlayerScreen />);

    expect(tab("GIF")).toBeSelected();
    expect(gif()).toBeTruthy();
  });

  it("shows a spinner until the GIF loads, then lets the member pause and resume it", () => {
    mockParams = params({ show: "gif" });
    render(<DemoPlayerScreen />);

    expect(screen.getByLabelText("Loading the GIF")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Pause the GIF" })).toBeDisabled();

    fireEvent(gif(), "load");
    expect(screen.queryByLabelText("Loading the GIF")).toBeNull();

    fireEvent.press(screen.getByRole("button", { name: "Pause the GIF" }));
    expect(mockStopAnimating).toHaveBeenCalledTimes(1);
    expect(mockStartAnimating).not.toHaveBeenCalled();

    fireEvent.press(screen.getByRole("button", { name: "Play the GIF" }));
    expect(mockStartAnimating).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Pause the GIF" })).toBeEnabled();
  });

  it("offers to retry when the GIF can't load, and fetches it again", () => {
    mockParams = params({ show: "gif" });
    render(<DemoPlayerScreen />);

    fireEvent(gif(), "error", { error: "404" });

    expect(screen.getByText("Couldn't load the GIF. Check your connection.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Pause the GIF" })).toBeDisabled();

    fireEvent.press(screen.getByRole("button", { name: "Try again" }));

    expect(mockImageMounts).toHaveBeenCalledTimes(2);
    expect(screen.queryByText("Couldn't load the GIF. Check your connection.")).toBeNull();
    expect(screen.getByLabelText("Loading the GIF")).toBeTruthy();
    fireEvent(gif(), "load");
    expect(screen.getByRole("button", { name: "Pause the GIF" })).toBeEnabled();
  });

  it("starts a retried GIF playing even if it was paused", () => {
    mockParams = params({ show: "gif" });
    render(<DemoPlayerScreen />);
    fireEvent(gif(), "load");
    fireEvent.press(screen.getByRole("button", { name: "Pause the GIF" }));

    fireEvent(gif(), "error", { error: "connection lost" });
    fireEvent.press(screen.getByRole("button", { name: "Try again" }));

    expect(screen.getByRole("button", { name: "Pause the GIF" })).toBeTruthy();
  });

  it("has no Pause button on the web, where GIFs can't be paused", () => {
    Platform.OS = "web";
    mockParams = params({ show: "gif" });
    render(<DemoPlayerScreen />);

    fireEvent(gif(), "load");

    expect(screen.queryByRole("button", { name: "Pause the GIF" })).toBeNull();
  });

  // ── Placeholders and missing media ────────────────────────────────────────

  it("doesn't call real media a placeholder", () => {
    mockParams = params({ show: "gif", gifPlaceholder: "0" });
    render(<DemoPlayerScreen />);

    expect(notice()).toBeNull();
    fireEvent.press(tab("Video"));
    expect(notice()).toBeTruthy();
  });

  it("has no switch when there is only one medium, and opens on whichever exists", () => {
    mockParams = params({ show: "gif", gif: "" });
    render(<DemoPlayerScreen />);

    expect(screen.queryByRole("tab")).toBeNull();
    expect(screen.getByRole("button", { name: "Play the Leg Press video" })).toBeTruthy();
  });

  it("refuses links that aren't web links", () => {
    mockParams = params({ video: "javascript:alert(1)", gif: "file:///sdcard/x.gif" });
    mockRouter.canGoBack.mockReturnValueOnce(false);
    render(<DemoPlayerScreen />);

    expect(screen.getByText("This demo isn't available")).toBeTruthy();
    expect(mockImageMounts).not.toHaveBeenCalled();
    fireEvent.press(screen.getByRole("button", { name: "Go back" }));
    expect(mockRouter.replace).toHaveBeenCalledWith("/(tabs)");
  });

  it("goes back to the help request", () => {
    render(<DemoPlayerScreen />);

    fireEvent.press(screen.getByRole("button", { name: "← Back" }));

    expect(mockRouter.back).toHaveBeenCalled();
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });
});
