import { StyleSheet, View } from "react-native";

import type { DemoVideoProps } from "./DemoVideo";

/** On the web the browser's own video element is the player: inline, with its native controls. */
export default function DemoVideo({ url, title }: DemoVideoProps) {
  return (
    <View style={styles.screen} testID="demo-video">
      <video
        src={url}
        controls
        playsInline
        preload="metadata"
        aria-label={`${title} video`}
        style={{ width: "100%", height: "100%", backgroundColor: "#000" }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { aspectRatio: 16 / 9, backgroundColor: "#111", borderRadius: 12, overflow: "hidden" },
});
