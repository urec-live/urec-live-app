import type { HelpDemoLink } from "@/services/helpRequestAPI";
import { demoPlayerHref, isWebUrl, readDemoPlayerParams } from "@/utils/demoPlayer";

const VIDEO = "https://mdn.github.io/shared-assets/videos/flower.mp4";
const GIF = "https://media.giphy.com/media/KzeZ3OXHoSDVZH9cmy/giphy.gif";

function demo(overrides: Partial<HelpDemoLink> = {}): HelpDemoLink {
  return {
    exerciseName: "Leg Press",
    gifUrl: GIF,
    gifPlaceholder: true,
    videoUrl: VIDEO,
    videoPlaceholder: true,
    ...overrides,
  };
}

/** The params the player screen receives after navigating to demoPlayerHref(...) */
function paramsOf(href: ReturnType<typeof demoPlayerHref>) {
  if (typeof href === "string" || !("params" in href)) throw new Error("expected an href object");
  return href.params as Record<string, string>;
}

describe("isWebUrl", () => {
  it.each([VIDEO, GIF, "http://example.com", "HTTPS://EXAMPLE.COM/a.mp4", "  https://example.com/x  "])(
    "accepts %s",
    (url) => {
      expect(isWebUrl(url)).toBe(true);
    },
  );

  it.each([
    "javascript:alert(1)",
    "file:///sdcard/video.mp4",
    "intent://scan/#Intent;scheme=zxing;end",
    "ftp://example.com/x.gif",
    "//example.com/x.gif",
    "/relative/x.gif",
    "https://",
    "https:// spaced.example.com",
    "",
    "   ",
  ])("rejects %j", (url) => {
    expect(isWebUrl(url)).toBe(false);
  });

  it.each([null, undefined, 42, ["https://example.com"]])("rejects non-strings like %j", (value) => {
    expect(isWebUrl(value)).toBe(false);
  });
});

describe("demoPlayerHref", () => {
  it("passes both media, the placeholder flags and the medium to show", () => {
    expect(demoPlayerHref(demo(), "gif")).toEqual({
      pathname: "/demo-player",
      params: {
        title: "Leg Press",
        show: "gif",
        video: VIDEO,
        gif: GIF,
        videoPlaceholder: "1",
        gifPlaceholder: "1",
      },
    });
  });

  it("leaves out missing media and real (non-placeholder) flags", () => {
    expect(paramsOf(demoPlayerHref(demo({ gifUrl: null, gifPlaceholder: false, videoPlaceholder: false }), "video")))
      .toEqual({ title: "Leg Press", show: "video", video: VIDEO });
  });
});

describe("readDemoPlayerParams", () => {
  it("reads back what demoPlayerHref sent", () => {
    expect(readDemoPlayerParams(paramsOf(demoPlayerHref(demo(), "gif")))).toEqual({
      title: "Leg Press",
      videoUrl: VIDEO,
      gifUrl: GIF,
      videoPlaceholder: true,
      gifPlaceholder: true,
      show: "gif",
    });
  });

  it("treats real media as real", () => {
    const media = readDemoPlayerParams(paramsOf(demoPlayerHref(demo({ gifPlaceholder: false }), "video")));

    expect(media.gifPlaceholder).toBe(false);
    expect(media.videoPlaceholder).toBe(true);
  });

  it("drops links that aren't plain web links", () => {
    const media = readDemoPlayerParams({ title: "Leg Press", video: "javascript:alert(1)", gif: "file:///x.gif" });

    expect(media.videoUrl).toBeNull();
    expect(media.gifUrl).toBeNull();
  });

  it("opens on the other medium when the tapped one is missing", () => {
    expect(readDemoPlayerParams({ show: "video", gif: GIF }).show).toBe("gif");
    expect(readDemoPlayerParams({ show: "gif", video: VIDEO }).show).toBe("video");
  });

  it("opens on the video unless the GIF was asked for", () => {
    expect(readDemoPlayerParams({ video: VIDEO, gif: GIF }).show).toBe("video");
    expect(readDemoPlayerParams({ show: "nonsense", video: VIDEO, gif: GIF }).show).toBe("video");
  });

  it("takes the first value of repeated params and trims", () => {
    const media = readDemoPlayerParams({ title: ["  Leg Press ", "Other"], video: [` ${VIDEO} `, GIF] });

    expect(media.title).toBe("Leg Press");
    expect(media.videoUrl).toBe(VIDEO);
  });

  it("falls back to a generic title and no placeholder flags", () => {
    const media = readDemoPlayerParams({ title: "   ", video: VIDEO, videoPlaceholder: "true" });

    expect(media.title).toBe("How-to demo");
    expect(media.videoPlaceholder).toBe(false);
    expect(media.gifPlaceholder).toBe(false);
  });
});
