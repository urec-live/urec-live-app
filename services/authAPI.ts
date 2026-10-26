import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { noteRequestAnswered, noteRequestError, noteRequestStarted, unreachableKind } from './backendStatus';
import { API_BASE_URL } from './networkConfig';

// Called when refresh token fails — register via setAuthFailureHandler
let authFailureHandler: (() => void) | null = null;
export const setAuthFailureHandler = (handler: () => void) => {
  authFailureHandler = handler;
};

const REQUEST_TIMEOUT_MS = 10000;

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: REQUEST_TIMEOUT_MS,
});

// Render's free web service can take several minutes to resume after going idle.
// Keep the Google credential exchange alive while the backend wakes up; ordinary
// API calls retain the shorter timeout above.
export const GOOGLE_AUTH_TIMEOUT_MS = 210000;

// Add token to requests
api.interceptors.request.use(
  async (config) => {
    noteRequestStarted(config);
    const token = await AsyncStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Tell the "can't reach UREC Live" notice about every answer and failure,
// and handle token refresh on 401
api.interceptors.response.use(
  (response) => {
    noteRequestAnswered();
    return response;
  },
  async (error) => {
    noteRequestError(error);
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshNumber = noteRequestStarted();

      try {
        const refreshToken = await AsyncStorage.getItem('refreshToken');
        if (refreshToken) {
          const response = await axios.post(
            `${API_BASE_URL}/auth/refresh`,
            { refreshToken },
            { timeout: REQUEST_TIMEOUT_MS },
          );
          noteRequestAnswered();

          const { accessToken, refreshToken: newRefreshToken } = response.data;
          await AsyncStorage.setItem('accessToken', accessToken);
          await AsyncStorage.setItem('refreshToken', newRefreshToken);

          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        // The bare refresh call skips these interceptors, so report it here
        noteRequestError(refreshError, refreshNumber);
        if (unreachableKind(refreshError)) {
          // The server couldn't be asked, so the refresh token may still be good: stay signed in
          return Promise.reject(refreshError);
        }
        // Refresh failed — clear tokens and notify AuthContext
        await AsyncStorage.removeItem('accessToken');
        await AsyncStorage.removeItem('refreshToken');
        await AsyncStorage.removeItem('user');
        authFailureHandler?.();
      }
    }

    return Promise.reject(error);
  }
);

export const authAPI = {
  register: async (username: string, email: string, password: string) => {
    const response = await api.post('/auth/register', {
      username,
      email,
      password,
    });
    return response.data;
  },

  login: async (username: string, password: string) => {
    const response = await api.post('/auth/login', {
      username,
      password,
    });
    return response.data;
  },

  loginWithGoogle: async (idToken: string) => {
    const response = await api.post('/auth/google', { idToken }, { timeout: GOOGLE_AUTH_TIMEOUT_MS });
    return response.data;
  },

  refreshToken: async (refreshToken: string) => {
    const response = await api.post('/auth/refresh', {
      refreshToken,
    });
    return response.data;
  },

  test: async () => {
    const response = await api.get('/auth/test');
    return response.data;
  },
};

export default api;
