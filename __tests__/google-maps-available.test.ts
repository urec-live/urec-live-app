import { Platform, UIManager } from "react-native";
import Constants from "expo-constants";
import { googleMapsAvailable } from "@/utils/googleMapsAvailable";

jest.mock("expo-constants", () => ({
  __esModule: true,
  default: { expoConfig: { extra: { googleMaps: {} } } },
}));
const originalOS = Platform.OS;
afterEach(() => {
  Platform.OS = originalOS;
  jest.restoreAllMocks();
});

it.each(["ios", "android"] as const)(
  "requires both configuration and a matching native provider on %s",
  (os) => {
    Platform.OS = os;
    const flags = Constants.expoConfig!.extra!.googleMaps;
    flags[os] = false;
    const native = jest
      .spyOn(UIManager, "hasViewManagerConfig")
      .mockReturnValue(true);
    expect(googleMapsAvailable()).toBe(false);
    flags[os] = true;
    native.mockReturnValue(false);
    expect(googleMapsAvailable()).toBe(false);
    native.mockReturnValue(true);
    expect(googleMapsAvailable()).toBe(true);
    expect(native).toHaveBeenLastCalledWith(
      os === "ios" ? "AIRGoogleMap" : "AIRMap",
    );
  },
);
