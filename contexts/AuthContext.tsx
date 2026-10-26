import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { authAPI, setAuthFailureHandler } from '../services/authAPI';
import { clearUserCache, preloadCache } from '../services/resourceCache';

interface User {
  username: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (username: string, password: string) => Promise<void>;
  signInWithGoogle: (idToken: string) => Promise<void>;
  signUp: (username: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  restoreToken: () => Promise<void>;
  isSignedIn: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSignedIn, setIsSignedIn] = useState(false);

  // Try to restore token on app load
  useEffect(() => {
    restoreToken();
    setAuthFailureHandler(() => {
      clearUserCache();
      setUser(null);
      setIsSignedIn(false);
    });
  }, []);

  const restoreToken = async () => {
    try {
      setLoading(true);
      // Saved data into memory first, so the first screens show it instead of a spinner
      await preloadCache();
      const userData = await AsyncStorage.getItem('user');
      const accessToken = await AsyncStorage.getItem('accessToken');

      if (userData && accessToken) {
        setUser(JSON.parse(userData));
        setIsSignedIn(true);
      } else {
        setUser(null);
        setIsSignedIn(false);
      }
    } catch (error) {
      console.error('Error restoring token:', error);
      setUser(null);
      setIsSignedIn(false);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (username: string, password: string) => {
    try {
      const response = await authAPI.login(username, password);

      // Store tokens
      await AsyncStorage.setItem('accessToken', response.accessToken);
      await AsyncStorage.setItem('refreshToken', response.refreshToken);

      // Store user info
      const userData: User = {
        username: response.username,
        email: response.email,
      };
      await AsyncStorage.setItem('user', JSON.stringify(userData));

      setUser(userData);
      setIsSignedIn(true);
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    }
  };

  const persistAuthenticatedUser = async (response: {
    accessToken: string;
    refreshToken: string;
    username: string;
    email: string;
  }) => {
    await AsyncStorage.setItem('accessToken', response.accessToken);
    await AsyncStorage.setItem('refreshToken', response.refreshToken);

    const userData: User = {
      username: response.username,
      email: response.email,
    };
    await AsyncStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    setIsSignedIn(true);
  };

  const signInWithGoogle = async (idToken: string) => {
    try {
      const response = await authAPI.loginWithGoogle(idToken);
      await persistAuthenticatedUser(response);
    } catch (error) {
      console.error('Google sign in error:', error);
      throw error;
    }
  };

  const signUp = async (username: string, email: string, password: string) => {
    try {
      const response = await authAPI.register(username, email, password);

      // Store tokens
      await AsyncStorage.setItem('accessToken', response.accessToken);
      await AsyncStorage.setItem('refreshToken', response.refreshToken);

      // Store user info
      const userData: User = {
        username: response.username,
        email: response.email,
      };
      await AsyncStorage.setItem('user', JSON.stringify(userData));

      setUser(userData);
      setIsSignedIn(true);
    } catch (error) {
      console.error('Sign up error:', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      // Clear stored tokens and user data
      await AsyncStorage.removeItem('accessToken');
      await AsyncStorage.removeItem('refreshToken');
      await AsyncStorage.removeItem('user');
      // ...and the saved copies of this member's stats, history and messages
      await clearUserCache();

      setUser(null);
      setIsSignedIn(false);
    } catch (error) {
      console.error('Sign out error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signIn,
        signInWithGoogle,
        signUp,
        signOut,
        restoreToken,
        isSignedIn,
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
