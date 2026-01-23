import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// API URL based on platform
let API_BASE_URL = 'http://localhost:8080/api';

const getDevHost = (): string | null => {
  const hostUri =
    Constants.expoConfig?.hostUri ||
    (Constants.manifest as { debuggerHost?: string } | null)?.debuggerHost;
  if (!hostUri) return null;
  return hostUri.split(":")[0] || null;
};

// Adjust the base URL with your local IP address when testing locally
if (Platform.OS === 'android') {
  const devHost = getDevHost();
  if (!Constants.isDevice) {
    // Android emulator: use special IP for host machine
    API_BASE_URL = 'http://10.0.2.2:8080/api';
  } else if (devHost) {
    API_BASE_URL = `http://${devHost}:8080/api`;
  }
} else if (Platform.OS === 'ios') {
  const devHost = getDevHost();
  if (Constants.isDevice && devHost) {
    API_BASE_URL = `http://${devHost}:8080/api`;
  } else {
    // iOS simulator: use localhost
    API_BASE_URL = 'http://localhost:8080/api';
  }
} else if (Platform.OS === 'web') {
  // Web: use localhost (or update for production)
  API_BASE_URL = 'http://localhost:8080/api';
}

const envApiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
if (envApiBaseUrl) {
  API_BASE_URL = envApiBaseUrl.replace(/\/$/, "");
  if (!API_BASE_URL.endsWith("/api")) {
    API_BASE_URL = `${API_BASE_URL}/api`;
  }
}

let currentAuthHeader: string | null = null;

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

export const setAuthToken = (token: string | null) => {
  if (token) {
    currentAuthHeader = `Bearer ${token}`;
    api.defaults.headers.common.Authorization = currentAuthHeader;
  } else {
    currentAuthHeader = null;
    delete api.defaults.headers.common.Authorization;
  }
};

export const getAuthHeader = (): string | null => currentAuthHeader;

// Add token to requests
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Handle token refresh on 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const refreshToken = await AsyncStorage.getItem('refreshToken');
        if (refreshToken) {
          const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
            refreshToken,
          });

          const { accessToken, refreshToken: newRefreshToken } = response.data;
          await AsyncStorage.setItem('accessToken', accessToken);
          await AsyncStorage.setItem('refreshToken', newRefreshToken);

          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          setAuthToken(accessToken);
          return api(originalRequest);
        }
      } catch {
        // Refresh failed; keep current token so we don't force logout on a single 401.
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
