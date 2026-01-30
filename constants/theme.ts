/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

const tintColorLight = '#0a7ea4';
const tintColorDark = '#fff';

export const Colors = {
  light: {
    text: '#1A1A1A',
    textSecondary: '#666666',
    background: '#FFFFFF',
    backgroundSecondary: '#F8F9FA',
    tint: '#00E676', // Vibrant Green for selected states
    primary: '#4CAF50', // Core Brand Green
    primaryLight: '#E8F5E9', // Subtle Green Backgrounds
    secondary: '#E0E0E0', // Borders / Separators
    icon: '#8F9094',
    tabIconDefault: '#8F9094',
    tabIconSelected: '#4CAF50',
    error: '#FF4444',
    surface: '#FFFFFF',
    shadow: '#000000',
  },
  // Dark mode kept as fallback/alternative, but aligned with new green
  dark: {
    text: '#ECEDEE',
    textSecondary: '#9BA1A6',
    background: '#151718',
    backgroundSecondary: '#1E1E1E',
    tint: '#fff',
    primary: '#4CAF50',
    primaryLight: 'rgba(76, 175, 80, 0.15)',
    secondary: '#2C2C2C',
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: '#fff',
    error: '#FF4444',
    surface: '#1E1E1E',
    shadow: '#000000',
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
