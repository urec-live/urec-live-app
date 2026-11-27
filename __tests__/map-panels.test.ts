import {
  dragProgress,
  FLING_VELOCITY,
  followCamera,
  FOLLOW_FIT,
  FOLLOW_FOCUS,
  FOLLOW_NONE,
  settlesOpen,
} from "@/utils/mapPanels";

describe("dragProgress", () => {
  it("moves by the dragged share of the panel's travel", () => {
    expect(dragProgress(0, 100, 400)).toBe(0.25);
    expect(dragProgress(1, -100, 400)).toBe(0.75);
  });
  it("stops at fully open and fully closed", () => {
    expect(dragProgress(0.5, 1000, 400)).toBe(1);
    expect(dragProgress(0.5, -1000, 400)).toBe(0);
  });
  it("stays put before the panel has been measured", () => {
    expect(dragProgress(1, -150, 0)).toBe(1);
    expect(dragProgress(0, 150, -5)).toBe(0);
  });
});

describe("settlesOpen", () => {
  it("settles at the nearer end after a slow release", () => {
    expect(settlesOpen(0.6, 0)).toBe(true);
    expect(settlesOpen(0.5, 0)).toBe(true);
    expect(settlesOpen(0.4, 0)).toBe(false);
    expect(settlesOpen(0.9, -(FLING_VELOCITY - 1))).toBe(true);
  });
  it("follows a flick, however short the drag", () => {
    expect(settlesOpen(0.95, -FLING_VELOCITY)).toBe(false);
    expect(settlesOpen(0.05, FLING_VELOCITY)).toBe(true);
    expect(settlesOpen(0.05, 2000)).toBe(true);
  });
});

describe("followCamera", () => {
  const layout = (top: number, bottom: number, focusKey?: string) => ({
    top,
    bottom,
    focusKey,
  });
  it("fits the floor on first layout, or focuses an item already selected", () => {
    expect(followCamera(null, layout(200, 76), FOLLOW_FIT)).toEqual({
      move: "fit",
      follow: FOLLOW_FIT,
      slide: false,
    });
    expect(followCamera(null, layout(200, 76, "m:2"), FOLLOW_FIT)).toEqual({
      move: "focus",
      follow: FOLLOW_FOCUS,
      slide: false,
    });
  });
  it("slides to stay fitted when only a panel changed", () => {
    expect(
      followCamera(layout(200, 76), layout(52, 76), FOLLOW_FIT),
    ).toEqual({ move: "fit", follow: FOLLOW_FIT, slide: true });
  });
  it("jumps to a newly selected item, then slides to keep it centered", () => {
    expect(
      followCamera(layout(200, 76), layout(200, 76, "m:2"), FOLLOW_FIT),
    ).toEqual({ move: "focus", follow: FOLLOW_FOCUS, slide: false });
    // The selection card joined the closed sheet.
    expect(
      followCamera(layout(200, 76, "m:2"), layout(200, 180, "m:2"), FOLLOW_FOCUS),
    ).toEqual({ move: "focus", follow: FOLLOW_FOCUS, slide: true });
  });
  it("never moves a view the member panned or zoomed, only keeps it in bounds", () => {
    // A panel closed: any correction glides along with it.
    expect(
      followCamera(layout(200, 76), layout(52, 76), FOLLOW_NONE),
    ).toEqual({ move: "clamp", follow: FOLLOW_NONE, slide: true });
    expect(
      followCamera(layout(200, 76, "m:2"), layout(52, 76, "m:2"), FOLLOW_NONE),
    ).toEqual({ move: "clamp", follow: FOLLOW_NONE, slide: true });
    // The viewport itself changed size (same panels): no animation, as before.
    expect(
      followCamera(layout(200, 76), layout(200, 76), FOLLOW_NONE),
    ).toEqual({ move: "clamp", follow: FOLLOW_NONE, slide: false });
  });
  it("leaves the view where it is on deselect and stops following", () => {
    expect(
      followCamera(layout(200, 180, "m:2"), layout(200, 76), FOLLOW_FOCUS),
    ).toEqual({ move: "none", follow: FOLLOW_NONE, slide: false });
    // Still following the whole floor (the selection never moved the camera).
    expect(
      followCamera(layout(200, 76, "m:2"), layout(200, 76), FOLLOW_FIT),
    ).toEqual({ move: "none", follow: FOLLOW_FIT, slide: false });
  });
  it("still focuses a newly selected item after the member moved the map", () => {
    expect(
      followCamera(layout(200, 76, "m:2"), layout(200, 76, "m:3"), FOLLOW_NONE),
    ).toEqual({ move: "focus", follow: FOLLOW_FOCUS, slide: false });
  });
});
