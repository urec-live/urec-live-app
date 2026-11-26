import React, { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useAuth } from "@/contexts/AuthContext";
import { useCachedResource } from "@/hooks/useCachedResource";
import { cacheKeys, STALE_MS } from "@/services/cachedResources";
import { exerciseAPI } from "@/services/exerciseAPI";
import { writeCached } from "@/services/resourceCache";

export default function PinnedExerciseNote({ exerciseId, compact = false }: { exerciseId: number; compact?: boolean }) {
  const { user } = useAuth();
  const key = user ? cacheKeys.exerciseNote(user.username, exerciseId) : null;
  const note = useCachedResource(key, () => exerciseAPI.getNote(exerciseId), { staleTime: STALE_MS.user });
  const revalidate = note.revalidate;
  useFocusEffect(useCallback(() => { revalidate(); }, [revalidate]));
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const save = async () => {
    if (!key) return;
    setSaving(true);
    setError("");
    try {
      const saved = await exerciseAPI.saveNote(exerciseId, draft);
      writeCached(key, saved);
      setEditing(false);
    } catch {
      setError("Couldn’t save your note. Your draft is kept—try again.");
    } finally { setSaving(false); }
  };
  if (compact) {
    if (!note.data?.note) return null;
    return <View style={s.compact}><Text style={s.label}>Pinned note</Text><ScrollView nestedScrollEnabled style={{ maxHeight: 70 }}><Text style={s.body}>{note.data.note}</Text></ScrollView></View>;
  }
  return <View style={s.card}>
    <View style={s.heading}>
      <MaterialCommunityIcons name="pin-outline" size={21} color="#216C50" />
      <Text style={s.title}>Pinned exercise note</Text>
      {!editing && note.data && <Pressable accessibilityRole="button" onPress={() => { setDraft(note.data?.note || ""); setError(""); setEditing(true); }}><Text style={s.link}>{note.data.note ? "Edit note" : "Add note"}</Text></Pressable>}
    </View>
    {note.loading && <ActivityIndicator color="#216C50" />}
    {!!note.error && <View style={{ gap: 8 }}><Text style={s.body}>Couldn’t load your pinned note.</Text><Pressable onPress={() => void note.refresh()}><Text style={s.link}>Retry note</Text></Pressable></View>}
    {editing ? <>
      <TextInput accessibilityLabel="Pinned exercise note" multiline maxLength={2000} textAlignVertical="top" style={s.input} value={draft} onChangeText={setDraft} placeholder="Equipment settings, cues, or reminders…" />
      <Text style={s.caption}>{draft.length}/2000 · Private to you</Text>
      {!!error && <Text accessibilityRole="alert" style={s.error}>{error}</Text>}
      <View style={s.actions}>
        <Pressable accessibilityRole="button" disabled={saving} onPress={() => setEditing(false)}><Text style={s.link}>Cancel</Text></Pressable>
        <Pressable accessibilityRole="button" disabled={saving} onPress={() => void save()} style={s.save}><Text style={s.saveText}>{saving ? "Saving…" : draft.trim() ? "Save note" : "Clear note"}</Text></Pressable>
      </View>
    </> : note.data && <Text style={s.body}>{note.data.note || "Keep a cue or equipment setting here. You’ll see it each time you log this exercise."}</Text>}
  </View>;
}
const s = StyleSheet.create({
  card: { padding: 20, borderRadius: 16, backgroundColor: "#fff", borderColor: "#E1E7E3", borderWidth: 1, gap: 16, marginBottom: 16 },
  heading: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  title: { flex: 1, fontSize: 16, fontWeight: "700", color: "#1B3029" },
  body: { color: "#53665B", fontSize: 15, lineHeight: 24 },
  link: { color: "#216C50", fontWeight: "700", paddingVertical: 8 },
  caption: { color: "#6C7C75", fontSize: 12 },
  input: { backgroundColor: "#F3F5F6", padding: 14, borderRadius: 10, minHeight: 110, fontSize: 15, color: "#1B3029" },
  actions: { flexDirection: "row", justifyContent: "flex-end", gap: 24, alignItems: "center" },
  save: { backgroundColor: "#216C50", padding: 12, borderRadius: 10 },
  saveText: { color: "#fff", fontWeight: "700" },
  error: { color: "#B3261E" },
  compact: { padding: 12, borderRadius: 10, backgroundColor: "#fff", marginVertical: 8, maxHeight: 100 },
  label: { color: "#216C50", fontSize: 12, fontWeight: "700", marginBottom: 3 },
});
