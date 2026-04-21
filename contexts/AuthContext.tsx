import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";
import { authAPI, setAuthFailureHandler } from "../services/authAPI";

const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

interface User {
  username: string;
  email?: string;
  id?: string | number;
}

interface AuthContextType {
  user: User | null;
  sessionExpiresAt: number | null;
  signIn: (username: string, password: string) => Promise<void>;
  signUp: (username: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [sessionExpiresAt, setSessionExpiresAt] = useState<number | null>(null);

  // On mount: restore saved session and check if it's still valid
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const storedUser = await AsyncStorage.getItem("user");
        const storedExpiry = await AsyncStorage.getItem("sessionExpiresAt");
        const accessToken = await AsyncStorage.getItem("accessToken");

        if (storedUser && storedExpiry && accessToken) {
          const expiryTimestamp = parseInt(storedExpiry, 10);

          if (Date.now() < expiryTimestamp) {
            // Session still valid
            setUser(JSON.parse(storedUser));
            setSessionExpiresAt(expiryTimestamp);
          } else {
            // Session expired — clear everything
            await clearStorage();
          }
        }
      } catch {
        await clearStorage();
      }
    };

    restoreSession();

    // Register handler so token refresh failures also sign the user out
    setAuthFailureHandler(async () => {
      await clearStorage();
      setUser(null);
      setSessionExpiresAt(null);
    });
  }, []);

  const clearStorage = async () => {
    await AsyncStorage.multiRemove([
      "accessToken",
      "refreshToken",
      "user",
      "sessionExpiresAt",
    ]);
  };

  const signIn = async (username: string, password: string) => {
    const data = await authAPI.login(username, password);

    const loggedInUser: User = {
      username: data.username ?? username,
      email: data.email,
      id: data.id ?? data.userId,
    };

    const expiresAt = Date.now() + SESSION_DURATION_MS;

    await AsyncStorage.setItem(
      "accessToken",
      data.accessToken ?? data.token ?? "",
    );
    await AsyncStorage.setItem("refreshToken", data.refreshToken ?? "");
    await AsyncStorage.setItem("user", JSON.stringify(loggedInUser));
    await AsyncStorage.setItem("sessionExpiresAt", expiresAt.toString());

    setUser(loggedInUser);
    setSessionExpiresAt(expiresAt);
  };

  const signUp = async (username: string, email: string, password: string) => {
    const data = await authAPI.register(username, email, password);

    const registeredUser: User = {
      username: data.username ?? username,
      email: data.email ?? email,
      id: data.id ?? data.userId,
    };

    const expiresAt = Date.now() + SESSION_DURATION_MS;

    await AsyncStorage.setItem(
      "accessToken",
      data.accessToken ?? data.token ?? "",
    );
    await AsyncStorage.setItem("refreshToken", data.refreshToken ?? "");
    await AsyncStorage.setItem("user", JSON.stringify(registeredUser));
    await AsyncStorage.setItem("sessionExpiresAt", expiresAt.toString());

    setUser(registeredUser);
    setSessionExpiresAt(expiresAt);
  };

  const signOut = async () => {
    await clearStorage();
    setUser(null);
    setSessionExpiresAt(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, sessionExpiresAt, signIn, signUp, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
