import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { authAPI } from '../services/authAPI';

interface User {
  username: string;
  email: string;
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
        setUser(JSON.parse(userData));
        setIsSignedIn(true);
        setIsGuest(false);
      } else if (guestFlag === 'true') {
        setUser(null);
        setIsSignedIn(true);
        setIsGuest(true);
      } else {
        setUser(null);
        setIsSignedIn(false);
        setIsGuest(false);
      }
    } catch (error) {
      console.error('Error restoring token:', error);
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

      // Store user info
      const userData: User = {
        username: response.username,
        email: response.email,
      };
      await AsyncStorage.setItem('user', JSON.stringify(userData));

      setUser(userData);
      setIsSignedIn(true);
      setIsGuest(false);
      await AsyncStorage.removeItem('guest');
    } catch (error) {
      console.error('Sign in error:', error);
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

      // Store user info
      const userData: User = {
        username: response.username,
        email: response.email,
      };
      await AsyncStorage.setItem('user', JSON.stringify(userData));

      setUser(userData);
      setIsSignedIn(true);
      setIsGuest(false);
      await AsyncStorage.removeItem('guest');
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
      setUser(null);
      setIsSignedIn(false);
      setIsGuest(false);
    } catch (error) {
      console.error('End guest error:', error);
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
        signUp,
        signOut,
        restoreToken,
        isSignedIn,
        isGuest,
        startGuest,
        endGuest,
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
