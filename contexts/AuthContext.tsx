import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { authAPI, setAuthToken } from '../services/authAPI';
import { userAPI } from '../services/userAPI';
import { registerForPushNotificationsAsync } from '@/services/pushNotifications';

interface User {
  username: string;
  email: string;
  roles: string[];
  pushNotificationsEnabled?: boolean;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (username: string, password: string) => Promise<void>;
  signUp: (username: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  restoreToken: () => Promise<void>;
  isSignedIn: boolean;
  isGuest: boolean;
  startGuest: () => Promise<void>;
  endGuest: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [isGuest, setIsGuest] = useState(false);

  // Try to restore token on app load
  useEffect(() => {
    restoreToken();
  }, []);

  const restoreToken = async () => {
    try {
      setLoading(true);
      const userData = await AsyncStorage.getItem('user');
      const accessToken = await AsyncStorage.getItem('accessToken');
      const guestFlag = await AsyncStorage.getItem('guest');

      if (userData && accessToken) {
        setAuthToken(accessToken);
        // Optimistically set user
        const parsedUser = JSON.parse(userData);
        // Ensure roles is at least empty array if missing (migration)
        if (!parsedUser.roles) parsedUser.roles = [];
        setUser(parsedUser);
        setIsSignedIn(true);
        setIsGuest(false);

        // Verify validity in background
        try {
          // Profile refresh logic might need update if API doesn't return roles in /me
          // For now, rely on stored roles or re-login for role update
          await userAPI.getProfile();
          registerForPushNotificationsAsync().catch((e) => console.log(e));
        } catch (e: any) {
          // ... existing error handling
          if (e.response && e.response.status === 401) {
            console.log("Token invalid (401), logging out:", e);
            await AsyncStorage.removeItem('accessToken');
            await AsyncStorage.removeItem('refreshToken');
            await AsyncStorage.removeItem('user');
            setAuthToken(null);
            setUser(null);
            setIsSignedIn(false);
          } else {
            console.log("Failed to verify profile (likely offline), keeping optimistic session.", e);
          }
        }
      } else if (guestFlag === 'true') {
        // ... existing guest logic
        setAuthToken(null);
        setUser(null);
        setIsSignedIn(true);
        setIsGuest(true);
      } else {
        setAuthToken(null);
        setUser(null);
        setIsSignedIn(false);
        setIsGuest(false);
      }
    } catch (error) {
      // ... existing error handling
      console.error('Error restoring token:', error);
      setAuthToken(null);
      setUser(null);
      setIsSignedIn(false);
      setIsGuest(false);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (username: string, password: string) => {
    try {
      setLoading(true);
      const response = await authAPI.login(username, password);

      // Store tokens
      await AsyncStorage.setItem('accessToken', response.accessToken);
      await AsyncStorage.setItem('refreshToken', response.refreshToken);
      setAuthToken(response.accessToken);

      // Store user info
      const userData: User = {
        username: response.username || username,
        email: response.email || "",
        roles: response.roles || [],
      };
      await AsyncStorage.setItem('user', JSON.stringify(userData));

      setUser(userData);
      setIsSignedIn(true);
      setIsGuest(false);
      await AsyncStorage.removeItem('guest');
      registerForPushNotificationsAsync().catch((error) =>
        console.error("Push registration failed:", error)
      );
    } catch (error) {
      console.error("Sign in error:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (username: string, email: string, password: string) => {
    try {
      setLoading(true);
      const response = await authAPI.register(username, email, password);

      // Store tokens
      await AsyncStorage.setItem('accessToken', response.accessToken);
      await AsyncStorage.setItem('refreshToken', response.refreshToken);
      setAuthToken(response.accessToken);

      // Store user info
      const userData: User = {
        username: response.username || username,
        email: response.email || email,
        roles: response.roles || [],
      };
      await AsyncStorage.setItem('user', JSON.stringify(userData));

      setUser(userData);
      setIsSignedIn(true);
      setIsGuest(false);
      await AsyncStorage.removeItem('guest');
      registerForPushNotificationsAsync().catch((error) =>
        console.error("Push registration failed:", error)
      );
    } catch (error) {
      console.error('Sign up error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };



  const signOut = async () => {
    try {
      setLoading(true);
      // Clear stored tokens and user data
      await AsyncStorage.removeItem('accessToken');
      await AsyncStorage.removeItem('refreshToken');
      await AsyncStorage.removeItem('user');
      await AsyncStorage.removeItem('guest');
      setAuthToken(null);

      setUser(null);
      setIsSignedIn(false);
      setIsGuest(false);
    } catch (error) {
      console.error('Sign out error:', error);
    } finally {
      setLoading(false);
    }
  };

  const startGuest = async () => {
    try {
      setLoading(true);
      await AsyncStorage.setItem('guest', 'true');
      setAuthToken(null);
      setUser(null);
      setIsSignedIn(true);
      setIsGuest(true);
    } catch (error) {
      console.error('Start guest error:', error);
    } finally {
      setLoading(false);
    }
  };

  const endGuest = async () => {
    try {
      setLoading(true);
      await AsyncStorage.removeItem('guest');
      setAuthToken(null);
      setUser(null);
      setIsSignedIn(false);
      setIsGuest(false);
    } catch (error) {
      console.error('End guest error:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshUser = async () => {
    try {
      const profile = await userAPI.getProfile();
      const updatedUser: User = {
        username: profile.username,
        email: profile.email,
        roles: profile.roles && profile.roles.length > 0 ? profile.roles : (user?.roles || []),
        pushNotificationsEnabled: profile.pushNotificationsEnabled,
      };
      setUser(updatedUser);
      await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
    } catch (error) {
      console.error('Failed to refresh user profile:', error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signIn,
        signUp,
        signOut,
        restoreToken,
        isSignedIn,
        isGuest,
        startGuest,
        endGuest,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
