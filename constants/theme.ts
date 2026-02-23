/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

const tintColorLight = '#00F5FF';
const tintColorDark = '#00F5FF';

export const Colors = {
  light: {
    // Keeping a light theme fallback that maps somewhat to the new system
    text: '#0A0E27',
    textSecondary: '#64748B',
    background: '#F8FAFC',
    backgroundSecondary: '#FFFFFF',
    tint: tintColorLight,
    primary: '#00F5FF', // Neon Cyan
    primaryLight: 'rgba(0, 245, 255, 0.1)',
    secondary: '#A259FF', // Electric Purple
    icon: '#64748B',
    tabIconDefault: '#94A3B8',
    tabIconSelected: tintColorLight,
    error: '#FF3366',
    surface: '#FFFFFF',
    shadow: '#000000',
    available: '#00FF88',
    inUse: '#FF3366',
    reserved: '#FFB800',
  },
  dark: {
    // "Electric Energy" Palette
    text: '#F8FAFC', // Soft White
    textSecondary: '#94A3B8', // Muted Gray
    background: '#0A0E27', // Deep Navy
    backgroundSecondary: '#111827', // Slightly lighter navy
    surface: '#1E293B', // Slate
    surfaceHighlight: '#334155', // Lighter Slate
    card: 'rgba(30, 41, 59, 0.6)', // Glassy

    // Accents
    primary: '#00F5FF', // Neon Cyan
    type: 'cyan',
    secondary: '#A259FF', // Electric Purple
    tertiary: '#00FF88', // Green
    accentRed: '#FF3366', // Energetic Red
    accentAmber: '#FFB800', // Amber

    tint: '#00F5FF',
    icon: '#94A3B8',
    tabIconDefault: '#64748B',
    tabIconSelected: '#00F5FF',
    error: '#FF3366',
    shadow: '#000000',

    // Status
    available: '#00FF88',
    inUse: '#FF3366',
    reserved: '#FFB800',
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
