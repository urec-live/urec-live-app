import Constants from 'expo-constants';
import { Platform } from 'react-native';

const DEFAULT_BACKEND_PORT = '8080';
const DEFAULT_PROD_BACKEND_ORIGIN = 'https://urec-live-backend-production.up.railway.app';

function getExpoHost(): string | null {
  const fromExpoConfig = Constants.expoConfig?.hostUri;
  const fromManifest2 = (Constants as any).manifest2?.extra?.expoGo?.debuggerHost;
  const fromLegacyManifest = (Constants as any).manifest?.debuggerHost;

  const hostWithPort = fromExpoConfig || fromManifest2 || fromLegacyManifest;
  if (!hostWithPort || typeof hostWithPort !== 'string') {
    return null;
  }

  return hostWithPort.split(':')[0] || null;
}

function getFallbackHost(): string {
  if (Platform.OS === 'android') {
    // Android emulator must use the host loopback alias.
    return '10.0.2.2';
  }

  return 'localhost';
}

function resolveBackendOrigin(): string {
  // For web, use direct Railway URL
  if (Platform.OS === 'web') {
    const webOrigin = process.env.EXPO_PUBLIC_BACKEND_ORIGIN?.replace(/\/$/, '');
    if (webOrigin) {
      if (webOrigin.startsWith('http://') || webOrigin.startsWith('https://')) {
        return webOrigin;
      }

      return `https://${webOrigin}`;
    }
    // Fallback for local web development
    return typeof window !== 'undefined' && window.location.hostname !== 'localhost'
      ? DEFAULT_PROD_BACKEND_ORIGIN
      : 'http://localhost:8080';
  }

  // For native, use environment variable or discover host
  const explicitOrigin = process.env.EXPO_PUBLIC_BACKEND_ORIGIN;
  if (explicitOrigin) {
    const normalizedOrigin = explicitOrigin.replace(/\/$/, '');
    if (normalizedOrigin.startsWith('http://') || normalizedOrigin.startsWith('https://')) {
      return normalizedOrigin;
    }

    return `https://${normalizedOrigin}`;
  }

  const host = getExpoHost() || getFallbackHost();
  return `http://${host}:${DEFAULT_BACKEND_PORT}`;
}

const BACKEND_ORIGIN = resolveBackendOrigin();

export const API_BASE_URL = `${BACKEND_ORIGIN}/api`;
export const WS_URL = `${BACKEND_ORIGIN}/ws`;
