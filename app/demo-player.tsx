import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import DemoGif from "@/components/DemoGif";
import DemoVideo from "@/components/DemoVideo";
import { DemoMedium, readDemoPlayerParams } from "@/utils/demoPlayer";

const MEDIA: { medium: DemoMedium; label: string; icon: "play-circle-outline" | "file-gif-box" }[] = [
  { medium: "video", label: "Video", icon: "play-circle-outline" },
  { medium: "gif", label: "GIF", icon: "file-gif-box" },
];

/**
 * Plays an exercise's how-to demo, opened from the help request screen
 * (/demo-player?title=…&video=…&gif=…&show=video|gif). Switches between the video and the GIF when
 * there are both, and says when they are placeholders.
 */
export default function DemoPlayerScreen() {
  const router = useRouter();
  const media = readDemoPlayerParams(useLocalSearchParams());
  const [shown, setShown] = useState<DemoMedium>(media.show);

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/(tabs)");
  };

  const available = MEDIA.filter(({ medium }) => (medium === "video" ? media.videoUrl : media.gifUrl));

  if (available.length === 0) {
    return (
      <View style={[styles.container, styles.centered]}>
        <MaterialCommunityIcons name="video-off-outline" size={48} color="#9E9E9E" />
        <Text style={styles.emptyTitle}>{"This demo isn't available"}</Text>
        <Text style={styles.emptyText}>{"Ask a staff member to show you how it's done."}</Text>
        <Pressable accessibilityRole="button" style={styles.primaryButton} onPress={goBack}>
          <Text style={styles.primaryButtonText}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  const current = available.some(({ medium }) => medium === shown) ? shown : available[0].medium;
  const placeholder = current === "video" ? media.videoPlaceholder : media.gifPlaceholder;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      <Pressable accessibilityRole="button" onPress={goBack} style={styles.backButton}>
        <Text style={styles.backText}>← Back</Text>
      </Pressable>

      <Text style={styles.title}>{media.title}</Text>
      <Text style={styles.subtitle}>How-to demo</Text>

      {available.length > 1 && (
        <View style={styles.tabs} accessibilityRole="tablist">
          {available.map(({ medium, label, icon }) => {
            const selected = medium === current;
            return (
              <Pressable
                key={medium}
                accessibilityRole="tab"
                accessibilityState={{ selected }}
                style={[styles.tab, selected && styles.tabSelected]}
                onPress={() => setShown(medium)}
              >
                <MaterialCommunityIcons name={icon} size={18} color={selected ? "#fff" : "#1a1a1a"} />
                <Text style={[styles.tabText, selected && styles.tabTextSelected]}>{label}</Text>
              </Pressable>
            );
          })}
        </View>
      )}

      {current === "video" ? (
        <DemoVideo url={media.videoUrl!} title={media.title} />
      ) : (
        <DemoGif url={media.gifUrl!} title={media.title} />
      )}

      {placeholder && (
        <View style={styles.notice} testID="placeholder-notice">
          <MaterialCommunityIcons name="information-outline" size={20} color="#8D6E00" />
          <Text style={styles.noticeText}>
            {`Placeholder ${current === "video" ? "video" : "GIF"}: the real how-to demo for ${media.title} is coming soon.`}
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f5f5f5" },
  container: { flexGrow: 1, backgroundColor: "#f5f5f5", padding: 25, paddingBottom: 40 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  backButton: { marginBottom: 20 },
  backText: { color: "#4CAF50", fontWeight: "700", fontSize: 16 },
  title: { color: "#1a1a1a", fontSize: 26, fontWeight: "900", textAlign: "center" },
  subtitle: { color: "#666", fontSize: 15, textAlign: "center", marginTop: 4, marginBottom: 20 },
  tabs: {
    flexDirection: "row",
    alignSelf: "center",
    backgroundColor: "#fff",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    padding: 4,
    marginBottom: 16,
  },
  tab: { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 18, paddingVertical: 8, paddingHorizontal: 18 },
  tabSelected: { backgroundColor: "#4CAF50" },
  tabText: { color: "#1a1a1a", fontWeight: "700", fontSize: 15 },
  tabTextSelected: { color: "#fff" },
  notice: {
    flexDirection: "row",
    gap: 8,
    alignItems: "flex-start",
    backgroundColor: "#FFF8E1",
    borderColor: "#FFE082",
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginTop: 16,
  },
  noticeText: { flex: 1, color: "#5D4037", fontSize: 14, lineHeight: 20 },
  emptyTitle: { fontSize: 20, fontWeight: "800", color: "#1a1a1a", marginTop: 12 },
  emptyText: { fontSize: 14, color: "#666", textAlign: "center", marginVertical: 12 },
  primaryButton: {
    backgroundColor: "#4CAF50",
    borderRadius: 30,
    paddingVertical: 14,
    paddingHorizontal: 30,
    minWidth: "70%",
    alignItems: "center",
  },
  primaryButtonText: { color: "#fff", fontWeight: "800", fontSize: 16 },
});
