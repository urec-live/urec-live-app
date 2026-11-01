import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { Link } from "expo-router";
import { useGym } from "@/contexts/GymContext";
import { useWorkout } from "@/contexts/WorkoutContext";
import { useHelpRequest } from "@/contexts/HelpRequestContext";
import { Gym, gymAPI } from "@/services/gymAPI";
import { catalogStyles as s } from "@/constants/catalogStyles";
export default function GymSettings() {
  const { gym, loading, changeGym } = useGym();
  const { currentSession } = useWorkout();
  const { activeRequest } = useHelpRequest();
  const [gyms, setGyms] = useState<Gym[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<{
    id: number | null;
    name: string;
  } | null>(null);
  const load = () => {
    setError("");
    void gymAPI
      .list()
      .then(setGyms)
      .catch(() =>
        setError("Could not load gyms. Check your connection and retry."),
      );
  };
  useEffect(load, []);
  const blocked = !!currentSession || !!activeRequest;
  const save = async () => {
    if (!pending || blocked) return;
    setBusy(true);
    setError("");
    try {
      await changeGym(pending.id);
      setPending(null);
    } catch {
      setError(
        "Could not change your gym. Check your connection and finish any open staff-help request, then retry.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <ScrollView style={s.page}>
      <Link href="/profile" style={s.link}>
        Back to Profile
      </Link>
      <Text style={s.title}>My gym</Text>
      <Text style={s.text}>
        {gym ? `Connected to ${gym.name}` : "You are training independently."}
      </Text>
      <Text style={s.text}>
        A gym connection adds live equipment, maps and staff support. Your
        exercise library and history stay with you.
      </Text>
      {loading && <ActivityIndicator />}
      {blocked && (
        <Text style={s.error}>
          Finish your active workout and finish or cancel your staff-help
          request before changing gyms.
        </Text>
      )}
      {gyms.map((g) => (
        <Pressable
          accessibilityRole="button"
          key={g.id}
          style={s.card}
          disabled={blocked || busy || gym?.id === g.id}
          onPress={() => setPending({ id: g.id, name: g.name })}
        >
          <Text style={s.name}>
            {g.name}
            {gym?.id === g.id ? " · Connected" : ""}
          </Text>
          <Text style={s.text}>Connection does not verify gym membership.</Text>
        </Pressable>
      ))}
      {gym && (
        <Pressable
          disabled={blocked || busy}
          onPress={() => setPending({ id: null, name: "independent training" })}
        >
          <Text style={s.link}>Disconnect from gym</Text>
        </Pressable>
      )}
      {pending && (
        <View style={s.card}>
          <Text style={s.text}>
            Switch to {pending.name}? Your history and plans will be preserved.
          </Text>
          <Pressable
            accessibilityRole="button"
            style={s.button}
            disabled={blocked || busy}
            onPress={save}
          >
            <Text style={s.buttonText}>
              {busy ? "Saving…" : "Confirm change"}
            </Text>
          </Pressable>
          <Pressable disabled={busy} onPress={() => setPending(null)}>
            <Text style={s.link}>Cancel</Text>
          </Pressable>
        </View>
      )}
      {!!error && (
        <>
          <Text accessibilityRole="alert" style={s.error}>
            {error}
          </Text>
          <Pressable onPress={load}>
            <Text style={s.link}>Retry loading gyms</Text>
          </Pressable>
        </>
      )}
    </ScrollView>
  );
}
