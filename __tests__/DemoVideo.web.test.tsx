import { render, screen } from "@testing-library/react-native";
import React from "react";

// Jest resolves the native files, so import the web build of the player directly
import DemoVideo from "@/components/DemoVideo.web";

const VIDEO = "https://mdn.github.io/shared-assets/videos/flower.mp4";

describe("Demo video on the web", () => {
  it("plays inline in the browser's own video player", () => {
    render(<DemoVideo url={VIDEO} title="Leg Press" />);

    const [video] = screen.getByTestId("demo-video").children;
    expect(typeof video === "object" && video.type).toBe("video");
    expect(typeof video === "object" && video.props).toEqual(
      expect.objectContaining({
        src: VIDEO,
        controls: true,
        playsInline: true,
        preload: "metadata",
        "aria-label": "Leg Press video",
      }),
    );
  });
});
