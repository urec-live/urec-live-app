import { Platform } from 'react-native';

type WatchConnectivityModule = {
  updateApplicationContext: (message: Record<string, unknown>) => void;
  sendMessage: (message: Record<string, unknown>, callback?: (reply: unknown) => void) => void;
  watchEvents: {
    on: (event: 'message' | 'application-context', handler: (msg: any) => void) => () => void;
  };
};

const getWatchConnectivity = (): WatchConnectivityModule | null => {
  if (Platform.OS !== 'ios') {
    return null;
  }

  try {
    // Lazy require prevents web bundler from evaluating native-only module internals.
    return require('react-native-watch-connectivity') as WatchConnectivityModule;
  } catch {
    return null;
  }
};

export const WatchService = {
  syncWorkout: (
    exercise: string,
    code: string,
    status: 'START' | 'PAUSE' | 'END',
    payload?: { exerciseStartTime: number; restStartTime?: number }
  ) => {
    // Prevent crashes by providing defaults if payload is missing
    const message = {
      type: 'WORKOUT_STATUS',
      exercise,
      code,
      status: status.toUpperCase(),
      timestamp: Date.now(),
      exerciseStartTime: payload?.exerciseStartTime ?? Date.now(),
      restStartTime: payload?.restStartTime ?? 0,
    };

    const watchConnectivity = getWatchConnectivity();
    if (watchConnectivity) {
      watchConnectivity.updateApplicationContext(message);
      watchConnectivity.sendMessage(message, (reply) => console.log('Watch Sync:', reply));
    }
  },

  subscribeToWatch: (
    onSetLogged: (reps: number, weight: number) => void,
    onWorkoutSync: (data: any) => void
  ) => {
    const watchConnectivity = getWatchConnectivity();
    if (watchConnectivity) {
      const handleMsg = (msg: any) => {
        if (msg.type === 'LOG_SET') onSetLogged(msg.reps, msg.weight);
        if (msg.status) onWorkoutSync(msg);
      };
      const unsub1 = watchConnectivity.watchEvents.on('message', handleMsg);
      const unsub2 = watchConnectivity.watchEvents.on('application-context', handleMsg);
      return () => { unsub1(); unsub2(); };
    }
    return () => {};
  }
};