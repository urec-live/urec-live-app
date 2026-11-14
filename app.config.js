// SDK 54's built-in react-native-maps prebuild plugin consumes these fields.
// Keep keys out of source; they are embedded in native builds, not in JS extra.
module.exports = ({ config }) => {
  const iosKey = process.env.GOOGLE_MAPS_IOS_API_KEY?.trim();
  const androidKey = process.env.GOOGLE_MAPS_ANDROID_API_KEY?.trim();
  return {
    ...config,
    plugins: [...(config.plugins ?? []), "./plugins/with-pod-deployment-target"],
    ios: {
      ...config.ios,
      config: { ...config.ios?.config, googleMapsApiKey: iosKey },
    },
    android: {
      ...config.android,
      config: {
        ...config.android?.config,
        googleMaps: {
          ...config.android?.config?.googleMaps,
          apiKey: androidKey,
        },
      },
    },
    extra: {
      ...config.extra,
      googleMaps: { ios: !!iosKey, android: !!androidKey },
    },
  };
};
