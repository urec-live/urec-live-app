import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useBodyMeasurements } from "@/hooks/useBodyMeasurements";
import { BodyMeasurements, saveMeasurements, validateMeasurements } from "@/services/bodyMeasurements";

export default function BodyMeasurementsCard({ username }: { username: string }) {
  const { data, loading, error, refresh } = useBodyMeasurements(username);
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Body measurements</Text>
      <Text style={styles.description}>Your weight helps estimate calories burned. Height is saved for future calculations. Each save records today’s weight for your progress chart.</Text>
      {loading ? <ActivityIndicator accessibilityLabel="Loading measurements" color="#216C50" />
        : error && !data ? <><Text accessibilityRole="alert" style={styles.error}>Couldn’t load your measurements.</Text><Pressable accessibilityRole="button" onPress={refresh} style={styles.button}><Text style={styles.buttonText}>Try again</Text></Pressable></>
        : data ? <MeasurementsForm key={username} username={username} initial={data} /> : null}
      <Text style={styles.footnote}>Optional · Saved for your account on this device only.</Text>
    </View>
  );
}

function MeasurementsForm({ username, initial }: { username: string; initial: BodyMeasurements }) {
  const [weight, setWeight] = useState(initial.weightKg?.toString() ?? "");
  const [height, setHeight] = useState(initial.heightCm?.toString() ?? "");
  const [weightUnit, setWeightUnit] = useState<"kg" | "lb">("kg");
  const [heightUnit, setHeightUnit] = useState<"cm" | "in">("cm");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const edit = (setter: (value: string) => void, value: string) => { setter(value); setMessage(""); setError(""); };
  const parse = (value: string) => value.trim() ? Number(value.trim().replace(",", ".")) : null;
  const switchUnit = (kind: "weight" | "height") => {
    const value = parse(kind === "weight" ? weight : height);
    if (value != null && !Number.isFinite(value)) { setError("Enter a number or clear the field before changing units."); return; }
    if (kind === "weight") {
      if (value != null) setWeight(String(Number((weightUnit === "kg" ? value / 0.45359237 : value * 0.45359237).toFixed(2))));
      setWeightUnit(weightUnit === "kg" ? "lb" : "kg");
    } else {
      if (value != null) setHeight(String(Number((heightUnit === "cm" ? value / 2.54 : value * 2.54).toFixed(2))));
      setHeightUnit(heightUnit === "cm" ? "in" : "cm");
    }
    setMessage(""); setError("");
  };
  const save = async () => {
    if (saving) return;
    const w = parse(weight), h = parse(height);
    const value = { weightKg: w == null ? null : w * (weightUnit === "lb" ? 0.45359237 : 1), heightCm: h == null ? null : h * (heightUnit === "in" ? 2.54 : 1) };
    const validation = validateMeasurements(value);
    if (validation) { setError(validation); return; }
    setSaving(true); setError(""); setMessage("");
    try { await saveMeasurements(username, value); setMessage("Measurements saved."); }
    catch { setError("Couldn’t save your measurements. Your entries are still here; try again."); }
    finally { setSaving(false); }
  };
  return (
    <>
      <View style={styles.fields}>
        <View style={styles.field}>
          <Text style={styles.label}>Weight ({weightUnit})</Text>
          <TextInput accessibilityLabel={`Weight (${weightUnit})`} value={weight} onChangeText={value => edit(setWeight, value)} keyboardType="decimal-pad" editable={!saving} placeholder={weightUnit === "kg" ? "e.g. 70" : "e.g. 154"} placeholderTextColor="#839088" style={styles.input} />
          <Pressable accessibilityRole="button" disabled={saving} onPress={() => switchUnit("weight")} style={styles.unit}><Text style={styles.unitText}>Use {weightUnit === "kg" ? "lb" : "kg"}</Text></Pressable>
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>Height ({heightUnit})</Text>
          <TextInput accessibilityLabel={`Height (${heightUnit})`} value={height} onChangeText={value => edit(setHeight, value)} keyboardType="decimal-pad" editable={!saving} placeholder={heightUnit === "cm" ? "e.g. 175" : "e.g. 69"} placeholderTextColor="#839088" style={styles.input} />
          <Pressable accessibilityRole="button" disabled={saving} onPress={() => switchUnit("height")} style={styles.unit}><Text style={styles.unitText}>Use {heightUnit === "cm" ? "in" : "cm"}</Text></Pressable>
        </View>
      </View>
      {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
      {!!message && <Text accessibilityLiveRegion="polite" style={styles.success}>{message}</Text>}
      <Pressable accessibilityRole="button" accessibilityState={{ disabled: saving }} disabled={saving} onPress={save} style={[styles.button, saving && { opacity: 0.6 }]}><Text style={styles.buttonText}>{saving ? "Saving…" : "Save measurements"}</Text></Pressable>
      <Text style={styles.footnote}>Clear a field and save to remove that measurement. Dated weigh-ins stay in your progress history.</Text>
    </>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: "#FFF", borderRadius: 18, borderWidth: 1, borderColor: "#E1E7E3", padding: 18, marginBottom: 20 },
  title: { color: "#192D23", fontSize: 20, fontWeight: "800" },
  description: { color: "#65756C", fontSize: 13, lineHeight: 19, marginTop: 7, marginBottom: 16 },
  fields: { flexDirection: "row", gap: 14 },
  field: { flex: 1 },
  label: { fontSize: 13, fontWeight: "700", color: "#263C30", marginBottom: 7 },
  input: { minHeight: 48, borderWidth: 1, borderColor: "#B9CEC1", borderRadius: 10, paddingHorizontal: 12, fontSize: 17, color: "#192D23", backgroundColor: "#F8FBF9" },
  unit: { minHeight: 44, justifyContent: "center", alignSelf: "flex-start", paddingHorizontal: 3 },
  unitText: { color: "#216C50", fontSize: 12, fontWeight: "600" },
  button: { backgroundColor: "#216C50", borderRadius: 11, minHeight: 46, alignItems: "center", justifyContent: "center", paddingHorizontal: 12 },
  buttonText: { color: "#FFF", fontSize: 14, fontWeight: "700" },
  error: { color: "#B3261E", fontSize: 13, lineHeight: 19, marginBottom: 10 },
  success: { color: "#216C50", fontSize: 13, marginBottom: 10 },
  footnote: { color: "#65756C", fontSize: 11, lineHeight: 16, marginTop: 10 },
});
