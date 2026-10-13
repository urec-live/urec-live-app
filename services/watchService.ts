import { Platform, DeviceEventEmitter } from 'react-native';

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

// react-native-wear-connectivity actual API:
//   sendMessage(payload, successCb, errorCb) — sends payload as Wearable message path (JSON string)
//   Incoming messages arrive via DeviceEventEmitter 'message' event (fired by the library's
//   headless task after parsing messageEvent.path as JSON on the native side).
const getWearConnectivity = () => {
  if (Platform.OS !== 'android') {
    return null;
  }

  try {
    return require('react-native-wear-connectivity') as {
      sendMessage: (
        message: Record<string, unknown>,
        onSuccess: (reply: unknown) => void,
        onError: (err: string) => void
      ) => void;
    };
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
    const message = {
      type: 'WORKOUT_STATUS',
      exercise,
      code,
      status: status.toUpperCase(),
      timestamp: Date.now(),
      exerciseStartTime: payload?.exerciseStartTime ?? Date.now(),
      restStartTime: payload?.restStartTime ?? 0,
    };

    if (Platform.OS === 'ios') {
      const watchConnectivity = getWatchConnectivity();
      if (watchConnectivity) {
        watchConnectivity.updateApplicationContext(message);
        watchConnectivity.sendMessage(message, (reply) => console.log('Watch Sync (iOS):', reply));
      }
    } else if (Platform.OS === 'android') {
      const wear = getWearConnectivity();
      if (wear) {
        wear.sendMessage(
          message,
          () => console.log('Wear Sync (Android): sent'),
          (err) => console.log('Wear Sync (Android) Error:', err)
        );
      }
    }
  },

  subscribeToWatch: (
    onSetLogged: (reps: number, weight: number) => void,
    onWorkoutSync: (data: any) => void
  ) => {
    const unsubscribers: Array<() => void> = [];

    if (Platform.OS === 'ios') {
      const watchConnectivity = getWatchConnectivity();
      if (watchConnectivity) {
        const handleMsg = (msg: any) => {
          if (msg.type === 'LOG_SET') onSetLogged(msg.reps, msg.weight);
          if (msg.status) onWorkoutSync(msg);
        };
        unsubscribers.push(watchConnectivity.watchEvents.on('message', handleMsg));
        unsubscribers.push(watchConnectivity.watchEvents.on('application-context', handleMsg));
      }
    } else if (Platform.OS === 'android') {
      // The library's native WearConnectivityMessageClient parses messageEvent.path as JSON
      // and emits via the WearConnectivityTask headless task → DeviceEventEmitter.emit('message').
      // Do NOT use watchEvents from the library — it references an undefined NativeModule.
      const sub = DeviceEventEmitter.addListener('message', (msg: any) => {
        if (msg.type === 'LOG_SET') onSetLogged(msg.reps, msg.weight);
        if (msg.status) onWorkoutSync(msg);
      });
      unsubscribers.push(() => sub.remove());
    }

    return () => {
      unsubscribers.forEach((unsub) => unsub());
    };
  },
};
