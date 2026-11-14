/* eslint-disable @typescript-eslint/no-require-imports -- Exercise the Node-loaded Expo config directly. */
const configure = require("../app.config.js");

it("preserves app configuration and exposes only availability flags in JS extra", () => {
  const ios = process.env.GOOGLE_MAPS_IOS_API_KEY;
  const android = process.env.GOOGLE_MAPS_ANDROID_API_KEY;
  try {
    process.env.GOOGLE_MAPS_IOS_API_KEY = "test-ios-key";
    process.env.GOOGLE_MAPS_ANDROID_API_KEY = "test-android-key";
    const base = require("../app.json").expo;
    const config = configure({ config: base });
    expect(config.ios.config.googleMapsApiKey).toBe("test-ios-key");
    expect(config.android.config.googleMaps.apiKey).toBe("test-android-key");
    expect(config.extra.googleMaps).toEqual({ ios: true, android: true });
    expect(config.extra.eas).toEqual(base.extra.eas);
    expect(config.plugins).toEqual([...base.plugins, "./plugins/with-pod-deployment-target"]);
    expect(config.ios.bundleIdentifier).toBe(base.ios.bundleIdentifier);
    expect(config.android.package).toBe(base.android.package);
    delete process.env.GOOGLE_MAPS_IOS_API_KEY;
    delete process.env.GOOGLE_MAPS_ANDROID_API_KEY;
    expect(configure({ config: base }).extra.googleMaps).toEqual({
      ios: false,
      android: false,
    });
  } finally {
    if (ios === undefined) delete process.env.GOOGLE_MAPS_IOS_API_KEY;
    else process.env.GOOGLE_MAPS_IOS_API_KEY = ios;
    if (android === undefined) delete process.env.GOOGLE_MAPS_ANDROID_API_KEY;
    else process.env.GOOGLE_MAPS_ANDROID_API_KEY = android;
  }
});
