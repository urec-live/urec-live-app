import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useKeyboardHeight } from "@/hooks/useKeyboardHeight";
import { klipyAPI, type MediaCategory, type MediaItem } from "@/services/klipyAPI";
import { toMediaSearchError } from "@/utils/chatErrors";

/** Wait this long after the last keystroke before searching. */
export const SEARCH_DEBOUNCE_MS = 350;
const COLUMNS = 3;
const GAP = 6;

interface GifStickerPickerProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (kind: "GIF" | "STICKER", item: MediaItem) => void;
}

const TABS: { category: MediaCategory; label: string }[] = [
  { category: "gifs", label: "GIFs" },
  { category: "stickers", label: "Stickers" },
];

/**
 * Bottom sheet for picking a GIF or sticker: trending until you type, then search results, loading
 * more as you scroll. Results come from KLIPY through the backend; KLIPY's terms ask for the
 * "Powered by KLIPY" credit wherever its picker is shown.
 */
export default function GifStickerPicker({ visible, onClose, onSelect }: GifStickerPickerProps) {
  const { width: screenWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const keyboardHeight = useKeyboardHeight();
  const [category, setCategory] = useState<MediaCategory>("gifs");
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [items, setItems] = useState<MediaItem[]>([]);
  const [nextPage, setNextPage] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Bumped for every new search, so answers to an older one are ignored
  const requestId = useRef(0);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  const fetchPage = useCallback(
    (page: number) =>
      debouncedQuery ? klipyAPI.search(category, debouncedQuery, page) : klipyAPI.trending(category, page),
    [category, debouncedQuery],
  );

  const loadFirstPage = useCallback(async () => {
    const id = ++requestId.current;
    setLoading(true);
    setError(null);
    setItems([]);
    setNextPage(null);
    try {
      const page = await fetchPage(1);
      if (id !== requestId.current) return;
      setItems(page.items);
      setNextPage(page.nextPage);
    } catch (e) {
      if (id === requestId.current) setError(toMediaSearchError(e));
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, [fetchPage]);

  useEffect(() => {
    if (visible) loadFirstPage();
  }, [visible, loadFirstPage]);

  const loadMore = async () => {
    if (!nextPage || loading || loadingMore) return;
    const id = requestId.current;
    setLoadingMore(true);
    try {
      const page = await fetchPage(nextPage);
      if (id !== requestId.current) return;
      setItems((list) => {
        const seen = new Set(list.map((i) => i.id));
        return [...list, ...page.items.filter((i) => !seen.has(i.id))];
      });
      setNextPage(page.nextPage);
    } catch {
      // Keep what's shown; scrolling again retries
    } finally {
      setLoadingMore(false);
    }
  };

  const close = () => {
    setQuery("");
    setDebouncedQuery("");
    onClose();
  };

  const tileSize = Math.floor((Math.min(screenWidth, 600) - 24 - GAP * (COLUMNS - 1)) / COLUMNS);
  const kind = category === "stickers" ? "STICKER" : "GIF";
  // The modal covers the whole screen, system bars included. Lift the sheet above the keyboard,
  // and keep its bottom clear of the navigation bar: iOS's keyboard height covers that bar,
  // Android's leaves it out.
  const bottomInset = Platform.OS === "ios" && keyboardHeight > 0 ? 0 : insets.bottom;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={close}>
      <View style={[styles.frame, { paddingBottom: keyboardHeight }]} testID="gif-picker-frame">
        <Pressable style={styles.backdrop} onPress={close} accessibilityLabel="Close GIF picker" />
        <View style={[styles.sheet, { paddingBottom: 8 + bottomInset }]} accessibilityViewIsModal testID="gif-picker-sheet">
          <View style={styles.handle} />
          <View style={styles.tabs} accessibilityRole="tablist">
            {TABS.map((tab) => (
              <Pressable
                key={tab.category}
                accessibilityRole="tab"
                accessibilityState={{ selected: category === tab.category }}
                onPress={() => setCategory(tab.category)}
                style={[styles.tab, category === tab.category && styles.tabActive]}
              >
                <Text style={[styles.tabText, category === tab.category && styles.tabTextActive]}>{tab.label}</Text>
              </Pressable>
            ))}
            <Pressable onPress={close} accessibilityRole="button" accessibilityLabel="Close" style={styles.closeBtn} hitSlop={8}>
              <MaterialCommunityIcons name="close" size={22} color="#666" />
            </Pressable>
          </View>

          <View style={styles.searchRow}>
            <MaterialCommunityIcons name="magnify" size={20} color="#999" />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={category === "stickers" ? "Search stickers" : "Search GIFs"}
              placeholderTextColor="#aaa"
              style={styles.searchInput}
              returnKeyType="search"
              autoCorrect={false}
              accessibilityLabel={category === "stickers" ? "Search stickers" : "Search GIFs"}
            />
            {query.length > 0 && (
              <Pressable onPress={() => setQuery("")} accessibilityRole="button" accessibilityLabel="Clear search" hitSlop={8}>
                <MaterialCommunityIcons name="close-circle" size={18} color="#bbb" />
              </Pressable>
            )}
          </View>

          {loading ? (
            <View style={styles.center}>
              <ActivityIndicator color="#4CAF50" accessibilityLabel="Loading" />
            </View>
          ) : error ? (
            <View style={styles.center} accessibilityRole="alert">
              <Text style={styles.message}>{error}</Text>
              <Pressable onPress={loadFirstPage} style={styles.retryBtn} accessibilityRole="button">
                <Text style={styles.retryText}>Try again</Text>
              </Pressable>
            </View>
          ) : items.length === 0 ? (
            <View style={styles.center}>
              <Text style={styles.message}>{debouncedQuery ? `Nothing found for "${debouncedQuery}"` : "Nothing to show yet"}</Text>
            </View>
          ) : (
            <FlatList
              data={items}
              key={category}
              numColumns={COLUMNS}
              keyExtractor={(item) => item.id}
              columnWrapperStyle={{ gap: GAP }}
              contentContainerStyle={styles.grid}
              onEndReached={loadMore}
              onEndReachedThreshold={0.5}
              keyboardShouldPersistTaps="handled"
              ListFooterComponent={loadingMore ? <ActivityIndicator color="#4CAF50" style={styles.more} /> : null}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => {
                    onSelect(kind, item);
                    close();
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`Send this ${kind === "GIF" ? "GIF" : "sticker"}`}
                  style={[styles.tile, { width: tileSize, height: tileSize }, kind === "STICKER" && styles.stickerTile]}
                >
                  <Image
                    source={{ uri: item.previewUrl || item.url }}
                    contentFit={kind === "STICKER" ? "contain" : "cover"}
                    style={StyleSheet.absoluteFill}
                    recyclingKey={item.id}
                  />
                </Pressable>
              )}
            />
          )}

          <Text style={styles.attribution}>Powered by KLIPY</Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  frame: { flex: 1 },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)" },
  sheet: {
    height: "65%",
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 12,
  },
  handle: { alignSelf: "center", width: 40, height: 4, borderRadius: 2, backgroundColor: "#ddd", marginVertical: 8 },
  tabs: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 },
  tab: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 16, backgroundColor: "#f5f5f5" },
  tabActive: { backgroundColor: "#4CAF50" },
  tabText: { fontSize: 14, fontWeight: "700", color: "#666" },
  tabTextActive: { color: "#fff" },
  closeBtn: { marginLeft: "auto", padding: 4 },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#f5f5f5",
    borderRadius: 20,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  searchInput: { flex: 1, paddingVertical: 9, fontSize: 15, color: "#1a1a1a" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, paddingHorizontal: 24 },
  message: { fontSize: 14, color: "#888", textAlign: "center" },
  retryBtn: { backgroundColor: "#4CAF50", borderRadius: 18, paddingVertical: 8, paddingHorizontal: 18 },
  retryText: { color: "#fff", fontWeight: "700" },
  grid: { gap: GAP, paddingBottom: 8 },
  tile: { borderRadius: 8, overflow: "hidden", backgroundColor: "#f0f0f0" },
  stickerTile: { backgroundColor: "#fafafa" },
  more: { marginVertical: 12 },
  attribution: { textAlign: "center", fontSize: 11, fontWeight: "700", color: "#999", letterSpacing: 0.5, paddingTop: 6 },
});
