module.exports = {
  dependencies: {
    'react-native-watch-connectivity': {
      // Apple Watch connectivity is iOS-only; Android uses react-native-wear-connectivity.
      platforms: {
        android: null,
      },
    },
  },
};
