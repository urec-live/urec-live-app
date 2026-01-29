import api from "./authAPI";
import { machineAPI } from "./machineAPI";

export const userAPI = {
    getProfile: async () => {
        const headers = await machineAPI.authHeaders();
        const response = await api.get("/user/me", { headers });
        return response.data;
    },

    changePassword: async (oldPassword: string, newPassword: string) => {
        const headers = await machineAPI.authHeaders();
        await api.post("/user/change-password", { oldPassword, newPassword }, { headers });
    },

    updateEmail: async (newEmail: string) => {
        const headers = await machineAPI.authHeaders();
        const response = await api.post('/user/update-email', { newEmail }, { headers });
        return response.data;
    },

    deleteAccount: async () => {
        const headers = await machineAPI.authHeaders();
        await api.delete('/user/me', { headers });
    },

    searchUsers: async (query: string) => {
        const headers = await machineAPI.authHeaders();
        const response = await api.get(`/user/search?query=${encodeURIComponent(query)}`, { headers });
        return response.data;
    },

    updateSettings: async (settings: { pushNotificationsEnabled?: boolean }) => {
        const headers = await machineAPI.authHeaders();
        const response = await api.post('/user/settings', settings, { headers });
        return response.data;
    },
};
