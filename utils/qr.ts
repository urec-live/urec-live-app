export interface ParsedMachineScan {
  machineId: string;
  exercise?: string;
  muscle?: string;
  raw: string;
}

/**
 * Canonical QR payload (URL form):
 *   urec://machine?machineId=<id>&exercise=<name>&muscle=<group>
 *
 * Canonical QR payload (JSON form):
 *   {"machineId":"<id>","exercise":"<name>","muscle":"<group>"}
 *
 * machineId is required; exercise/muscle are optional but recommended.
 */
export const parseMachineQr = (
  data: string
): { parsed?: ParsedMachineScan; error?: string } => {
    const trimmed = data?.trim();
    if (!trimmed) return { error: "Empty QR payload" };

    // URL form first
    try {
      const url = new URL(trimmed);
      const machineId = url.searchParams.get("machineId") || url.searchParams.get("id");
      const exercise = url.searchParams.get("exercise") || undefined;
      const muscle = url.searchParams.get("muscle") || undefined;
      if (machineId) {
        return {
          parsed: {
            machineId: decodeURIComponent(machineId),
            exercise: exercise || undefined,
            muscle: muscle || undefined,
            raw: trimmed,
          },
        };
      }
      return { error: "Missing machineId in QR URL" };
    } catch {
      // not a URL, try JSON
    }

    try {
      const obj = JSON.parse(trimmed);
      if (typeof obj === "object" && obj !== null) {
        const machineId = obj.machineId;
        if (!machineId) return { error: "Missing machineId in QR JSON" };
        return {
          parsed: {
            machineId: String(machineId),
            exercise: obj.exercise ? String(obj.exercise) : undefined,
            muscle: obj.muscle ? String(obj.muscle) : undefined,
            raw: trimmed,
          },
        };
      }
      return { error: "Invalid QR JSON payload" };
    } catch {
      // fall through
    }

    return { error: "Unable to parse QR payload" };
};
