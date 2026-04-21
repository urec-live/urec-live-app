export const WatchService = {
  syncWorkout: (
    _exercise: string,
    _code: string,
    _status: 'START' | 'PAUSE' | 'END',
    _payload?: { exerciseStartTime: number; restStartTime?: number }
  ) => {
    // Web has no Apple Watch connectivity bridge; intentionally no-op.
  },

  subscribeToWatch: (
    _onSetLogged: (reps: number, weight: number) => void,
    _onWorkoutSync: (data: any) => void
  ) => {
    return () => {};
  },
};
