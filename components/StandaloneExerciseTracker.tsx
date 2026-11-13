import { machineAPI } from "@/services/machineAPI";
import PinnedExerciseNote from "./exercise/PinnedExerciseNote";
import MachineWorkoutActions from "./MachineWorkoutActions";
import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useWorkout } from "@/contexts/WorkoutContext";
import { catalogStyles as s } from "@/constants/catalogStyles";
import { LoggingMode } from "@/services/exerciseAPI";
export function fieldsForMode(mode: LoggingMode): {
  key: "reps" | "weightLbs" | "durationSeconds" | "distanceMeters";
  label: string;
}[] {
  if (mode === "REPS") return [{ key: "reps", label: "Reps" }];
  if (mode === "DURATION")
    return [{ key: "durationSeconds", label: "Seconds" }];
  if (mode === "DISTANCE_DURATION")
    return [
      { key: "distanceMeters", label: "Meters" },
      { key: "durationSeconds", label: "Seconds" },
    ];
  return [
    { key: "reps", label: "Reps" },
    { key: "weightLbs", label: "Weight (lbs)" },
  ];
}
export default function StandaloneExerciseTracker() {
  const {
    currentSession,
    checkOut,
    updateSets,
    startRest,
    endRest,
    restStartTime,
  } = useWorkout();
  const [rows, setRows] = useState<Record<string, string>[]>(
    () =>
      currentSession?.setDetails?.map((set) =>
        Object.fromEntries(
          Object.entries(set).map(([key, value]) => [key, String(value)]),
        ),
      ) || [{}],
  );
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const t = setInterval(
      () =>
        setElapsed(
          Math.floor(
            (Date.now() - (currentSession?.startTime || Date.now())) / 1000,
          ),
        ),
      1000,
    );
    return () => clearInterval(t);
  }, [currentSession?.startTime]);
  if (!currentSession) return null;
  const fields = fieldsForMode(currentSession.loggingMode || "WEIGHT_REPS");
  const parse = (values: Record<string, string>[]) =>
    values.map((row) =>
      Object.fromEntries(
        fields
          .filter((f) => row[f.key]?.trim())
          .map((f) => [f.key, Number(row[f.key])]),
      ),
    );
  const change = (next: Record<string, string>[]) => {
    setRows(next);
    const sets = parse(next);
    if (
      sets.every((set) =>
        Object.values(set).every(
          (value) => Number.isFinite(value) && Number(value) >= 0,
        ),
      )
    )
      updateSets(sets);
  };
  const finish = async () => {
    const sets = parse(rows).filter((row) => Object.keys(row).length);
    if (
      sets.some((row) =>
        Object.values(row).some(
          (value) => !Number.isFinite(value) || Number(value) < 0,
        ),
      ) ||
      sets.some(
        (row) => row.reps !== undefined && !Number.isInteger(row.reps),
      ) ||
      sets.some(
        (row) =>
          row.durationSeconds !== undefined &&
          !Number.isInteger(row.durationSeconds),
      )
    ) {
      setError(
        "Enter nonnegative values; repetitions and seconds must be whole numbers.",
      );
      return;
    }
    if (
      !sets.length ||
      sets.some((row) => fields.some((f) => row[f.key] === undefined))
    ) {
      setError("Complete each set, or remove empty sets.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      if (currentSession.machineCode) {
        try {
          await machineAPI.checkOut(currentSession.machineCode);
        } catch {
          setError(
            "Could not check out of the machine. Check your connection and retry; your sets are kept.",
          );
          return;
        }
      }
      await checkOut({ setDetails: sets });
    } catch {
      setError(
        "Could not save on this device. Keep this workout open and retry.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <View
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: "#e7f1ea",
        padding: 16,
        borderTopWidth: 2,
        borderColor: "#176c49",
        maxHeight: "65%",
      }}
    >
      <Text style={s.name}>{currentSession.exerciseName}</Text>
      <Text style={s.text}>
        {Math.floor(elapsed / 60)}m {elapsed % 60}s ·{" "}
        {currentSession.machineCode ? "Machine workout" : "Independent logging"}
      </Text>
      {currentSession.machineCode && (
        <MachineWorkoutActions
          code={currentSession.machineCode}
          exerciseName={currentSession.exerciseName}
        />
      )}
      {currentSession.exerciseId && <PinnedExerciseNote key={currentSession.exerciseId} exerciseId={currentSession.exerciseId} compact />}
      <ScrollView style={{ maxHeight: 200 }}>
        {rows.map((row, i) => (
          <View key={i} style={s.row}>
            <Text>Set {i + 1}</Text>
            {fields.map((f) => (
              <View key={f.key} style={{ flex: 1 }}>
                <Text>{f.label}</Text>
                <TextInput
                  accessibilityLabel={`Set ${i + 1} ${f.label}`}
                  style={s.input}
                  keyboardType="decimal-pad"
                  value={row[f.key] || ""}
                  onChangeText={(value) =>
                    change(
                      rows.map((r, j) =>
                        j === i ? { ...r, [f.key]: value } : r,
                      ),
                    )
                  }
                />
              </View>
            ))}
            <Pressable
              accessibilityLabel={`Remove set ${i + 1}`}
              onPress={() => change(rows.filter((_, j) => i !== j))}
            >
              <Text style={s.link}>×</Text>
            </Pressable>
          </View>
        ))}
      </ScrollView>
      {!!error && (
        <Text accessibilityRole="alert" style={s.error}>
          {error}
        </Text>
      )}
      <View style={s.row}>
        <Pressable onPress={() => change([...rows, {}])}>
          <Text style={s.link}>+ Set</Text>
        </Pressable>
        <Pressable onPress={() => (restStartTime ? endRest() : startRest())}>
          <Text style={s.link}>
            {restStartTime ? "End rest" : "Start rest"}
          </Text>
        </Pressable>
      </View>
      <Pressable disabled={busy} style={s.button} onPress={finish}>
        <Text style={s.buttonText}>{busy ? "Saving…" : "Finish exercise"}</Text>
      </Pressable>
    </View>
  );
}
