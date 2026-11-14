import { isAxiosError } from "axios";
import { CameraView, useCameraPermissions } from "expo-camera";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { useWorkout } from "@/contexts/WorkoutContext";
import { parseMachineQr, ParsedMachineScan } from "@/utils/qr";
import { machineAPI } from "@/services/machineAPI";

type BarCodeScannedData = {
  data: string;
  type: string;
};

// The backend answers 409 when someone tries to check in to a machine staff marked out of order
const OUT_OF_ORDER_MESSAGE =
  "This machine is out of order. Pick another machine, or report a problem if something else is wrong.";

export default function ScanScreen() {
  const router = useRouter();
  const { checkIn } = useWorkout();

  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [parsed, setParsed] = useState<ParsedMachineScan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const lookupVersion = useRef(0);
  useEffect(() => () => { lookupVersion.current += 1; }, []);

  const handleShowOnMap = async () => {
    if (!parsed?.machineId || locating) return;
    setLocating(true);
    setError(null);
    const version = ++lookupVersion.current;
    try {
      const machine = await machineAPI.getMachineByCode(parsed.machineId);
      if (version !== lookupVersion.current) return;
      router.dismissTo({
        pathname: "/equipment",
        params: { equipmentId: String(machine.id), scanKey: String(Date.now()) },
      });
    } catch (e) {
      if (version !== lookupVersion.current) return;
      setError(isAxiosError(e) && e.response?.status === 404
        ? "Machine not found in your gym. Try another QR code."
        : "Couldn’t locate this machine. Check your connection and try again.");
    } finally {
      if (version === lookupVersion.current) setLocating(false);
    }
  };

  const handleScan = (result: BarCodeScannedData) => {
    if (scanned) return; // throttle double-fires
    setScanned(true);
    setMessage(null);
    setError(null);

    const parsedResult = parseMachineQr(result.data);
    if (parsedResult.error) {
      setParsed(null);
      setError(parsedResult.error);
      return;
    }
    setParsed(parsedResult.parsed || null);
  };

  const resetScan = () => {
    lookupVersion.current += 1;
    setLocating(false);
    setScanned(false);
    setParsed(null);
    setError(null);
    setMessage(null);
  };

  const handleConfirmCheckIn = async () => {
    if (!parsed?.machineId) {
      setError("No machine ID found in QR code.");
      return;
    }

    const exerciseName = parsed.exercise || parsed.machineId;
    const muscleGroup = parsed.muscle || "General";

    try {
      await machineAPI.checkIn(parsed.machineId);
      checkIn(exerciseName, parsed.machineId, muscleGroup);
      setMessage(`Checked into ${parsed.machineId}`);
    } catch (e) {
      const response = isAxiosError(e) ? e.response : undefined;
      // Spring's error body is an object, so only show it when it's text
      const body: unknown = response?.data;
      const msg = typeof body === "string" ? body : e instanceof Error ? e.message : undefined;
      if (response?.status === 401) setError("Please sign in to check in.");
      else if (response?.status === 409) setError(OUT_OF_ORDER_MESSAGE);
      else if (response?.status === 404) setError("Machine not found.");
      else setError(msg || "Unable to check in right now.");
      return;
    }

    // Navigate to the related equipment list if we know the exercise
    if (parsed.exercise) {
      router.replace({
        pathname: "/workout/equipment/[exercise]",
        params: { exercise: parsed.exercise, muscle: parsed.muscle ?? undefined },
      });
    }
  };

  // Lets a member report a broken machine without checking in to it
  const handleReportProblem = () => {
    if (!parsed?.machineId) return;
    router.push({ pathname: "/report-issue", params: { code: parsed.machineId } });
  };

  if (!permission) {
    return (
      <CenteredScreen>
        <ActivityIndicator color="#00ff88" />
        <Text style={styles.subtitle}>Loading camera…</Text>
      </CenteredScreen>
    );
  }

  if (!permission.granted) {
    return (
      <CenteredScreen>
        <Text style={styles.title}>Camera permission is required to scan QR codes.</Text>
        <Text style={styles.subtitle}>Enable camera access to continue.</Text>
        <Pressable style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Grant Permission</Text>
        </Pressable>
      </CenteredScreen>
    );
  }

  return (
    <LinearGradient colors={["#ffffff", "#f5f5f5", "#ffffff"]} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Scan Machine QR</Text>
        <Text style={styles.subtitle}>
          Scan a machine to find it on your gym map, check in, or report a problem.
        </Text>

        <View style={styles.scannerFrame}>
          {!scanned ? (
            <CameraView
              style={StyleSheet.absoluteFillObject}
              facing="back"
              barcodeScannerSettings={{
                barcodeTypes: ["qr"],
              }}
              onBarcodeScanned={scanned ? undefined : handleScan}
            />
          ) : (
            <View style={styles.resultBox}>
              <Text style={styles.resultLabel}>Scanned machine</Text>
              {parsed?.machineId && (
                <>
                  <Text style={styles.metaText}>Machine: {parsed.machineId}</Text>
                  {parsed.exercise && <Text style={styles.metaText}>Exercise: {parsed.exercise}</Text>}
                  {parsed.muscle && <Text style={styles.metaText}>Muscle: {parsed.muscle}</Text>}
                  <Pressable disabled={locating} style={styles.button} onPress={handleConfirmCheckIn}>
                    <Text style={styles.buttonText}>Confirm Check-In</Text>
                  </Pressable>
                  <Pressable disabled={locating} style={[styles.button, styles.reportButton]} onPress={handleReportProblem}>
                    <Text style={styles.reportButtonText}>Report a Problem</Text>
                  </Pressable>
                </>
              )}
              <Pressable style={[styles.button, styles.secondaryButton]} onPress={resetScan}>
                <Text style={styles.secondaryButtonText}>Scan Again</Text>
              </Pressable>
            </View>
          )}
        </View>

        {error && (
          <View style={[styles.metaBox, styles.errorBox]}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {message && (
          <View style={[styles.metaBox, styles.successBox]}>
            <Text style={styles.successText}>{message}</Text>
          </View>
        )}

        {parsed?.machineId && (
          <View style={styles.metaBox}>
            <Text style={styles.metaText}>Highlight this machine on your floor map. Your location isn’t tracked.</Text>
            <Pressable accessibilityRole="button" accessibilityState={{ disabled: locating }}
              disabled={locating} style={styles.button} onPress={handleShowOnMap}>
              <Text style={styles.buttonText}>{locating ? "Finding machine…" : "Show on gym map"}</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </LinearGradient>
  );
}

const CenteredScreen: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <LinearGradient colors={["#000", "#1a1a1a", "#000"]} style={{ flex: 1 }}>
    <View style={[styles.container, { justifyContent: "center" }]}>{children}</View>
  </LinearGradient>
);

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 20, paddingTop: 60, paddingBottom: 32 },
  title: {
    fontSize: 26,
    color: "#00ff88",
    fontWeight: "900",
    textAlign: "center",
    marginBottom: 10,
  },
  subtitle: {
    color: "#ccc",
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 20,
  },
  scannerFrame: {
    height: 320,
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "#00ff88",
    backgroundColor: "#001a14",
  },
  resultBox: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    gap: 10,
  },
  resultLabel: { color: "#ccc", fontSize: 14 },
  resultText: { color: "#00ff88", fontSize: 16, fontWeight: "700", textAlign: "center" },
  button: {
    marginTop: 10,
    backgroundColor: "#009c67",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#00ff88",
  },
  buttonText: { color: "#001a14", fontWeight: "900" },
  metaBox: {
    marginTop: 20,
    padding: 14,
    borderRadius: 10,
    backgroundColor: "#001a14",
    borderWidth: 1,
    borderColor: "#00ff88",
  },
  metaText: { color: "#ccc", marginBottom: 4 },
  secondaryButton: {
    backgroundColor: "#001a14",
  },
  secondaryButtonText: { color: "#00ff88", fontWeight: "900" },
  reportButton: { backgroundColor: "#330000", borderColor: "#ff6666" },
  reportButtonText: { color: "#ff9a9a", fontWeight: "900" },
  errorBox: { borderColor: "#ff6666", backgroundColor: "#330000" },
  errorText: { color: "#ff9a9a", textAlign: "center" },
  successBox: { borderColor: "#00ff88", backgroundColor: "#002d20" },
  successText: { color: "#00ff88", textAlign: "center" },
});
