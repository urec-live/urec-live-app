import React, { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Link, useRouter } from "expo-router";
import { useHelpRequest } from "@/contexts/HelpRequestContext";
import { catalogStyles as s } from "@/constants/catalogStyles";
export default function MachineWorkoutActions({
  code,
  exerciseName,
}: {
  code: string;
  exerciseName: string;
}) {
  const { activeRequest, callStaff } = useHelpRequest();
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const help = async () => {
    if (activeRequest) {
      router.push("/help-request");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await callStaff({ equipmentCode: code, exerciseName });
      router.push("/help-request");
    } catch {
      setError(
        "Could not request staff help. Check your connection and retry.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <View>
      <View style={s.row}>
        <Pressable disabled={busy} onPress={help}>
          <Text style={s.link}>
            {activeRequest ? "View staff help" : "Call staff"}
          </Text>
        </Pressable>
        <Link
          href={{ pathname: "/report-issue", params: { code } }}
          style={s.link}
        >
          Report machine
        </Link>
      </View>
      {!!error && <Text style={s.error}>{error}</Text>}
    </View>
  );
}
