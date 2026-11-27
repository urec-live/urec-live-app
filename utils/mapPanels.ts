// Motion rules shared by the equipment map's sliding panels. Progress runs from 0 (closed) to
// 1 (open); these run as worklets inside gesture callbacks and as plain functions in tests.

/**
 * A release faster than this (dp/s) follows the flick instead of the position. Low enough that
 * an ordinary swipe that stops short of halfway still counts.
 */
export const FLING_VELOCITY = 300;

/** Progress after dragging `distance` px toward open, from `start`, on a panel that travels `travel` px. */
export function dragProgress(
  start: number,
  distance: number,
  travel: number,
): number {
  "worklet";
  if (travel <= 0) return start;
  return Math.min(1, Math.max(0, start + distance / travel));
}

/** Whether a released panel settles open: a flick wins, otherwise the nearer end. */
export function settlesOpen(
  progress: number,
  velocityTowardOpen: number,
): boolean {
  "worklet";
  if (Math.abs(velocityTowardOpen) >= FLING_VELOCITY)
    return velocityTowardOpen > 0;
  return progress >= 0.5;
}

/** What the map camera follows on its own when the layout around it changes. */
export const FOLLOW_NONE = 0,
  FOLLOW_FIT = 1,
  FOLLOW_FOCUS = 2;

export interface CameraLayout {
  focusKey?: string;
  /** Pixels covered by panels at the top and bottom of the map. */
  top: number;
  bottom: number;
}

/**
 * Decides the camera move after the viewport, panels or focus change. The camera keeps showing
 * the whole floor or the focused item while it is following one; once the member pans or
 * zooms (follow = FOLLOW_NONE) it stays put and is only clamped, so opening or closing a panel
 * never yanks their view away (a clamp only closes a gap a panel left). `slide` animates moves
 * caused only by a panel, so the map glides along with it.
 */
export function followCamera(
  prev: CameraLayout | null,
  next: CameraLayout,
  follow: number,
): { move: "focus" | "fit" | "clamp" | "none"; follow: number; slide: boolean } {
  const focusChanged = !prev || prev.focusKey !== next.focusKey;
  const slide =
    !!prev &&
    !focusChanged &&
    (prev.top !== next.top || prev.bottom !== next.bottom);
  if (next.focusKey && (focusChanged || follow === FOLLOW_FOCUS))
    return { move: "focus", follow: FOLLOW_FOCUS, slide };
  // Deselected: stay where the member was looking.
  if (prev && focusChanged)
    return {
      move: "none",
      follow: follow === FOLLOW_FOCUS ? FOLLOW_NONE : follow,
      slide: false,
    };
  if (!prev || follow === FOLLOW_FIT)
    return { move: "fit", follow: FOLLOW_FIT, slide };
  return { move: "clamp", follow, slide };
}
