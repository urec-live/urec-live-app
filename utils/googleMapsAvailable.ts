import Constants from "expo-constants";
import { Platform, UIManager } from "react-native";

export function googleMapsAvailable(): boolean {
  const platform = Platform.OS;
  if (platform !== "ios" && platform !== "android") return false;
  if (!Constants.expoConfig?.extra?.googleMaps?.[platform]) return false;
  // A JS reload/OTA cannot install native modules or the iOS Google provider.
  return UIManager.hasViewManagerConfig(
    platform === "ios" ? "AIRGoogleMap" : "AIRMap",
  );
}
