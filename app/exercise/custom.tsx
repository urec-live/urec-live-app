import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { Link, useLocalSearchParams, useRouter } from "expo-router";
import {
  exerciseAPI,
  ExerciseInput,
  LoggingMode,
} from "@/services/exerciseAPI";
import { catalogStyles as s } from "@/constants/catalogStyles";
export default function CustomExercise() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const [form, setForm] = useState<ExerciseInput>({
    name: "",
    muscleGroup: "General",
    equipmentType: "BODYWEIGHT",
    trainingType: "STRENGTH",
    loggingMode: "REPS",
    instructions: "",
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(!id);
  const [confirm, setConfirm] = useState(false);
  useEffect(() => {
    if (id)
      void exerciseAPI
        .get(Number(id))
        .then((e) => {
          if (!e.custom) throw new Error();
          setForm(e);
          setLoaded(true);
        })
        .catch(() => setError("Custom exercise unavailable."));
  }, [id]);
  const save = async () => {
    setBusy(true);
    setError("");
    try {
      const e = id
        ? await exerciseAPI.update(Number(id), form)
        : await exerciseAPI.create(form);
      router.replace({ pathname: "/exercise/[id]", params: { id: e.id } });
    } catch {
      setError(
        "Could not save. Check your connection, required fields and whether you already use this name.",
      );
    } finally {
      setBusy(false);
    }
  };
  const archive = async () => {
    setBusy(true);
    try {
      await exerciseAPI.archive(Number(id));
      router.replace("/workout");
    } catch {
      setError("Could not archive. Please retry.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <ScrollView style={s.page} contentContainerStyle={{ paddingBottom: 60 }}>
      <Link href="/workout" style={s.link}>
        Back to exercises
      </Link>
      <Text style={s.title}>{id ? "Edit exercise" : "Custom exercise"}</Text>
      <Text style={s.text}>
        Private to your account. Archiving preserves past workouts.
      </Text>
      {(["name", "muscleGroup", "equipmentType", "instructions"] as const).map(
        (key) => (
          <View key={key}>
            <Text style={s.text}>
              {key === "equipmentType"
                ? "Equipment type"
                : key === "muscleGroup"
                  ? "Muscle group"
                  : key}
            </Text>
            <TextInput
              accessibilityLabel={key}
              style={s.input}
              value={form[key] || ""}
              multiline={key === "instructions"}
              maxLength={
                key === "instructions" ? 2000 : key === "name" ? 150 : 50
              }
              onChangeText={(value) =>
                setForm((old) => ({ ...old, [key]: value }))
              }
            />
          </View>
        ),
      )}
      <Text style={s.text}>Training type</Text>
      {["STRENGTH", "CARDIO", "MOBILITY"].map((v) => (
        <Pressable
          key={v}
          style={[
            s.chip,
            form.trainingType === v && s.selected,
            { marginVertical: 4 },
          ]}
          onPress={() => setForm((f) => ({ ...f, trainingType: v }))}
        >
          <Text>{v.toLowerCase()}</Text>
        </Pressable>
      ))}
      <Text style={s.text}>
        Logging mode{id ? " (fixed to preserve history)" : ""}
      </Text>
      {(
        [
          "WEIGHT_REPS",
          "REPS",
          "DURATION",
          "DISTANCE_DURATION",
        ] as LoggingMode[]
      ).map((v) => (
        <Pressable
          disabled={!!id}
          key={v}
          style={[
            s.chip,
            form.loggingMode === v && s.selected,
            { marginVertical: 4 },
          ]}
          onPress={() => setForm((f) => ({ ...f, loggingMode: v }))}
        >
          <Text>{v.replaceAll("_", " ").toLowerCase()}</Text>
        </Pressable>
      ))}
      {!!error && (
        <Text accessibilityRole="alert" style={s.error}>
          {error}
        </Text>
      )}
      <Pressable
        disabled={busy || !loaded || !form.name.trim()}
        style={s.button}
        onPress={save}
      >
        <Text style={s.buttonText}>{busy ? "Saving…" : "Save exercise"}</Text>
      </Pressable>
      {id && loaded && (
        <Pressable disabled={busy} onPress={() => setConfirm(true)}>
          <Text style={s.link}>Archive exercise</Text>
        </Pressable>
      )}
      {confirm && (
        <View style={s.card}>
          <Text style={s.text}>
            Remove this exercise from your library? History will be kept.
          </Text>
          <Pressable disabled={busy} onPress={archive}>
            <Text style={s.link}>Confirm archive</Text>
          </Pressable>
          <Pressable onPress={() => setConfirm(false)}>
            <Text>Cancel</Text>
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
}
