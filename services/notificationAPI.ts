import api from "./authAPI";

export interface PushTokenRegistration {
  token: string;
  platform?: string;
  deviceName?: string | null;
}

export const notificationAPI = {
  registerPushToken: async (payload: PushTokenRegistration): Promise<void> => {
    await api.post("/push-tokens", payload);
  },
};
