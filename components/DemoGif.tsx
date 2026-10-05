import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRef, useState } from "react";
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from "react-native";

interface DemoGifProps {
  url: string;
  title: string;
}

/**
 * The GIF half of the demo player: plays inline with expo-image (already in the dev client), with
 * Pause/Play on Android and iOS. Browsers can't pause a GIF, so the web build just loops it.
 */
export default function DemoGif({ url, title }: DemoGifProps) {
  const image = useRef<Image>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [playing, setPlaying] = useState(true);
  // Bumped by "Try again" to remount the image and fetch it afresh
  const [attempt, setAttempt] = useState(0);

  const togglePlaying = () => {
    if (playing) image.current?.stopAnimating().catch(() => {});
    else image.current?.startAnimating().catch(() => {});
    setPlaying(!playing);
  };

  const retry = () => {
    setState("loading");
    setPlaying(true);
    setAttempt((n) => n + 1);
  };

  return (
    <View>
      <View style={styles.frame}>
        <Image
          key={attempt}
          ref={image}
          source={{ uri: url }}
          contentFit="contain"
          style={StyleSheet.absoluteFill}
          accessibilityLabel={`${title} GIF demo`}
          onLoad={() => setState("ready")}
          onError={() => setState("error")}
          testID="demo-gif"
        />
        {state === "loading" && (
          <View style={styles.overlay}>
            <ActivityIndicator color="#fff" size="large" accessibilityLabel="Loading the GIF" />
          </View>
        )}
        {state === "error" && (
          <View style={styles.overlay} accessibilityRole="alert">
            <Text style={styles.errorText}>{"Couldn't load the GIF. Check your connection."}</Text>
            <Pressable accessibilityRole="button" style={styles.retryButton} onPress={retry}>
              <Text style={styles.retryText}>Try again</Text>
            </Pressable>
          </View>
        )}
      </View>
      {Platform.OS !== "web" && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={playing ? "Pause the GIF" : "Play the GIF"}
          accessibilityState={{ disabled: state !== "ready" }}
          disabled={state !== "ready"}
          onPress={togglePlaying}
          style={[styles.control, state !== "ready" && styles.disabled]}
        >
          <MaterialCommunityIcons name={playing ? "pause" : "play"} size={20} color="#1a1a1a" />
          <Text style={styles.controlText}>{playing ? "Pause" : "Play"}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { aspectRatio: 1, backgroundColor: "#111", borderRadius: 12, overflow: "hidden" },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 20,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  errorText: { color: "#fff", fontSize: 15, textAlign: "center" },
  retryButton: { backgroundColor: "#fff", borderRadius: 20, paddingVertical: 8, paddingHorizontal: 18 },
  retryText: { color: "#1a1a1a", fontWeight: "700" },
  control: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    gap: 6,
    marginTop: 12,
    backgroundColor: "#fff",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    paddingVertical: 8,
    paddingHorizontal: 18,
  },
  controlText: { color: "#1a1a1a", fontWeight: "700", fontSize: 15 },
  disabled: { opacity: 0.5 },
});
