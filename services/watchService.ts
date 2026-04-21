import { Platform } from 'react-native';
import * as WatchConnectivity from 'react-native-watch-connectivity';

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

    if (Platform.OS === 'ios') {
      WatchConnectivity.updateApplicationContext(message);
      WatchConnectivity.sendMessage(message, (reply) => console.log("⌚️ Watch Sync:", reply));
    }
  },

  subscribeToWatch: (
    onSetLogged: (reps: number, weight: number) => void,
    onWorkoutSync: (data: any) => void
  ) => {
    if (Platform.OS === 'ios') {
      const handleMsg = (msg: any) => {
        if (msg.type === 'LOG_SET') onSetLogged(msg.reps, msg.weight);
        if (msg.status) onWorkoutSync(msg);
      };
      const unsub1 = WatchConnectivity.watchEvents.on('message', handleMsg);
      const unsub2 = WatchConnectivity.watchEvents.on('application-context', handleMsg);
      return () => { unsub1(); unsub2(); };
    }
    return () => {};
  }
};