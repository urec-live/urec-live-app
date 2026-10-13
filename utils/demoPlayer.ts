import type { Href } from "expo-router";

import type { HelpDemoLink } from "@/services/helpRequestAPI";

export type DemoMedium = "video" | "gif";

/** What the demo player screen plays, read back from its route params. */
export interface DemoPlayerMedia {
  title: string;
  videoUrl: string | null;
  gifUrl: string | null;
  videoPlaceholder: boolean;
  gifPlaceholder: boolean;
  /** The medium to show first: the one the member tapped, if it is there. */
  show: DemoMedium;
}

type RouteParams = Record<string, string | string[] | undefined>;

/** Only plain web links are played. Anything else (javascript:, file:, intent:…) counts as missing. */
export function isWebUrl(url: unknown): url is string {
  return typeof url === "string" && /^https?:\/\/[^\s/?#]+\S*$/i.test(url.trim());
}

/** The demo player route for one demo, opening on the medium the member tapped. */
export function demoPlayerHref(demo: HelpDemoLink, show: DemoMedium): Href {
  const params: Record<string, string> = { title: demo.exerciseName, show };
  if (demo.videoUrl) params.video = demo.videoUrl;
  if (demo.gifUrl) params.gif = demo.gifUrl;
  if (demo.videoPlaceholder) params.videoPlaceholder = "1";
  if (demo.gifPlaceholder) params.gifPlaceholder = "1";
  return { pathname: "/demo-player", params };
}

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

/** Reads {@link demoPlayerHref}'s params, dropping anything that isn't a web link. */
export function readDemoPlayerParams(params: RouteParams): DemoPlayerMedia {
  const url = (name: string) => {
    const value = first(params[name]);
    return isWebUrl(value) ? value.trim() : null;
  };
  const videoUrl = url("video");
  const gifUrl = url("gif");
  const wanted: DemoMedium = first(params.show) === "gif" ? "gif" : "video";
  const available = (medium: DemoMedium) => (medium === "video" ? videoUrl : gifUrl) !== null;

  return {
    title: first(params.title)?.trim() || "How-to demo",
    videoUrl,
    gifUrl,
    videoPlaceholder: first(params.videoPlaceholder) === "1",
    gifPlaceholder: first(params.gifPlaceholder) === "1",
    show: available(wanted) ? wanted : wanted === "video" ? "gif" : "video",
  };
}
