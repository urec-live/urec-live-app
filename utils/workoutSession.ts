import type { ConfirmOptions } from "@/utils/confirm";

/** Cardio is timed rather than logged in sets, so a cardio session counts once it lasts this long */
export const MIN_CARDIO_SECONDS = 60;

interface EndingSession {
  muscleGroup: string;
  startTime: number;
}

export const isCardio = (muscleGroup: string | undefined) => muscleGroup?.trim().toLowerCase() === "cardio";

/**
 * Whether ending a session saves it as a workout. A session with no sets logged is empty and isn't
 * saved, so it doesn't count toward streaks, badges, the league or today's goals. Cardio has no
 * sets, so it's saved once it has lasted MIN_CARDIO_SECONDS.
 *
 * `setDetails` should already leave out blank rows (no reps and no weight).
 */
export function sessionWillBeSaved(session: EndingSession, endTime: number, setDetails?: readonly unknown[]): boolean {
  if ((setDetails?.length ?? 0) > 0) return true;
  return isCardio(session.muscleGroup) && endTime - session.startTime >= MIN_CARDIO_SECONDS * 1000;
}

/** The prompt before ending a session that won't be saved */
export function emptySessionPrompt(session: EndingSession): ConfirmOptions {
  return {
    title: "End without saving?",
    message: isCardio(session.muscleGroup)
      ? "This lasted under a minute, so it won't be saved as a workout."
      : "You haven't logged any sets, so this won't be saved as a workout.",
    confirmText: "End",
    cancelText: "Keep going",
    destructive: true,
  };
}
