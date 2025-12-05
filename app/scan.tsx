import { BarCodeScanner, BarCodeScannerResult } from "expo-barcode-scanner";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { useWorkout } from "@/contexts/WorkoutContext";
import { parseMachineQr, ParsedMachineScan } from "@/utils/qr";

export default function ScanScreen() {
  const router = useRouter();
  const {
    checkIn,
    hasActiveEngagement,
    isMachineInUseByOther,
    isUserCheckedIntoMachine,
  } = useWorkout();

  const [hasPermission, setHasPermission] = useState<null | boolean>(null);
  const [scanned, setScanned] = useState(false);
  const [lastResult, setLastResult] = useState<BarCodeScannerResult | null>(null);
  const [parsed, setParsed] = useState<ParsedMachineScan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const requestPermission = async () => {
      const { status } = await BarCodeScanner.requestPermissionsAsync();
      setHasPermission(status === "granted");
    };
    requestPermission();
  }, []);

  const handleScan = (result: BarCodeScannerResult) => {
    if (scanned) return; // throttle double-fires
    setScanned(true);
    setLastResult(result);
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
    setScanned(false);
    setParsed(null);
    setError(null);
    setMessage(null);
  };

  const handleConfirmCheckIn = () => {
    if (!parsed?.machineId) {
      setError("No machine ID found in QR code.");
      return;
    }

    if (isMachineInUseByOther(parsed.machineId)) {
      setError("This machine is in use by another member.");
      return;
    }

    if (hasActiveEngagement() && !isUserCheckedIntoMachine(parsed.machineId)) {
      setError("You already have an active machine/reservation.");
      return;
    }

    const exerciseName = parsed.exercise || parsed.machineId;
    const muscleGroup = parsed.muscle || "General";

    checkIn(exerciseName, parsed.machineId, muscleGroup);
    setMessage(`Checked into ${parsed.machineId}`);

    // Navigate to the related equipment list if we know the exercise
    if (parsed.exercise) {
      router.replace({
        pathname: "/workout/equipment/[exercise]",
        params: { exercise: parsed.exercise, muscle: parsed.muscle ?? undefined },
      });
    }
  };

  if (hasPermission === null) {
    return (
      <CenteredScreen>
        <ActivityIndicator color="#00ff88" />
        <Text style={styles.subtitle}>Requesting camera permission…</Text>
      </CenteredScreen>
    );
  }

  if (hasPermission === false) {
    return (
      <CenteredScreen>
        <Text style={styles.title}>Camera permission is required to scan QR codes.</Text>
        <Text style={styles.subtitle}>Enable camera access in settings and reopen the app.</Text>
      </CenteredScreen>
    );
  }

  return (
    <LinearGradient colors={["#000", "#1a1a1a", "#000"]} style={{ flex: 1 }}>
      <View style={styles.container}>
        <Text style={styles.title}>Scan Machine QR</Text>
        <Text style={styles.subtitle}>
          Point your camera at the QR code on the machine. We’ll show the payload for now.
        </Text>

        <View style={styles.scannerFrame}>
          {!scanned ? (
            <BarCodeScanner
              onBarCodeScanned={handleScan}
              style={StyleSheet.absoluteFillObject}
              barCodeTypes={[BarCodeScanner.Constants.BarCodeType.qr]}
            />
          ) : (
            <View style={styles.resultBox}>
              <Text style={styles.resultLabel}>Last scan</Text>
              <Text style={styles.resultText}>{lastResult?.data || "No data"}</Text>
              {parsed?.machineId && (
                <>
                  <Text style={styles.metaText}>Machine: {parsed.machineId}</Text>
                  {parsed.exercise && <Text style={styles.metaText}>Exercise: {parsed.exercise}</Text>}
                  {parsed.muscle && <Text style={styles.metaText}>Muscle: {parsed.muscle}</Text>}
                  <Pressable style={styles.button} onPress={handleConfirmCheckIn}>
                    <Text style={styles.buttonText}>Confirm Check-In</Text>
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

        {lastResult && (
          <View style={styles.metaBox}>
            <Text style={styles.metaText}>Type: {lastResult.type}</Text>
            <Text style={styles.metaText}>Raw: {lastResult.data}</Text>
          </View>
        )}
      </View>
    </LinearGradient>
  );
}

const CenteredScreen: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <LinearGradient colors={["#000", "#1a1a1a", "#000"]} style={{ flex: 1 }}>
    <View style={[styles.container, { justifyContent: "center" }]}>{children}</View>
  </LinearGradient>
);

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, paddingTop: 60 },
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
  errorBox: { borderColor: "#ff6666", backgroundColor: "#330000" },
  errorText: { color: "#ff9a9a", textAlign: "center" },
  successBox: { borderColor: "#00ff88", backgroundColor: "#002d20" },
  successText: { color: "#00ff88", textAlign: "center" },
});
