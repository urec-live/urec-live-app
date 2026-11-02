import { emptySessionPrompt, isCardio, MIN_CARDIO_SECONDS, sessionWillBeSaved } from "@/utils/workoutSession";

const START = 1_000_000;
const strength = { muscleGroup: "Chest", startTime: START };
const cardio = { muscleGroup: "Cardio", startTime: START };
const after = (seconds: number) => START + seconds * 1000;

describe("sessionWillBeSaved", () => {
  it("saves a session with at least one set logged", () => {
    expect(sessionWillBeSaved(strength, after(5), [{ reps: 10 }])).toBe(true);
    expect(sessionWillBeSaved(strength, after(5), [{ weightLbs: 45 }])).toBe(true);
    // The machine picker's "3 sets" with no reps or weight is still sets the member logged
    expect(sessionWillBeSaved(strength, after(5), [{}, {}, {}])).toBe(true);
  });

  it("doesn't save a strength session with no sets, however long it ran", () => {
    expect(sessionWillBeSaved(strength, after(5))).toBe(false);
    expect(sessionWillBeSaved(strength, after(5), [])).toBe(false);
    expect(sessionWillBeSaved(strength, after(60 * 60))).toBe(false);
  });

  it("saves cardio with no sets once it lasted a minute", () => {
    expect(MIN_CARDIO_SECONDS).toBe(60);
    expect(sessionWillBeSaved(cardio, after(59))).toBe(false);
    expect(sessionWillBeSaved(cardio, after(60))).toBe(true);
    expect(sessionWillBeSaved(cardio, after(30 * 60))).toBe(true);
  });

  it("saves short cardio when sets were logged anyway", () => {
    expect(sessionWillBeSaved(cardio, after(10), [{ reps: 20 }])).toBe(true);
  });

  it("recognises cardio however the muscle group is written", () => {
    expect(isCardio("cardio")).toBe(true);
    expect(isCardio(" CARDIO ")).toBe(true);
    expect(isCardio("Chest")).toBe(false);
    expect(isCardio(undefined)).toBe(false);
  });
});

describe("emptySessionPrompt", () => {
  it("explains why a strength session won't be saved", () => {
    expect(emptySessionPrompt(strength)).toEqual({
      title: "End without saving?",
      message: "You haven't logged any sets, so this won't be saved as a workout.",
      confirmText: "End",
      cancelText: "Keep going",
      destructive: true,
    });
  });

  it("explains the one-minute rule for cardio", () => {
    expect(emptySessionPrompt(cardio).message).toBe("This lasted under a minute, so it won't be saved as a workout.");
  });
});
