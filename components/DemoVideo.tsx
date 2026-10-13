import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";
import { useState } from "react";
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, View } from "react-native";

export interface DemoVideoProps {
  url: string;
  title: string;
}

/**
 * The video half of the demo player on Android and iOS. The app has no native video module (adding
 * one means rebuilding the dev client), so Play hands the clip to the in-app browser, whose built-in
 * media player plays it. The web build plays it inline instead (DemoVideo.web.tsx).
 */
export default function DemoVideo({ url, title }: DemoVideoProps) {
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const play = async () => {
    setOpening(true);
    setError(null);
    try {
      await WebBrowser.openBrowserAsync(url, { toolbarColor: "#000000" });
    } catch {
      try {
        await Linking.openURL(url);
      } catch {
        setError("Couldn't open the video player. Check your connection and try again.");
      }
    } finally {
      setOpening(false);
    }
  };

  return (
    <View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Play the ${title} video`}
        accessibilityState={{ disabled: opening }}
        disabled={opening}
        onPress={play}
        style={styles.screen}
        testID="demo-video"
      >
        {opening ? (
          <ActivityIndicator color="#fff" size="large" />
        ) : (
          <MaterialCommunityIcons name="play-circle" size={72} color="#fff" />
        )}
        <Text style={styles.hint}>Tap to play in the video player</Text>
      </Pressable>
      {error && (
        <Text style={styles.error} accessibilityRole="alert">
          {error}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    aspectRatio: 16 / 9,
    backgroundColor: "#111",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  hint: { color: "#ccc", fontSize: 13 },
  error: { color: "#B71C1C", fontSize: 14, marginTop: 8 },
});
